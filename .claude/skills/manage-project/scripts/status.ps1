# Show status of all Ralph Loop projects
# Usage: .\status.ps1 [project]

param(
    [Parameter(Position=0)]
    [string]$Project
)

function Show-ProjectStatus {
    param([string]$proj)

    if ((Test-Path $proj) -and (Test-Path "$proj\config.json")) {
        Write-Host "=== $proj ===" -ForegroundColor Cyan

        # Check state
        $stateFile = "$proj\.project\state\current.json"
        if (Test-Path $stateFile) {
            try {
                $state = Get-Content $stateFile | ConvertFrom-Json
                Write-Host "  Iteration: $($state.iteration)"
                Write-Host "  Status: $($state.status)"
            } catch {
                Write-Host "  State: Unable to read"
            }
        }

        # Count logs
        $logsDir = "$proj\logs"
        if (Test-Path $logsDir) {
            $logCount = (Get-ChildItem -Path $logsDir -Directory -Filter "iteration_*" -ErrorAction SilentlyContinue).Count
            Write-Host "  Logs: $logCount iterations"
        }

        Write-Host ""
    }
}

if ($Project) {
    Show-ProjectStatus $Project
} else {
    # Show all projects
    Get-ChildItem -Directory | ForEach-Object {
        if (Test-Path "$($_.Name)\config.json") {
            Show-ProjectStatus $_.Name
        }
    }

    # Docker status
    Write-Host "=== Docker Containers ===" -ForegroundColor Cyan
    docker compose ps 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Docker not running or compose file not found"
    }
}
