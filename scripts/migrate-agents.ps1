# Migrate existing projects from CLAUDE.md to AGENTS.md
#
# This script:
# 1. Renames CLAUDE.md to AGENTS.md
# 2. Creates CLAUDE.md as a symlink to AGENTS.md
#
# Usage: .\scripts\migrate-agents.ps1 [project-name]
#        .\scripts\migrate-agents.ps1          # Migrate all projects

param(
    [string]$ProjectName = ""
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectsDir = Join-Path $ScriptDir ".." ".projects"
$ProjectsDir = (Resolve-Path $ProjectsDir).Path

function Migrate-Project {
    param([string]$ProjectPath)

    $ClaudeMd = Join-Path $ProjectPath "CLAUDE.md"
    $AgentsMd = Join-Path $ProjectPath "AGENTS.md"
    $ProjectName = Split-Path -Leaf $ProjectPath

    # Check if already a symlink
    $item = Get-Item $ClaudeMd -ErrorAction SilentlyContinue
    if ($item -and $item.LinkType -eq "SymbolicLink") {
        Write-Host "  Skipping $ProjectName - already migrated" -ForegroundColor Yellow
        return
    }

    # Skip if no CLAUDE.md exists
    if (-not (Test-Path $ClaudeMd)) {
        Write-Host "  Skipping $ProjectName - no CLAUDE.md found" -ForegroundColor Yellow
        return
    }

    # Skip if AGENTS.md already exists
    if (Test-Path $AgentsMd) {
        Write-Host "  Skipping $ProjectName - AGENTS.md already exists" -ForegroundColor Yellow
        return
    }

    Write-Host "  Migrating $ProjectName..." -ForegroundColor Cyan

    # Rename CLAUDE.md to AGENTS.md
    Move-Item $ClaudeMd $AgentsMd

    # Create symlink (requires admin or developer mode on Windows)
    try {
        New-Item -ItemType SymbolicLink -Path $ClaudeMd -Target "AGENTS.md" -ErrorAction Stop | Out-Null
        Write-Host "    Done: CLAUDE.md -> AGENTS.md" -ForegroundColor Green
    }
    catch {
        # Fallback to copy if symlinks not supported
        Copy-Item $AgentsMd $ClaudeMd
        Write-Host "    Done: CLAUDE.md (copy, symlinks not available)" -ForegroundColor Yellow
    }
}

Write-Host "AGENTS.md Migration Script" -ForegroundColor Magenta
Write-Host "==========================" -ForegroundColor Magenta
Write-Host ""

if ($ProjectName) {
    # Migrate specific project
    $ProjectPath = Join-Path $ProjectsDir $ProjectName
    if (Test-Path $ProjectPath) {
        Migrate-Project $ProjectPath
    }
    else {
        Write-Host "ERROR: Project not found: $ProjectName" -ForegroundColor Red
        exit 1
    }
}
else {
    # Migrate all projects
    Write-Host "Migrating all projects in .projects/..." -ForegroundColor Cyan
    Write-Host ""

    Get-ChildItem $ProjectsDir -Directory | ForEach-Object {
        Migrate-Project $_.FullName
    }
}

Write-Host ""
Write-Host "Migration complete!" -ForegroundColor Green
