# sync-public.ps1 - Sync private repo to public repo
# Usage: .\scripts\sync-public.ps1 [-PublicRepo <path>] [-Push] [-Message "commit message"]
#
# The public repo path can be specified via:
#   1. -PublicRepo parameter
#   2. RALPH_PUBLIC_REPO environment variable
#   3. Otherwise, an error is shown

param(
    [string]$PublicRepo = $env:RALPH_PUBLIC_REPO,
    [switch]$Push,
    [string]$Message = "Sync from private repo"
)

$ErrorActionPreference = "Stop"

# Validate PublicRepo parameter
if (-not $PublicRepo) {
    Write-Host "ERROR: Public repository path not specified" -ForegroundColor Red
    Write-Host "`nUsage: .\scripts\sync-public.ps1 -PublicRepo <path> [-Push] [-Message `"msg`"]" -ForegroundColor Yellow
    Write-Host "   Or: Set RALPH_PUBLIC_REPO environment variable`n" -ForegroundColor Yellow
    exit 1
}

# Paths
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptRoot
$Private = $ProjectRoot
$Public = $PublicRepo

# Directories to exclude (private stuff not in .gitignore)
$ExcludeDirs = @(
    ".git"
    ".projects"
    "node_modules"
    "dist"
    ".venv"
    "venv"
    "__pycache__"
    ".idea"
    ".vscode"
    ".docker"
    ".opencode"
    "ai-docs"
    ".repos"
    "logs"
)

# Files to exclude
$ExcludeFiles = @(
    ".env"
    ".env.local"
    ".env.*.local"
    "*.local.md"
    "docker-compose.*.yml"
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Syncing Private -> Public" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "From: $Private"
Write-Host "To:   $Public`n"

# Build robocopy exclude args
$XD = $ExcludeDirs | ForEach-Object { $_ }
$XF = $ExcludeFiles | ForEach-Object { $_ }

# Sync with robocopy (mirror mode, excluding private stuff)
Write-Host "Syncing files..." -ForegroundColor Yellow
robocopy $Private $Public /MIR /XD $XD /XF $XF /NFL /NDL /NJH /NJS /NC /NS

if ($LASTEXITCODE -gt 7) {
    Write-Host "Robocopy failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit 1
}

Write-Host "Files synced successfully!" -ForegroundColor Green

# Git operations in public repo
Push-Location $Public

try {
    # Initialize git if needed
    if (-not (Test-Path ".git")) {
        Write-Host "`nInitializing git repo..." -ForegroundColor Yellow
        git init
        git remote add origin https://github.com/jodagreyhame/ralph-wiggum-docker.git
        git branch -M main
    }

    # Show status
    Write-Host "`nGit status:" -ForegroundColor Yellow
    git status --short

    # Stage and commit if there are changes
    $changes = git status --porcelain
    if ($changes) {
        Write-Host "`nStaging changes..." -ForegroundColor Yellow
        git add -A

        Write-Host "Committing..." -ForegroundColor Yellow
        git commit -m "$Message`n`nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

        if ($Push) {
            Write-Host "`nPushing to origin..." -ForegroundColor Yellow
            git push -u origin main
            Write-Host "Pushed successfully!" -ForegroundColor Green
        } else {
            Write-Host "`nChanges committed locally. Run with -Push to push to GitHub." -ForegroundColor Cyan
        }
    } else {
        Write-Host "`nNo changes to commit." -ForegroundColor Green
    }

    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  Sync complete!" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan

} finally {
    Pop-Location
}
