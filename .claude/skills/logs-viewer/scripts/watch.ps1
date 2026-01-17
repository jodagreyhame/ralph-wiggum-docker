# watch.ps1 - Follow Ralph Loop logs in real-time
#
# Usage:
#   .\.claude\skills\logs-viewer\scripts\watch.ps1 <project>
#   .\.claude\skills\logs-viewer\scripts\watch.ps1 <project> -Iteration 3
#   .\.claude\skills\logs-viewer\scripts\watch.ps1 <project> -Session
#   .\.claude\skills\logs-viewer\scripts\watch.ps1 <project> -Filter "error"

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$Project,

    [Alias("i")]
    [string]$Iteration,

    [Alias("f")]
    [string]$Filter,

    [switch]$Session
)

$ErrorActionPreference = "Stop"

# Get project root (4 levels up from scripts)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogsViewerDir = Split-Path -Parent $ScriptDir
$SkillsDir = Split-Path -Parent $LogsViewerDir
$ClaudeDir = Split-Path -Parent $SkillsDir
$ProjectRoot = Split-Path -Parent $ClaudeDir

Push-Location $ProjectRoot

try {
    $ProjectDir = ".projects\$Project"
    $LogsDir = "$ProjectDir\logs"

    # Verify project exists
    if (-not (Test-Path $ProjectDir)) {
        Write-Host "ERROR: Project not found: $Project" -ForegroundColor Red
        Write-Host "Location checked: $ProjectDir" -ForegroundColor DarkGray
        exit 1
    }

    # Determine which log file to follow
    if ($Session) {
        $LogFile = "$LogsDir\session.log"
        Write-Host "Following session log: $LogFile" -ForegroundColor Cyan
    } elseif ($Iteration) {
        $LogFile = "$LogsDir\iteration_$('{0:d3}' -f [int]$Iteration)\output.live"
        Write-Host "Following iteration ${Iteration}: $LogFile" -ForegroundColor Cyan
    } else {
        $LogFile = "$LogsDir\current.log"
        Write-Host "Following current iteration: $LogFile" -ForegroundColor Cyan
    }

    # Check if log file exists
    if (-not (Test-Path $LogFile)) {
        Write-Host "Log file not found yet: $LogFile" -ForegroundColor Yellow
        Write-Host "Waiting for log file to be created..." -ForegroundColor DarkGray

        while (-not (Test-Path $LogFile)) {
            Start-Sleep -Seconds 1
        }

        Write-Host "Log file created, starting to follow..." -ForegroundColor Green
    }

    Write-Host "Press Ctrl+C to stop" -ForegroundColor DarkGray
    Write-Host ""

    if ($Filter) {
        Write-Host "Filtering for: $Filter" -ForegroundColor DarkGray
        Write-Host ""
    }

    # Follow the log using Get-Content -Wait
    $lastPosition = 0

    while ($true) {
        if (Test-Path $LogFile) {
            $content = Get-Content $LogFile -Raw -ErrorAction SilentlyContinue
            if ($content) {
                $newContent = $content.Substring($lastPosition)
                if ($newContent.Length -gt 0) {
                    if ($Filter) {
                        $lines = $newContent -split "`n"
                        foreach ($line in $lines) {
                            if ($line -match $Filter) {
                                Write-Host $line
                            }
                        }
                    } else {
                        Write-Host $newContent -NoNewline
                    }
                    $lastPosition = $content.Length
                }
            }
        }
        Start-Sleep -Milliseconds 500
    }
}
finally {
    Pop-Location
}
