# show-all-displays.ps1 - Display all formatter output styles
# Usage: .\show-all-displays.ps1 [-Thinking]

param(
    [switch]$Thinking
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Formatter = Join-Path $ScriptDir "..\src\index.js"
$Fixture = Join-Path $ScriptDir "all-displays.ndjson"

# Ensure UTF-8 output
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================"
Write-Host "Ralph Formatter - All Display Styles"
Write-Host "========================================"
Write-Host ""

if ($Thinking) {
    Write-Host "[RALPH_SHOW_THINKING=true]"
    Write-Host ""
    $env:RALPH_SHOW_THINKING = "true"
} else {
    Write-Host "[RALPH_SHOW_THINKING=false (default)]"
    Write-Host ""
    $env:RALPH_SHOW_THINKING = "false"
}

Get-Content $Fixture | node $Formatter

Write-Host ""
Write-Host "========================================"
Write-Host "Run with -Thinking to see thinking blocks"
Write-Host "========================================"
