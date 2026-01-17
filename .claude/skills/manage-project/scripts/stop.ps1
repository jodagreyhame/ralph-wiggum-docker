# stop.ps1 - Stop a running Ralph Loop worker
#
# Usage:
#   .\.claude\skills\orchestrator\scripts\stop.ps1 <project-name>
#   .\.claude\skills\orchestrator\scripts\stop.ps1 --all

param(
    [Parameter(Position=0)]
    [string]$Project,

    [switch]$All
)

$ErrorActionPreference = "Stop"

if ($All) {
    Write-Host "Stopping all Ralph containers..." -ForegroundColor Yellow

    $Containers = docker ps --filter "name=ralph-wiggum-docker-loop-ralph" --format "{{.ID}} {{.Names}}" 2>$null

    if (-not $Containers) {
        Write-Host "No running Ralph containers found." -ForegroundColor DarkGray
        exit 0
    }

    $Containers -split "`n" | ForEach-Object {
        if ($_) {
            $Parts = $_ -split " "
            $Id = $Parts[0]
            $Name = $Parts[1]
            Write-Host "Stopping $Name..." -ForegroundColor Cyan
            docker stop $Id | Out-Null
        }
    }

    Write-Host "All containers stopped." -ForegroundColor Green
} else {
    if (-not $Project) {
        Write-Host "ERROR: Project name required (or use --all)" -ForegroundColor Red
        Write-Host "Usage: stop.ps1 <project-name>" -ForegroundColor DarkGray
        Write-Host "       stop.ps1 --all" -ForegroundColor DarkGray
        exit 1
    }

    $Container = docker ps --filter "name=ralph-$Project" --format "{{.ID}}" 2>$null | Select-Object -First 1

    if (-not $Container) {
        Write-Host "No running container found for project: $Project" -ForegroundColor Yellow
        exit 0
    }

    Write-Host "Stopping container for $Project..." -ForegroundColor Cyan
    docker stop $Container | Out-Null
    Write-Host "Stopped." -ForegroundColor Green
}
