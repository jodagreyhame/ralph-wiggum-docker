# logs.ps1 - View and analyze Ralph Loop iteration logs
#
# Usage:
#   .\.claude\skills\logs-viewer\scripts\logs.ps1 <project>
#   .\.claude\skills\logs-viewer\scripts\logs.ps1 <project> -Iteration 3
#   .\.claude\skills\logs-viewer\scripts\logs.ps1 <project> -Search "error"
#   .\.claude\skills\logs-viewer\scripts\logs.ps1 <project> -Stats
#   .\.claude\skills\logs-viewer\scripts\logs.ps1 <project> -Json

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$Project,

    [Alias("i")]
    [string]$Iteration,

    [Alias("s")]
    [string]$Search,

    [Alias("f")]
    [switch]$Files,

    [switch]$Stats,

    [switch]$Json,

    [Alias("v")]
    [switch]$Full
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
        Write-Host ""

        $ProjectsPath = ".projects"
        if (Test-Path $ProjectsPath) {
            Write-Host "Available projects:" -ForegroundColor Yellow
            Get-ChildItem -Path $ProjectsPath -Directory | ForEach-Object {
                Write-Host "  - $($_.Name)" -ForegroundColor Cyan
            }
        }
        exit 1
    }

    # Check logs directory
    if (-not (Test-Path $LogsDir)) {
        Write-Host "No logs found for project: $Project" -ForegroundColor Yellow
        exit 0
    }

    # List iteration directories
    function Get-Iterations {
        Get-ChildItem -Path $LogsDir -Directory -Filter "iteration_*" | Sort-Object Name
    }

    # Format iteration summary
    function Format-Iteration {
        param([string]$IterDir)

        $iterNum = [int]((Split-Path -Leaf $IterDir) -replace 'iteration_', '')

        $exitCode = if (Test-Path "$IterDir\exit_code") {
            [int](Get-Content "$IterDir\exit_code" -ErrorAction SilentlyContinue)
        } else { -1 }

        $duration = "?"
        $start = "?"
        if (Test-Path "$IterDir\duration.json") {
            try {
                $durationData = Get-Content "$IterDir\duration.json" | ConvertFrom-Json
                $duration = $durationData.seconds
                $start = $durationData.start
            } catch {}
        }

        # Header
        Write-Host "+-" -ForegroundColor Cyan -NoNewline
        Write-Host " Iteration $('{0:d3}' -f $iterNum) " -ForegroundColor Cyan -NoNewline
        Write-Host ("-" * 48) -ForegroundColor Cyan -NoNewline
        Write-Host "+" -ForegroundColor Cyan

        # Status
        Write-Host "| " -ForegroundColor Cyan -NoNewline
        Write-Host "Status: " -NoNewline
        if ($exitCode -eq 0) {
            Write-Host "OK" -ForegroundColor Green -NoNewline
        } else {
            Write-Host "FAIL" -ForegroundColor Red -NoNewline
        }
        Write-Host " (exit $exitCode)"

        # Duration
        Write-Host "| " -ForegroundColor Cyan -NoNewline
        Write-Host "Duration: ${duration}s"

        # Started
        Write-Host "| " -ForegroundColor Cyan -NoNewline
        Write-Host "Started: " -NoNewline
        Write-Host "$start" -ForegroundColor DarkGray

        # File changes
        if (Test-Path "$IterDir\files_changed.json") {
            try {
                $changes = Get-Content "$IterDir\files_changed.json" | ConvertFrom-Json
                $created = $changes.created.Count
                $modified = $changes.modified.Count
                $deleted = $changes.deleted.Count
                Write-Host "| " -ForegroundColor Cyan -NoNewline
                Write-Host "Files: " -NoNewline
                Write-Host "+$created " -ForegroundColor Green -NoNewline
                Write-Host "~$modified " -ForegroundColor Yellow -NoNewline
                Write-Host "-$deleted" -ForegroundColor Red
            } catch {}
        }

        # Separator
        Write-Host ("|" + ("-" * 62) + "|") -ForegroundColor Cyan

        # Output preview
        $outputFile = "$IterDir\output.log"
        if (Test-Path $outputFile) {
            if ($Full) {
                Get-Content $outputFile | ForEach-Object { Write-Host "| $_" }
            } else {
                $lines = Get-Content $outputFile -TotalCount 5
                $lines | ForEach-Object { Write-Host "| $_" }
                $totalLines = (Get-Content $outputFile | Measure-Object -Line).Lines
                if ($totalLines -gt 5) {
                    Write-Host "| " -ForegroundColor Cyan -NoNewline
                    Write-Host "... ($($totalLines - 5) more lines, use -Full for all)" -ForegroundColor DarkGray
                }
            }
        } else {
            Write-Host "| " -ForegroundColor Cyan -NoNewline
            Write-Host "(no output)" -ForegroundColor DarkGray
        }

        # Footer
        Write-Host ("+" + ("-" * 62) + "+") -ForegroundColor Cyan
    }

    # Show statistics
    function Show-Stats {
        $iterations = Get-Iterations
        $total = $iterations.Count
        $successful = 0
        $failed = 0
        $totalDuration = 0
        $totalCreated = 0
        $totalModified = 0

        foreach ($iter in $iterations) {
            $exitCode = if (Test-Path "$($iter.FullName)\exit_code") {
                [int](Get-Content "$($iter.FullName)\exit_code" -ErrorAction SilentlyContinue)
            } else { -1 }

            if ($exitCode -eq 0) { $successful++ } else { $failed++ }

            if (Test-Path "$($iter.FullName)\duration.json") {
                try {
                    $durationData = Get-Content "$($iter.FullName)\duration.json" | ConvertFrom-Json
                    $totalDuration += [int]$durationData.seconds
                } catch {}
            }

            if (Test-Path "$($iter.FullName)\files_changed.json") {
                try {
                    $changes = Get-Content "$($iter.FullName)\files_changed.json" | ConvertFrom-Json
                    $totalCreated += $changes.created.Count
                    $totalModified += $changes.modified.Count
                } catch {}
            }
        }

        $avgDuration = if ($total -gt 0) { [math]::Round($totalDuration / $total) } else { 0 }

        $completionStatus = "in_progress"
        if (Test-Path "$LogsDir\completion.json") {
            try {
                $completion = Get-Content "$LogsDir\completion.json" | ConvertFrom-Json
                $completionStatus = $completion.status
            } catch {}
        }

        Write-Host ("=" * 64) -ForegroundColor Cyan
        Write-Host "  STATISTICS: $Project" -ForegroundColor White
        Write-Host ("=" * 64) -ForegroundColor Cyan
        Write-Host "| Total Iterations:    $total" -ForegroundColor White
        $pct = if ($total -gt 0) { [math]::Round($successful * 100 / $total) } else { 0 }
        Write-Host "| " -NoNewline
        Write-Host "Successful:          " -NoNewline
        Write-Host "$successful" -ForegroundColor Green -NoNewline
        Write-Host " ($pct%)"
        Write-Host "| " -NoNewline
        Write-Host "Failed:              " -NoNewline
        Write-Host "$failed" -ForegroundColor Red
        Write-Host ("|" + ("-" * 63)) -ForegroundColor Cyan
        Write-Host "| Total Duration:      ${totalDuration}s"
        Write-Host "| Avg Duration:        ${avgDuration}s"
        Write-Host ("|" + ("-" * 63)) -ForegroundColor Cyan
        Write-Host "| " -NoNewline
        Write-Host "Files Created:       " -NoNewline
        Write-Host "$totalCreated" -ForegroundColor Green
        Write-Host "| " -NoNewline
        Write-Host "Files Modified:      " -NoNewline
        Write-Host "$totalModified" -ForegroundColor Yellow
        Write-Host ("|" + ("-" * 63)) -ForegroundColor Cyan

        Write-Host "| " -NoNewline
        Write-Host "Status:              " -NoNewline
        if ($completionStatus -eq "complete") {
            Write-Host "COMPLETE" -ForegroundColor Green
        } elseif ($completionStatus -eq "max_iterations") {
            Write-Host "MAX ITERATIONS" -ForegroundColor Yellow
        } else {
            Write-Host "In Progress" -ForegroundColor DarkGray
        }

        Write-Host ("=" * 64) -ForegroundColor Cyan
    }

    # Search iterations
    function Search-Iterations {
        param([string]$Pattern)

        Write-Host "Searching for: " -ForegroundColor Cyan -NoNewline
        Write-Host "$Pattern" -ForegroundColor White
        Write-Host ""

        foreach ($iter in Get-Iterations) {
            $iterNum = [int]((Split-Path -Leaf $iter.Name) -replace 'iteration_', '')
            $outputFile = "$($iter.FullName)\output.log"

            if (Test-Path $outputFile) {
                $matchResults = Select-String -Path $outputFile -Pattern $Pattern -AllMatches
                if ($matchResults) {
                    Write-Host "--- Iteration $iterNum ---" -ForegroundColor Cyan
                    $matchResults | Select-Object -First 10 | ForEach-Object {
                        Write-Host "$($_.LineNumber): $($_.Line)"
                    }
                    if ($matchResults.Count -gt 10) {
                        Write-Host "... ($($matchResults.Count - 10) more matches)" -ForegroundColor DarkGray
                    }
                    Write-Host ""
                }
            }
        }
    }

    # JSON output
    function Output-Json {
        $iterations = Get-Iterations
        $total = $iterations.Count

        $completionStatus = "in_progress"
        $completionIterations = 0
        if (Test-Path "$LogsDir\completion.json") {
            try {
                $completion = Get-Content "$LogsDir\completion.json" | ConvertFrom-Json
                $completionStatus = $completion.status
                $completionIterations = $completion.iterations
            } catch {}
        }

        $iterData = @()
        foreach ($iter in $iterations) {
            $iterNum = [int]((Split-Path -Leaf $iter.Name) -replace 'iteration_', '')
            $exitCode = if (Test-Path "$($iter.FullName)\exit_code") {
                [int](Get-Content "$($iter.FullName)\exit_code" -ErrorAction SilentlyContinue)
            } else { -1 }

            $duration = 0
            $start = ""
            if (Test-Path "$($iter.FullName)\duration.json") {
                try {
                    $durationData = Get-Content "$($iter.FullName)\duration.json" | ConvertFrom-Json
                    $duration = [int]$durationData.seconds
                    $start = $durationData.start
                } catch {}
            }

            $preview = ""
            $outputFile = "$($iter.FullName)\output.log"
            if (Test-Path $outputFile) {
                $preview = (Get-Content $outputFile -TotalCount 1 -ErrorAction SilentlyContinue) -join ""
                if ($preview.Length -gt 100) { $preview = $preview.Substring(0, 100) }
            }

            $iterData += @{
                number = $iterNum
                exit_code = $exitCode
                duration_seconds = $duration
                start = $start
                output_preview = $preview
            }
        }

        $result = @{
            project = $Project
            total_iterations = $total
            status = $completionStatus
            iterations = $iterData
            completion = @{
                status = $completionStatus
                iterations = $completionIterations
            }
        }

        $result | ConvertTo-Json -Depth 10
    }

    # Main logic
    if ($Json) {
        Output-Json
        exit 0
    }

    if ($Stats) {
        Show-Stats
        exit 0
    }

    if ($Search) {
        Search-Iterations -Pattern $Search
        exit 0
    }

    if ($Iteration) {
        if ($Iteration -eq "latest") {
            $iterDir = (Get-Iterations | Select-Object -Last 1).FullName
        } else {
            $iterDir = "$LogsDir\iteration_$('{0:d3}' -f [int]$Iteration)"
        }

        if (-not (Test-Path $iterDir)) {
            Write-Host "ERROR: Iteration not found: $Iteration" -ForegroundColor Red
            exit 1
        }

        Format-Iteration -IterDir $iterDir
        exit 0
    }

    # Default: list all iterations
    $iterations = Get-Iterations
    Write-Host ("=" * 64) -ForegroundColor Cyan
    Write-Host "  $Project - $($iterations.Count) iterations" -ForegroundColor White
    Write-Host ("=" * 64) -ForegroundColor Cyan
    Write-Host ""

    foreach ($iter in $iterations) {
        Format-Iteration -IterDir $iter.FullName
        Write-Host ""
    }

    # Show current status
    $statusFile = "$LogsDir\status.json"
    if (Test-Path $statusFile) {
        Write-Host "Current status:" -ForegroundColor DarkGray
        Get-Content $statusFile
    }
}
finally {
    Pop-Location
}
