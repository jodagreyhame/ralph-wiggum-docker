# Create a new Ralph Loop project from template
# Usage: .\create-project.ps1 <project-name>

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$Project
)

# Find repo root (look for docker-compose.yml)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path "$ScriptDir\..\..\..\..").Path
if (-not (Test-Path "$RepoRoot\docker-compose.yml")) {
    Write-Error "Cannot find repo root (docker-compose.yml not found)"
    Write-Host "Run this script from the ralph-wiggum-docker-loop directory"
    exit 1
}
Set-Location $RepoRoot

$ProjectsDir = ".projects"
$ProjectPath = Join-Path $ProjectsDir $Project

if (Test-Path $ProjectPath) {
    Write-Error "Project '$Project' already exists at $ProjectPath"
    exit 1
}

# Create projects directory if needed
New-Item -ItemType Directory -Force -Path $ProjectsDir | Out-Null

# Copy template
Copy-Item -Path "template" -Destination $ProjectPath -Recurse

# Create required directories
$dirs = @(
    "$ProjectPath\.project\state",
    "$ProjectPath\.project\knowledge\patterns",
    "$ProjectPath\.project\knowledge\failures",
    "$ProjectPath\.project\knowledge\tools",
    "$ProjectPath\.project\specs",
    "$ProjectPath\logs",
    "$ProjectPath\src",
    "$ProjectPath\tests"
)

foreach ($dir in $dirs) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

# Initialize state
$state = @{
    current_focus = $null
    iteration = 0
    status = "initialized"
} | ConvertTo-Json

$state | Out-File -FilePath "$ProjectPath\.project\state\current.json" -Encoding utf8

# Initialize git
Push-Location $ProjectPath
git init
git add -A
git commit -m "Initial project setup"
Pop-Location

Write-Host "Created project: $Project"
Write-Host "  Location: $ProjectPath"
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Edit $ProjectPath\BUILDER_PROMPT.md with your project details"
Write-Host "2. Run: `$env:RALPH_PROJECT_DIR='./$ProjectPath'; docker compose run --rm ralph"
