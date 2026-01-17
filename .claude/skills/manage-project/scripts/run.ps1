# run.ps1 - Launch Ralph Loop worker for a project
#
# Usage:
#   .\.claude\skills\orchestrator\scripts\run.ps1 <project-name>
#   .\.claude\skills\orchestrator\scripts\run.ps1 <project-name> -Background
#   .\.claude\skills\orchestrator\scripts\run.ps1 <project-name> -Unlimited
#   .\.claude\skills\orchestrator\scripts\run.ps1 <project-name> -AuthMode anthropic-oauth
#
# Examples:
#   .\.claude\skills\orchestrator\scripts\run.ps1 ralph-cli
#   .\.claude\skills\orchestrator\scripts\run.ps1 ralph-cli -Background -Unlimited

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$Project,

    [switch]$Background,
    [switch]$Unlimited,

    [ValidateSet("glm", "anthropic-oauth", "anthropic-api", "gemini-oauth", "gemini-api", "openai-oauth", "openai-api", "opencode-oauth", "opencode-api")]
    [string]$AuthMode = "glm",

    [int]$MaxIterations = 100
)

$ErrorActionPreference = "Stop"

# Get project root (four levels up from scripts dir)
# scripts -> orchestrator -> skills -> .claude -> PROJECT_ROOT
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$OrchestratorDir = Split-Path -Parent $ScriptDir
$SkillsDir = Split-Path -Parent $OrchestratorDir
$ClaudeDir = Split-Path -Parent $SkillsDir
$ProjectRoot = Split-Path -Parent $ClaudeDir

Push-Location $ProjectRoot

try {
    $ProjectDir = "./.projects/$Project"

    # Verify project exists
    if (-not (Test-Path $ProjectDir)) {
        Write-Host "ERROR: Project not found: $Project" -ForegroundColor Red
        Write-Host "Location checked: $ProjectDir" -ForegroundColor DarkGray
        Write-Host ""

        # List available projects
        $ProjectsPath = Join-Path $ProjectRoot ".projects"
        if (Test-Path $ProjectsPath) {
            Write-Host "Available projects:" -ForegroundColor Yellow
            Get-ChildItem -Path $ProjectsPath -Directory | ForEach-Object {
                Write-Host "  - $($_.Name)" -ForegroundColor Cyan
            }
        }
        exit 1
    }

    # Set iterations
    $Iterations = if ($Unlimited) { 0 } else { $MaxIterations }

    # Banner
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "  RALPH WIGGUM DOCKER LOOP" -ForegroundColor Magenta
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Project:    " -NoNewline -ForegroundColor DarkGray
    Write-Host $Project -ForegroundColor Green
    Write-Host "  Auth Mode:  " -NoNewline -ForegroundColor DarkGray
    Write-Host $AuthMode -ForegroundColor Green
    Write-Host "  Iterations: " -NoNewline -ForegroundColor DarkGray
    if ($Unlimited) {
        Write-Host "unlimited" -ForegroundColor Yellow
    } else {
        Write-Host $Iterations -ForegroundColor Green
    }
    Write-Host "  Background: " -NoNewline -ForegroundColor DarkGray
    Write-Host $Background -ForegroundColor Green
    Write-Host ""

    # Set environment variables for docker-compose
    $env:RALPH_PROJECT_DIR = $ProjectDir
    $env:RALPH_PROJECT_NAME = $Project
    $env:RALPH_AUTH_MODE = $AuthMode
    $env:RALPH_MAX_ITERATIONS = $Iterations

    # Build docker compose command
    $DockerArgs = @("compose", "run", "--rm")

    if ($Background) {
        $DockerArgs += "-d"
    }

    $DockerArgs += "ralph"

    # Run
    if ($Background) {
        Write-Host "Starting in background..." -ForegroundColor Green
        $ContainerId = & docker @DockerArgs
        Write-Host ""
        Write-Host "Container ID: $ContainerId" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "To view logs:  docker logs -f $($ContainerId.Substring(0,12))" -ForegroundColor DarkGray
        Write-Host "To stop:       docker stop $($ContainerId.Substring(0,12))" -ForegroundColor DarkGray
    } else {
        Write-Host "Starting Ralph Loop..." -ForegroundColor Green
        Write-Host "Press Ctrl+C to stop" -ForegroundColor DarkGray
        Write-Host ""
        & docker @DockerArgs
    }
}
finally {
    # Clean up environment variables
    Remove-Item Env:\RALPH_PROJECT_DIR -ErrorAction SilentlyContinue
    Remove-Item Env:\RALPH_PROJECT_NAME -ErrorAction SilentlyContinue
    Remove-Item Env:\RALPH_AUTH_MODE -ErrorAction SilentlyContinue
    Remove-Item Env:\RALPH_MAX_ITERATIONS -ErrorAction SilentlyContinue

    Pop-Location
}
