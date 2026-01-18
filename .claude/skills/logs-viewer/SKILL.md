---
name: logs-viewer
description: |
  View and analyze iteration logs. Use when user wants to:
  - VIEW logs ("show logs", "view output", "what happened")
  - WATCH live ("tail logs", "follow progress", "watch iteration")
  - SEARCH logs ("find in logs", "search output", "grep logs")
  - COMPARE runs ("compare iterations", "diff runs")

  For project management (start/stop/create), use manage-project instead.
---

# Ralph Loop Logs Viewer

View, search, and analyze iteration logs from Ralph Loop projects.

## Quick Commands

### List All Iterations

```bash
# Linux/Mac
.claude/skills/logs-viewer/scripts/logs.sh <project>

# Windows
.\.claude\skills\logs-viewer\scripts\logs.ps1 <project>
```

### View Specific Iteration

```bash
.claude/skills/logs-viewer/scripts/logs.sh <project> -i 3       # View iteration 3
.claude/skills/logs-viewer/scripts/logs.sh <project> -i latest  # View latest
```

### Search Across Iterations

```bash
.claude/skills/logs-viewer/scripts/logs.sh <project> -s "error"
.claude/skills/logs-viewer/scripts/logs.sh <project> -s "TASK COMPLETE"
```

### View File Changes

```bash
.claude/skills/logs-viewer/scripts/logs.sh <project> -f         # Show all file changes
.claude/skills/logs-viewer/scripts/logs.sh <project> -f -i 3    # Changes in iteration 3
```

### Statistics

```bash
.claude/skills/logs-viewer/scripts/logs.sh <project> --stats    # Summary statistics
```

### JSON Output

```bash
.claude/skills/logs-viewer/scripts/logs.sh <project> --json     # Machine-readable output
```

## Watch Live Logs

```bash
# Linux/Mac
.claude/skills/logs-viewer/scripts/watch.sh <project>           # Follow current iteration
.claude/skills/logs-viewer/scripts/watch.sh <project> --session # Follow session.log

# Windows
.\.claude\skills\logs-viewer\scripts\watch.ps1 <project>
```

## Log File Structure

Each project stores logs in `.projects/<project>/logs/`:

```
logs/
├── session.log               # Colorized session log (all iterations)
├── current.log               # Symlink to active iteration's output.live
├── status.json               # Current iteration status (pollable)
├── completion.json           # Final status when complete
└── iteration_XXX/
    ├── output.live           # Real-time streaming output
    ├── output.log            # Final text output
    ├── duration.json         # Timing data
    ├── files_changed.json    # Git changes
    ├── exit_code             # Exit status
    └── git_diff.txt          # Diff output
```

## Status File (status.json)

Poll this file for real-time iteration status:

```json
{"iteration":3,"status":"running","started":"2026-01-15T22:30:00+09:30","project":"my-project"}
```

Or after completion:

```json
{"iteration":3,"status":"complete","exit_code":0,"seconds":45,"project":"my-project"}
```

## Output Formats

### Human-Readable (Default)

```
┌─ Iteration 001 ──────────────────────────────────────────────┐
│ Status: ✓ Success (exit 0)                                   │
│ Duration: 14s                                                │
│ Files: +3 ~2 -0                                              │
├──────────────────────────────────────────────────────────────┤
│ Counter incremented from 0 to 1. Committed...                │
└──────────────────────────────────────────────────────────────┘
```

### JSON (--json)

```json
{
  "project": "my-project",
  "total_iterations": 4,
  "status": "complete",
  "iterations": [
    {
      "number": 1,
      "exit_code": 0,
      "duration_seconds": 14,
      "output_preview": "..."
    }
  ]
}
```

## Integration with Project Manager

Use with manage-project commands:

```bash
# Start project in background
.claude/skills/manage-project/scripts/run.sh my-project

# Watch live output
.claude/skills/logs-viewer/scripts/watch.sh my-project

# Check status
cat .projects/my-project/logs/status.json
```
