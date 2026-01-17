# Set active project and run Ralph
# Usage: .\ralph.ps1 <project-name> [-InitGit]
param(
    [Parameter(Position=0, Mandatory=$true)][string]$Project,
    [switch]$InitGit
)

$ProjectDir = ".\.projects\$Project"
if (-not (Test-Path $ProjectDir)) {
    Write-Host "Project not found: $ProjectDir" -ForegroundColor Red
    Write-Host "Available projects:"
    Get-ChildItem ".\.projects" -Directory | ForEach-Object { Write-Host "  - $($_.Name)" }
    exit 1
}

# Check if git repo exists
$GitDir = Join-Path $ProjectDir ".git"
if (-not (Test-Path $GitDir)) {
    if ($InitGit) {
        $initRepo = "y"
    } else {
        Write-Host "Project is not a git repository." -ForegroundColor Yellow
        $initRepo = Read-Host "Initialize git repo? (y/n)"
    }

    if ($initRepo -eq "y" -or $initRepo -eq "Y") {
        Write-Host "Initializing git repository..." -ForegroundColor Cyan
        Push-Location $ProjectDir
        git init
        git add -A
        git commit -m "init: project setup"
        Pop-Location
        Write-Host "Git repository initialized." -ForegroundColor Green
    } else {
        Write-Host "Warning: Running without git - commits will fail." -ForegroundColor Yellow
    }
}

# Update .env - only modify RALPH_PROJECT_DIR and RALPH_PROJECT_NAME
$envFile = ".env"
$envContent = if (Test-Path $envFile) { Get-Content $envFile -Raw } else { "" }

# Function to set or add env var
function Set-EnvVar($content, $name, $value) {
    $pattern = "(?m)^$name=.*$"
    if ($content -match $pattern) {
        $content -replace $pattern, "$name=$value"
    } else {
        # Append to end, ensuring there's a newline before
        $trimmed = $content.TrimEnd()
        "$trimmed`n$name=$value"
    }
}

$envContent = Set-EnvVar $envContent "RALPH_PROJECT_DIR" "./.projects/$Project"
$envContent = Set-EnvVar $envContent "RALPH_PROJECT_NAME" "$Project"

# Write back with trailing newline
$envContent | Set-Content $envFile -NoNewline
Add-Content $envFile ""  # Ensure trailing newline

Write-Host ""
Write-Host "Starting Ralph Loop: $Project" -ForegroundColor Cyan
Write-Host ""

# Set env vars directly for docker compose
$env:RALPH_PROJECT_DIR = "./.projects/$Project"
$env:RALPH_PROJECT_NAME = $Project

# Pass env vars explicitly to ensure they're used
docker compose run --rm -e "RALPH_PROJECT_NAME=$Project" -e "RALPH_PROJECT_DIR=./.projects/$Project" ralph
