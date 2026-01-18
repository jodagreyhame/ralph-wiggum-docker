# sync-public.ps1 - Mirror git commits from private repo to public repo
# Usage: .\scripts\sync-public.ps1 [-PublicRepo <path>] [-Push] [-Branch <branch>]
#
# This script mirrors git commits exactly as they are in the source repo.
# Filtering of sensitive files is handled by .gitignore differences between repos.
#
# The public repo path can be specified via:
#   1. -PublicRepo parameter
#   2. RALPH_PUBLIC_REPO environment variable
#   3. Otherwise, an error is shown

param(
    [string]$PublicRepo = $env:RALPH_PUBLIC_REPO,
    [string]$Branch = "review/codebase-review",
    [switch]$Push
)

$ErrorActionPreference = "Stop"

# Validate PublicRepo parameter
if (-not $PublicRepo) {
    Write-Host "ERROR: Public repository path not specified" -ForegroundColor Red
    Write-Host "`nUsage: .\scripts\sync-public.ps1 -PublicRepo <path> [-Branch <name>] [-Push]" -ForegroundColor Yellow
    Write-Host "   Or: Set RALPH_PUBLIC_REPO environment variable`n" -ForegroundColor Yellow
    exit 1
}

# Ensure we're in a git repo
if (-not (Test-Path ".git")) {
    Write-Host "ERROR: Must run from root of git repository" -ForegroundColor Red
    exit 1
}

# Get current repo info
$PrivateRepo = (Get-Location).Path
$CurrentBranch = git rev-parse --abbrev-ref HEAD 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to determine current branch" -ForegroundColor Red
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Git Commit Mirroring" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "From:   $PrivateRepo" -ForegroundColor White
Write-Host "To:     $PublicRepo" -ForegroundColor White
Write-Host "Branch: $Branch" -ForegroundColor White
Write-Host ""

# Ensure public repo exists and is initialized
if (-not (Test-Path "$PublicRepo\.git")) {
    Write-Host "ERROR: Public repo not initialized: $PublicRepo" -ForegroundColor Red
    Write-Host "       Initialize it first with: git init" -ForegroundColor Yellow
    exit 1
}

# Add public repo as a remote (if not already added)
$remoteName = "public-mirror"
$existingRemote = git remote get-url $remoteName 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "Adding remote '$remoteName'..." -ForegroundColor Yellow
    git remote add $remoteName $PublicRepo
} else {
    # Update remote URL in case it changed
    git remote set-url $remoteName $PublicRepo
}

# Verify we have commits to push
$commits = git log --oneline $Branch -5 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Branch '$Branch' not found" -ForegroundColor Red
    exit 1
}

Write-Host "Recent commits on $Branch:" -ForegroundColor Yellow
git log --oneline --graph -5 $Branch

# Push commits to public repo
Write-Host "`nPushing commits to public repo..." -ForegroundColor Yellow

if ($Push) {
    # Force push to ensure exact mirror
    git push $remoteName "${Branch}:${Branch}" --force

    if ($LASTEXITCODE -eq 0) {
        Write-Host "Successfully pushed to public repo!" -ForegroundColor Green

        # Show what's in the public repo now
        Write-Host "`nPublic repo now has:" -ForegroundColor Cyan
        Push-Location $PublicRepo
        try {
            git log --oneline --graph -5 $Branch 2>$null
        } finally {
            Pop-Location
        }
    } else {
        Write-Host "ERROR: Failed to push to public repo" -ForegroundColor Red
        exit 1
    }
} else {
    # Dry run - show what would be pushed
    Write-Host "`nDry run mode. Would push:" -ForegroundColor Yellow
    git log --oneline "${remoteName}/${Branch}..${Branch}" 2>$null

    if ($LASTEXITCODE -ne 0) {
        Write-Host "  (Public remote branch doesn't exist yet - would create it)" -ForegroundColor Gray
        git log --oneline $Branch -5
    }

    Write-Host "`nRun with -Push to actually push commits" -ForegroundColor Cyan
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Sync complete!" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Cleanup remote to avoid pollution
Write-Host "Cleaning up temporary remote..." -ForegroundColor Gray
git remote remove $remoteName 2>$null
