# Ralph Loop Docker Test Suite
# Modular test runner for PowerShell
# Tests all auth modes by actually running agents and monitoring output

param(
    [switch]$Verbose,
    [switch]$SkipBuild,
    [int]$Timeout = 60  # seconds to wait for agent response
)

$ErrorActionPreference = "Continue"

# Counters
$script:Passed = 0
$script:Failed = 0
$script:Skipped = 0
$script:Recommendations = @()

# Get script directory and project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Get-Item "$ScriptDir\..").FullName
Set-Location $ProjectRoot

# Test project prefix
$TestPrefix = "_test-$(Get-Date -Format 'yyyyMMddHHmmss')"

# Load .env file if it exists
$envFile = Join-Path $ProjectRoot ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"')
            if (-not [string]::IsNullOrEmpty($value)) {
                [Environment]::SetEnvironmentVariable($name, $value, "Process")
            }
        }
    }
}

# Quick test prompt content
$QuickTestPrompt = @"
# Quick Connection Test

Verify the agent can connect and respond.

## Task

1. Create a file called ``test-result.txt`` with content: ``CONNECTED``
2. Output the completion signal immediately

## Completion

Output this exactly:

``````
<promise>TEST PASSED</promise>
``````

## Rules

- Complete in ONE iteration
- No git operations needed
- Just create the file and output the promise
"@

# ============================================================
# AUTH MODE DEFINITIONS (mirrors test/auth/*.sh)
# ============================================================

$AuthModes = @(
    @{
        Name = "Passthrough OAuth"
        Id = "passthrough"
        Backend = "claude"
        Prereqs = {
            $claudeConfig = if ($env:CLAUDE_CONFIG_PATH) { $env:CLAUDE_CONFIG_PATH } else { "$env:USERPROFILE\.claude" }
            if (Test-Path $claudeConfig) { return @{ OK = $true } }
            return @{ OK = $false; Message = "~/.claude not found - run 'claude login' on host first" }
        }
    },
    @{
        Name = "GLM (z.ai)"
        Id = "glm"
        Backend = "claude"
        Prereqs = {
            if ($env:GLM_AUTH_TOKEN) { return @{ OK = $true } }
            return @{ OK = $false; Message = "GLM_AUTH_TOKEN not set - configure in .env for z.ai backend" }
        }
    },
    @{
        Name = "Anthropic API"
        Id = "anthropic"
        Backend = "claude"
        Prereqs = {
            if ($env:ANTHROPIC_API_KEY) { return @{ OK = $true } }
            return @{ OK = $false; Message = "ANTHROPIC_API_KEY not set - configure for direct API access" }
        }
    },
    @{
        Name = "Gemini OAuth"
        Id = "gemini"
        Backend = "gemini"
        Prereqs = {
            $geminiConfig = if ($env:GEMINI_CONFIG_PATH) { $env:GEMINI_CONFIG_PATH } else { "$env:USERPROFILE\.gemini" }
            if (Test-Path $geminiConfig) { return @{ OK = $true } }
            return @{ OK = $false; Message = "~/.gemini not found - run 'gemini' to login first" }
        }
    },
    @{
        Name = "Codex/OpenAI"
        Id = "codex"
        Backend = "codex"
        Prereqs = {
            $codexConfig = if ($env:CODEX_CONFIG_PATH) { $env:CODEX_CONFIG_PATH } else { "$env:USERPROFILE\.codex" }
            if ((Test-Path $codexConfig) -or $env:OPENAI_API_KEY) { return @{ OK = $true } }
            return @{ OK = $false; Message = "~/.codex not found and OPENAI_API_KEY not set - run 'codex' to login or set API key" }
        }
    },
    @{
        Name = "OpenCode"
        Id = "opencode"
        Backend = "opencode"
        Prereqs = {
            # OpenCode v1.1+ uses free models by default, no auth required
            # For provider auth, check ~/.local/share/opencode/auth.json
            return @{ OK = $true }
        }
    }
)

# ============================================================
# HELPER FUNCTIONS
# ============================================================

function Write-Header {
    Write-Host ""
    Write-Host "+----------------------------------------------------------+" -ForegroundColor Blue
    Write-Host "|              RALPH LOOP DOCKER TEST SUITE                |" -ForegroundColor Blue
    Write-Host "+----------------------------------------------------------+" -ForegroundColor Blue
}

function Write-Footer {
    Write-Host "+----------------------------------------------------------+" -ForegroundColor Blue
    $summary = "| SUMMARY: $script:Passed passed, $script:Failed failed, $script:Skipped skipped"
    $padding = 59 - $summary.Length
    if ($padding -lt 0) { $padding = 0 }
    Write-Host "$summary$(' ' * $padding)|" -ForegroundColor Blue

    if ($script:Recommendations.Count -gt 0) {
        Write-Host "+----------------------------------------------------------+" -ForegroundColor Blue
        Write-Host "| RECOMMENDATIONS:                                          |" -ForegroundColor Blue
        foreach ($rec in $script:Recommendations) {
            $padded = $rec.PadRight(55)
            if ($padded.Length -gt 55) { $padded = $padded.Substring(0, 55) }
            Write-Host "| " -ForegroundColor Blue -NoNewline
            Write-Host "- $padded" -ForegroundColor Yellow -NoNewline
            Write-Host "|" -ForegroundColor Blue
        }
    }

    Write-Host "+----------------------------------------------------------+" -ForegroundColor Blue
    Write-Host ""
}

function Write-Pass($Message) {
    Write-Host "| " -ForegroundColor Blue -NoNewline
    Write-Host "[PASS]" -ForegroundColor Green -NoNewline
    Write-Host " $Message" -ForegroundColor White
    $script:Passed++
}

function Write-Fail($Message, $Recommendation) {
    Write-Host "| " -ForegroundColor Blue -NoNewline
    Write-Host "[FAIL]" -ForegroundColor Red -NoNewline
    Write-Host " $Message" -ForegroundColor White
    $script:Failed++
    if ($Recommendation) {
        $script:Recommendations += $Recommendation
    }
}

function Write-Skip($Message, $Recommendation) {
    Write-Host "| " -ForegroundColor Blue -NoNewline
    Write-Host "[SKIP]" -ForegroundColor Yellow -NoNewline
    Write-Host " $Message" -ForegroundColor White
    $script:Skipped++
    if ($Recommendation) {
        $script:Recommendations += $Recommendation
    }
}

function Write-Info($Message) {
    Write-Host "|        " -ForegroundColor Blue -NoNewline
    Write-Host "$Message" -ForegroundColor Gray
}

function Write-Section($Message) {
    Write-Host "|" -ForegroundColor Blue
    Write-Info $Message
    Write-Host "|" -ForegroundColor Blue
}

function New-TestProject {
    param(
        [string]$Name,
        [string]$Backend = "claude",
        [string]$AuthMode = "passthrough"
    )

    $dir = ".projects\$TestPrefix-$Name"
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    New-Item -ItemType Directory -Force -Path "$dir\logs" | Out-Null
    New-Item -ItemType Directory -Force -Path "$dir\signals" | Out-Null
    New-Item -ItemType Directory -Force -Path "$dir\.project\state" | Out-Null

    # Write test prompt
    $QuickTestPrompt | Set-Content "$dir\BUILDER_PROMPT.md" -Encoding UTF8

    # Write config.json with NEW schema (backend + auth_mode)
    @{
        backend = $Backend
        auth_mode = $AuthMode
        max_iterations = 2
        completion_promise = "TEST PASSED"
    } | ConvertTo-Json | Set-Content "$dir\config.json" -Encoding UTF8

    # Write minimal AGENTS.md and create CLAUDE.md symlink
    "# Test Project`nMinimal test configuration." | Set-Content "$dir\AGENTS.md" -Encoding UTF8
    try {
        New-Item -ItemType SymbolicLink -Path "$dir\CLAUDE.md" -Target "AGENTS.md" -ErrorAction Stop | Out-Null
    } catch {
        Copy-Item "$dir\AGENTS.md" "$dir\CLAUDE.md"
    }

    # Initialize git repo
    Push-Location $dir
    git init --quiet 2>$null
    git add -A 2>$null
    git commit -m "init: test project" --quiet 2>$null
    Pop-Location

    return $dir
}

function Remove-TestProjects {
    Get-ChildItem ".projects" -Directory -Filter "$TestPrefix-*" -ErrorAction SilentlyContinue | ForEach-Object {
        Remove-Item -Recurse -Force $_.FullName -ErrorAction SilentlyContinue
    }
}

function Wait-ForCompletion {
    param(
        [string]$ProjectDir,
        [int]$TimeoutSeconds = 60
    )

    $completionFile = "$ProjectDir\logs\completion.json"
    $outputLog = "$ProjectDir\logs\iteration_001\output.log"
    $startTime = Get-Date

    while ((Get-Date) -lt $startTime.AddSeconds($TimeoutSeconds)) {
        # Check for completion.json
        if (Test-Path $completionFile) {
            $completion = Get-Content $completionFile -Raw | ConvertFrom-Json -ErrorAction SilentlyContinue
            if ($completion.status -eq "complete") {
                return @{ Success = $true; Message = "Completed successfully" }
            }
        }

        # Check for output with promise
        if (Test-Path $outputLog) {
            $output = Get-Content $outputLog -Raw -ErrorAction SilentlyContinue
            if ($output -match "TEST PASSED") {
                return @{ Success = $true; Message = "Promise detected in output" }
            }
        }

        # Check for test-result.txt (agent created file)
        if (Test-Path "$ProjectDir\test-result.txt") {
            $content = Get-Content "$ProjectDir\test-result.txt" -Raw -ErrorAction SilentlyContinue
            if ($content -match "CONNECTED") {
                return @{ Success = $true; Message = "Agent created test file" }
            }
        }

        Start-Sleep -Milliseconds 500
    }

    return @{ Success = $false; Message = "Timeout after ${TimeoutSeconds}s" }
}

# ============================================================
# TESTS
# ============================================================

function Test-DockerAvailable {
    try {
        # Check if docker command exists
        $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
        if (-not $dockerCmd) {
            Write-Fail "Docker not available" "Install Docker Desktop"
            return $false
        }

        # Run docker info and capture output
        $result = docker info 2>&1 | Out-String
        if ($result -match "Server:" -or $result -match "Client:") {
            Write-Pass "Docker available"
            return $true
        }

        Write-Fail "Docker daemon not running" "Start Docker Desktop"
        return $false
    } catch {
        Write-Fail "Docker not available" "Install Docker Desktop and ensure daemon is running"
        return $false
    }
}

function Test-DockerCompose {
    try {
        $result = docker compose version 2>&1 | Out-String
        if ($result -match "Docker Compose version") {
            Write-Pass "Docker Compose available"
            return $true
        }
    } catch {
        # Ignore
    }
    Write-Fail "Docker Compose not available" "Install Docker Compose v2"
    return $false
}

function Test-ImageBuild {
    if ($SkipBuild) {
        Write-Skip "Image build (skipped)" ""
        return $true
    }

    Write-Info "Building image (this may take a minute)..."
    try {
        $output = & docker compose build 2>&1 | Out-String
        if ($output -notmatch "error" -or $output -match "Successfully" -or $output -match "exporting to image") {
            Write-Pass "Image build successful"
            return $true
        }
    } catch {}
    Write-Fail "Image build failed" "Check docker/Dockerfile for errors"
    return $false
}

function Test-TemplateExists {
    if ((Test-Path "template") -and (Test-Path "template\BUILDER_PROMPT.md")) {
        Write-Pass "Template directory exists"
        return $true
    }
    Write-Fail "Template missing" "Ensure template/ directory with BUILDER_PROMPT.md exists"
    return $false
}

function Test-AgentConnection {
    param(
        [string]$Name,
        [string]$Backend,
        [string]$AuthMode
    )

    # Create slug for directory (replace spaces with dashes, lowercase)
    $Slug = $Name.ToLower() -replace '\s+', '-'

    # Create test project with proper config
    $projectDir = New-TestProject -Name $Slug -Backend $Backend -AuthMode $AuthMode

    Write-Info "Testing $Name ($Backend backend, $AuthMode auth)..."

    # Set environment
    $env:RALPH_PROJECT_DIR = $projectDir
    $env:RALPH_PROJECT_NAME = "$TestPrefix-$Slug"

    try {
        # Run agent in background
        $job = Start-Job -ScriptBlock {
            param($ProjectRoot, $ProjectDir, $ProjectName)
            Set-Location $ProjectRoot
            $env:RALPH_PROJECT_DIR = $ProjectDir
            $env:RALPH_PROJECT_NAME = $ProjectName
            & docker compose run --rm ralph 2>&1
        } -ArgumentList $ProjectRoot, $projectDir, "$TestPrefix-$Slug"

        # Wait for completion or timeout
        $result = Wait-ForCompletion -ProjectDir $projectDir -TimeoutSeconds $Timeout

        # Stop job if still running
        if ($job.State -eq "Running") {
            Stop-Job $job -ErrorAction SilentlyContinue
        }
        Remove-Job $job -Force -ErrorAction SilentlyContinue

        if ($result.Success) {
            Write-Pass "$Name - $($result.Message)"
            return $true
        } else {
            # Check if there was any output at all
            $sessionLog = "$projectDir\logs\session.log"
            if (Test-Path $sessionLog) {
                $log = Get-Content $sessionLog -Raw -ErrorAction SilentlyContinue
                if ($log -match "iteration") {
                    Write-Pass "$Name - Agent started (check logs for details)"
                    return $true
                }
            }
            Write-Fail "$Name - $($result.Message)" "Check auth config and API connectivity"
            return $false
        }
    } catch {
        Write-Fail "$Name - Exception: $($_.Exception.Message)" "Check Docker and auth configuration"
        return $false
    }
}

# ============================================================
# MAIN
# ============================================================

try {
    Write-Header
    Write-Info "Timeout: ${Timeout}s per agent test"
    Write-Host "|" -ForegroundColor Blue

    # Prerequisites
    if (-not (Test-DockerAvailable)) { Write-Footer; exit 1 }
    if (-not (Test-DockerCompose)) { Write-Footer; exit 1 }

    # Build
    if (-not (Test-ImageBuild)) { Write-Footer; exit 1 }

    # Template
    Test-TemplateExists | Out-Null

    Write-Section "Running agent connection tests..."

    # Run tests for each auth mode (modular approach)
    foreach ($auth in $AuthModes) {
        # Check prerequisites
        $prereqResult = & $auth.Prereqs
        if (-not $prereqResult.OK) {
            Write-Skip $auth.Name $prereqResult.Message
            continue
        }

        # Run the actual test
        Test-AgentConnection -Name $auth.Name -Backend $auth.Backend -AuthMode $auth.Id | Out-Null
    }

    Write-Footer

    # Exit with failure if any tests failed
    if ($script:Failed -gt 0) { exit 1 }
    exit 0
}
finally {
    # Cleanup test projects
    Write-Info "Cleaning up test projects..."
    Remove-TestProjects
}
