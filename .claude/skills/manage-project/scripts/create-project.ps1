# Create a new Ralph Loop project
# Usage: .\create-project.ps1 <project-name> [-Preset <preset>]
#
# This script wraps the ralph CLI for convenience.

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$Project,

    [Parameter(Position=1)]
    [ValidateSet("minimal", "standard", "three-tier", "full")]
    [string]$Preset
)

# Find repo root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path "$ScriptDir\..\..\..\..").Path
Set-Location $RepoRoot

# Build CLI args
$args = @("new", $Project)
if ($Preset) {
    $args += "--preset=$Preset"
}

# Use the CLI
& ralph @args
