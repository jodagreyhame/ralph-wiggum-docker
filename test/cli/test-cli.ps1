# test/cli/test-cli.ps1 - CLI command test suite (PowerShell)
# Tests all ralph CLI commands

param(
    [switch]$Verbose
)

$ErrorActionPreference = "Continue"

# Colors
$script:GREEN = "`e[32m"
$script:RED = "`e[31m"
$script:YELLOW = "`e[33m"
$script:BLUE = "`e[34m"
$script:CYAN = "`e[36m"
$script:GRAY = "`e[90m"
$script:NC = "`e[0m"

# Counters
$script:PASSED = 0
$script:FAILED = 0
$script:SKIPPED = 0

# Paths
$script:ROOT_DIR = (Resolve-Path "$PSScriptRoot\..\..").Path
$script:CLI_PATH = Join-Path $ROOT_DIR "dist\cli\index.js"

# Test project name
$script:TEST_PROJECT = "cli-test-$PID"

# ══════════════════════════════════════════════════════════
# OUTPUT FUNCTIONS
# ══════════════════════════════════════════════════════════

function Print-Header {
    Write-Host ""
    Write-Host "$BLUE+----------------------------------------------------------+$NC"
    Write-Host "$BLUE|              RALPH CLI TEST SUITE                        |$NC"
    Write-Host "$BLUE+----------------------------------------------------------+$NC"
}

function Print-Footer {
    Write-Host "$BLUE+----------------------------------------------------------+$NC"
    Write-Host "$BLUE| SUMMARY: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}, ${YELLOW}$SKIPPED skipped$NC              $BLUE|$NC"
    Write-Host "$BLUE+----------------------------------------------------------+$NC"
    Write-Host ""
}

function Pass($message) {
    Write-Host "$BLUE|$NC ${GREEN}[PASS]${NC} $message"
    $script:PASSED++
}

function Fail($message, $recommendation = "") {
    Write-Host "$BLUE|$NC ${RED}[FAIL]${NC} $message"
    $script:FAILED++
    if ($recommendation) {
        Write-Host "$BLUE|$NC        ${GRAY}$recommendation${NC}"
    }
}

function Skip($message, $reason = "") {
    Write-Host "$BLUE|$NC ${YELLOW}[SKIP]${NC} $message"
    $script:SKIPPED++
    if ($reason) {
        Write-Host "$BLUE|$NC        ${GRAY}$reason${NC}"
    }
}

function Info($message) {
    Write-Host "$BLUE|$NC        ${GRAY}$message${NC}"
}

function Section($name) {
    Write-Host "$BLUE|$NC"
    Info $name
    Write-Host "$BLUE|$NC"
}

# ══════════════════════════════════════════════════════════
# SETUP/TEARDOWN
# ══════════════════════════════════════════════════════════

function Setup {
    Set-Location $ROOT_DIR

    # Ensure dist exists
    if (-not (Test-Path $CLI_PATH)) {
        Info "Building CLI..."
        bun run build 2>$null
        if (-not (Test-Path $CLI_PATH)) {
            Fail "CLI build failed" "Run 'bun install && bun run build'"
            exit 1
        }
    }
}

function Cleanup {
    $projectPath = Join-Path $ROOT_DIR ".projects\$TEST_PROJECT"
    if (Test-Path $projectPath) {
        Remove-Item -Recurse -Force $projectPath
    }
}

# ══════════════════════════════════════════════════════════
# CLI TESTS
# ══════════════════════════════════════════════════════════

function Test-CLI-Version {
    $output = & node $CLI_PATH --version 2>&1 | Out-String
    $output = $output.Trim()
    if ($output -match '^\d+\.\d+\.\d+') {
        Pass "ralph --version"
        Info "Version: $output"
    } else {
        Fail "ralph --version" "Expected semver, got: $output"
    }
}

function Test-CLI-Help {
    $output = & node $CLI_PATH --help 2>&1 | Out-String
    if ($output -match "Usage:" -and $output -match "Commands:") {
        Pass "ralph --help"
    } else {
        Fail "ralph --help" "Help output missing expected sections"
    }
}

function Test-CLI-List {
    $output = & node $CLI_PATH list 2>&1 | Out-String
    if ($output -match "Projects:" -or $output -match "No projects found") {
        Pass "ralph list"
    } else {
        Fail "ralph list" "Unexpected output"
    }
}

function Test-CLI-List-Alias {
    $output = & node $CLI_PATH ls 2>&1 | Out-String
    if ($output -match "Projects:" -or $output -match "No projects found") {
        Pass "ralph ls (alias)"
    } else {
        Fail "ralph ls" "Alias not working"
    }
}

function Test-CLI-Validate-Valid {
    $configPath = Join-Path $ROOT_DIR "template\config.json"
    $output = & node $CLI_PATH validate $configPath 2>&1 | Out-String
    if ($output -match "valid") {
        Pass "ralph validate (valid config)"
    } else {
        Fail "ralph validate" "Expected valid, got: $output"
    }
}

function Test-CLI-Validate-Invalid-Path {
    $output = & node $CLI_PATH validate "C:\nonexistent\path.json" 2>&1 | Out-String
    if ($output -match "not found" -or $LASTEXITCODE -ne 0) {
        Pass "ralph validate (invalid path)"
    } else {
        Fail "ralph validate" "Should fail for missing file"
    }
}

function Test-CLI-Show-Invalid {
    $output = & node $CLI_PATH show nonexistent-project-xyz 2>&1 | Out-String
    if ($output -match "not found" -or $LASTEXITCODE -ne 0) {
        Pass "ralph show (invalid project)"
    } else {
        Fail "ralph show" "Should fail for missing project"
    }
}

function Test-CLI-New-Project {
    $output = & node $CLI_PATH new $TEST_PROJECT --preset=minimal "--description=Test project" 2>&1 | Out-String
    $projectPath = Join-Path $ROOT_DIR ".projects\$TEST_PROJECT"
    if ($output -match "Template files copied" -and (Test-Path $projectPath)) {
        Pass "ralph new $TEST_PROJECT"
    } else {
        Fail "ralph new" "Project creation failed: $output"
    }
}

function Test-CLI-New-Duplicate {
    $output = & node $CLI_PATH new $TEST_PROJECT 2>&1 | Out-String
    if ($output -match "already exists" -or $LASTEXITCODE -ne 0) {
        Pass "ralph new (duplicate detection)"
    } else {
        Fail "ralph new" "Should reject duplicate project name"
    }
}

function Test-CLI-Show-Valid {
    $output = & node $CLI_PATH show $TEST_PROJECT 2>&1 | Out-String
    if ($output -match "Project:" -and $output -match $TEST_PROJECT) {
        Pass "ralph show $TEST_PROJECT"
    } else {
        Fail "ralph show" "Failed to show project"
    }
}

function Test-CLI-Delete-Project {
    $output = & node $CLI_PATH delete $TEST_PROJECT --force 2>&1 | Out-String
    $projectPath = Join-Path $ROOT_DIR ".projects\$TEST_PROJECT"
    if ($output -match "Deleted" -and -not (Test-Path $projectPath)) {
        Pass "ralph delete $TEST_PROJECT"
    } else {
        Fail "ralph delete" "Project deletion failed"
    }
}

function Test-CLI-Delete-Invalid {
    $output = & node $CLI_PATH delete nonexistent-project-xyz --force 2>&1 | Out-String
    if ($output -match "not found" -or $LASTEXITCODE -ne 0) {
        Pass "ralph delete (invalid project)"
    } else {
        Fail "ralph delete" "Should fail for missing project"
    }
}

# ══════════════════════════════════════════════════════════
# DISPLAY MODE TESTS
# ══════════════════════════════════════════════════════════

function Get-ProjectWithTasks {
    $projectsPath = Join-Path $ROOT_DIR ".projects"
    $projects = Get-ChildItem $projectsPath -Directory -ErrorAction SilentlyContinue
    foreach ($project in $projects) {
        $tasksPath = Join-Path $project.FullName ".project\specs\tasks"
        if (Test-Path $tasksPath) {
            # Check for actual phase files with tasks, not just the directory
            $phaseFiles = Get-ChildItem $tasksPath -Filter "phase-*.json" -ErrorAction SilentlyContinue
            if ($phaseFiles.Count -gt 0) {
                return $project.FullName
            }
        }
    }
    return $null
}

function Test-Display-Dashboard {
    $testDir = Get-ProjectWithTasks
    if (-not $testDir) {
        Skip "ralph -p <path> -s dashboard" "No project with task specs found"
        return
    }

    $output = & node $CLI_PATH -p $testDir -s dashboard 2>&1 | Out-String
    if ($output -match "RALPH TERMINAL" -or $output -match "Progress") {
        Pass "ralph -p <path> -s dashboard"
    } else {
        Fail "ralph -p -s dashboard" "Dashboard not rendering"
    }
}

function Test-Display-Tasks {
    $testDir = Get-ProjectWithTasks
    if (-not $testDir) {
        Skip "ralph -p <path> -s tasks" "No project with task specs found"
        return
    }

    $output = & node $CLI_PATH -p $testDir -s tasks 2>&1 | Out-String
    if ($output -match "TASKS" -or $output -match "Phase") {
        Pass "ralph -p <path> -s tasks"
    } else {
        Fail "ralph -p -s tasks" "Tasks not rendering"
    }
}

function Test-Display-Progress {
    $testDir = Get-ProjectWithTasks
    if (-not $testDir) {
        Skip "ralph -p <path> -s progress" "No project with task specs found"
        return
    }

    $output = & node $CLI_PATH -p $testDir -s progress 2>&1 | Out-String
    if ($output -match "PROGRESS" -or $output -match "Overall") {
        Pass "ralph -p <path> -s progress"
    } else {
        Fail "ralph -p -s progress" "Progress not rendering"
    }
}

function Test-Display-Task-Detail {
    $testDir = Get-ProjectWithTasks
    if (-not $testDir) {
        Skip "ralph -p <path> -t <id>" "No project with task specs found"
        return
    }

    $output = & node $CLI_PATH -p $testDir -t "0.1" 2>&1 | Out-String
    if ($output -match "Task 0.1" -or $output -match "Description") {
        Pass "ralph -p <path> -t 0.1"
    } else {
        Fail "ralph -p -t" "Task detail not rendering"
    }
}

function Test-Display-Invalid-Project {
    $output = & node $CLI_PATH -p "C:\nonexistent\path" -s dashboard 2>&1 | Out-String
    if ($output -match "not found" -or $LASTEXITCODE -ne 0) {
        Pass "ralph -p (invalid path)"
    } else {
        Fail "ralph -p" "Should fail for invalid project path"
    }
}

# ══════════════════════════════════════════════════════════
# NEW COMMAND OPTIONS TESTS
# ══════════════════════════════════════════════════════════

function Test-New-With-Preset {
    $testName = "cli-preset-test-$PID"
    $output = & node $CLI_PATH new $testName --preset=three-tier 2>&1 | Out-String
    $projectPath = Join-Path $ROOT_DIR ".projects\$testName"
    if ($output -match "three-tier" -and (Test-Path $projectPath)) {
        Pass "ralph new --preset=three-tier"
        Remove-Item -Recurse -Force $projectPath
    } else {
        Fail "ralph new --preset" "Preset not applied"
    }
}

function Test-New-With-Builder-Options {
    $testName = "cli-builder-test-$PID"
    $output = & node $CLI_PATH new $testName --builder-backend=gemini --builder-auth=gemini-oauth 2>&1 | Out-String
    $projectPath = Join-Path $ROOT_DIR ".projects\$testName"
    if ($output -match "gemini" -and (Test-Path $projectPath)) {
        $configPath = Join-Path $projectPath "config.json"
        $config = Get-Content $configPath | ConvertFrom-Json
        if ($config.builder.backend -eq "gemini") {
            Pass "ralph new --builder-backend"
        } else {
            Fail "ralph new --builder-backend" "Backend not set in config"
        }
        Remove-Item -Recurse -Force $projectPath
    } else {
        Fail "ralph new --builder-backend" "Builder options failed"
    }
}

function Test-New-With-Max-Iterations {
    $testName = "cli-iter-test-$PID"
    $output = & node $CLI_PATH new $testName --max-iterations 50 2>&1 | Out-String
    $projectPath = Join-Path $ROOT_DIR ".projects\$testName"
    if (Test-Path $projectPath) {
        $configPath = Join-Path $projectPath "config.json"
        $config = Get-Content $configPath | ConvertFrom-Json
        if ($config.max_iterations -eq 50) {
            Pass "ralph new --max-iterations"
        } else {
            Fail "ralph new --max-iterations" "max_iterations not set in config"
        }
        Remove-Item -Recurse -Force $projectPath
    } else {
        Fail "ralph new --max-iterations" "Project creation failed"
    }
}

# ══════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════

Print-Header
Write-Host "$BLUE|$NC        ${CYAN}CLI Command Test Suite${NC}"
Write-Host "$BLUE|$NC"

Setup

try {
    Section "Basic Commands"
    Test-CLI-Version
    Test-CLI-Help
    Test-CLI-List
    Test-CLI-List-Alias

    Section "Validation"
    Test-CLI-Validate-Valid
    Test-CLI-Validate-Invalid-Path

    Section "Project Management"
    Test-CLI-Show-Invalid
    Test-CLI-New-Project
    Test-CLI-New-Duplicate
    Test-CLI-Show-Valid
    Test-CLI-Delete-Project
    Test-CLI-Delete-Invalid

    Section "Display Modes"
    Test-Display-Dashboard
    Test-Display-Tasks
    Test-Display-Progress
    Test-Display-Task-Detail
    Test-Display-Invalid-Project

    Section "New Command Options"
    Test-New-With-Preset
    Test-New-With-Builder-Options
    Test-New-With-Max-Iterations
}
finally {
    Cleanup
}

Print-Footer

if ($FAILED -gt 0) {
    exit 1
}
