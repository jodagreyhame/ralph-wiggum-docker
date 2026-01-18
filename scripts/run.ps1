# run.ps1 - Primary launcher for Ralph Loop projects (PowerShell)
#
# Purpose: Config-driven launcher that reads config.json and starts Docker container
# Called by: ralph run <project> (via scripts/run.sh on Windows)
#
# Reads configuration from .projects/{project}/config.json and starts the Docker container
# with the appropriate CLI and settings.
#
# Usage:
#   .\scripts\run.ps1 -Project <project-name>
#   .\scripts\run.ps1 -Project <project-name> -Build     # Force rebuild
#   .\scripts\run.ps1 -Project <project-name> -Shell     # Open shell instead of running loop

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$Project,
    [switch]$Build,
    [switch]$Shell
)

$ErrorActionPreference = "Stop"

# Change to project root
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Push-Location $ProjectRoot

try {
    $ProjectDir = "./.projects/$Project"
    $ConfigFile = "$ProjectDir/config.json"

    # Check for config
    if (-not (Test-Path $ConfigFile)) {
        Write-Host "ERROR: Project not found: $Project" -ForegroundColor Red
        Write-Host "Run 'ralph new $Project' first to create it." -ForegroundColor DarkGray
        Write-Host ""
        # List available projects
        if (Test-Path ".projects") {
            Write-Host "Available projects:" -ForegroundColor DarkGray
            Get-ChildItem -Path ".projects" -Directory | ForEach-Object {
                if (Test-Path "$($_.FullName)\config.json") {
                    Write-Host "  - $($_.Name)"
                }
            }
        }
        exit 1
    }

    # Parse config (supports both flat and nested .ralph format)
    $Config = Get-Content $ConfigFile | ConvertFrom-Json
    $RalphConfig = if ($Config.ralph) { $Config.ralph } else { $Config }
    $CLI = if ($RalphConfig.cli) { $RalphConfig.cli } elseif ($RalphConfig.backend) { $RalphConfig.backend } else { "claude" }
    $AuthMode = if ($RalphConfig.auth_mode) { $RalphConfig.auth_mode } else { "glm" }
    $MaxIterations = if ($RalphConfig.max_iterations) { $RalphConfig.max_iterations } else { 100 }
    $Model = if ($RalphConfig.model) { $RalphConfig.model } else { "" }
    $ApiKey = if ($RalphConfig.api_key) { $RalphConfig.api_key } else { "" }
    $ApiBaseUrl = if ($RalphConfig.api_base_url) { $RalphConfig.api_base_url } else { "" }

    # Banner
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "  RALPH WIGGUM DOCKER LOOP" -ForegroundColor Magenta
    Write-Host "  Worker: $Project" -ForegroundColor DarkGray
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Project:        " -NoNewline -ForegroundColor DarkGray
    Write-Host $Project -ForegroundColor Green
    Write-Host "  CLI:            " -NoNewline -ForegroundColor DarkGray
    Write-Host $CLI -ForegroundColor Green
    Write-Host "  Auth Mode:      " -NoNewline -ForegroundColor DarkGray
    Write-Host $AuthMode -ForegroundColor Green
    Write-Host "  Max Iterations: " -NoNewline -ForegroundColor DarkGray
    Write-Host $MaxIterations -ForegroundColor Green
    if ($Model) {
        Write-Host "  Model:          " -NoNewline -ForegroundColor DarkGray
        Write-Host $Model -ForegroundColor Green
    }
    Write-Host ""

    # Build environment variables
    $env:RALPH_AUTH_MODE = $AuthMode
    $env:RALPH_MAX_ITERATIONS = $MaxIterations
    $env:RALPH_PROJECT_NAME = $Project
    $env:RALPH_PROMPT_FILE = ".project/prompts/BUILDER.md"
    $env:RALPH_PROJECT_DIR = $ProjectDir

    # Set API keys based on auth mode (any mode ending in -api)
    if ($AuthMode -like "*-api") {
        switch ($AuthMode) {
            "anthropic-api" {
                $env:ANTHROPIC_API_KEY = $ApiKey
            }
            "gemini-api" {
                $env:GEMINI_API_KEY = $ApiKey
            }
            "openai-api" {
                $env:OPENAI_API_KEY = $ApiKey
            }
            "opencode-api" {
                $env:OPENCODE_API_KEY = $ApiKey
            }
        }
    }

    # GLM mode needs base URL
    if ($AuthMode -eq "glm") {
        if ($ApiBaseUrl) {
            $env:GLM_BASE_URL = $ApiBaseUrl
        }
    }

    # Set auth paths based on auth mode (for OAuth modes)
    switch -Wildcard ($AuthMode) {
        "anthropic-oauth" {
            $env:CLAUDE_AUTH_PATH = "$env:USERPROFILE\.claude"
        }
        "gemini-oauth" {
            $env:GEMINI_AUTH_PATH = "$env:USERPROFILE\.gemini"
        }
        "openai-oauth" {
            $env:CODEX_AUTH_PATH = "$env:USERPROFILE\.codex"
        }
        "opencode-oauth" {
            $env:OPENCODE_AUTH_PATH = "$env:LOCALAPPDATA\opencode"
        }
        "glm" {
            # GLM uses z.ai proxy, no local auth needed
            $env:CLAUDE_AUTH_PATH = "$env:USERPROFILE\.claude"
        }
    }

    # Build if needed
    if ($Build) {
        Write-Host "Building Docker image..." -ForegroundColor Cyan
        docker compose build
        Write-Host ""
    }

    # Run
    if ($Shell) {
        Write-Host "Opening shell in container..." -ForegroundColor Yellow
        docker compose run --rm ralph /bin/bash
    } else {
        Write-Host "Starting Ralph Worker..." -ForegroundColor Green
        Write-Host "Press Ctrl+C to stop" -ForegroundColor DarkGray
        Write-Host ""
        docker compose run --rm ralph
    }
}
finally {
    Pop-Location
}
