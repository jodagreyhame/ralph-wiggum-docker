---
name: manage-project
description: |
  Manage Ralph Loop projects. Use this skill when user wants to:
  - CREATE a new project ("new project", "start a project", "create project", "build a <thing>")
  - RUN a project ("start ralph", "run project", "launch project")
  - STOP a project ("stop ralph", "stop project", "kill project")
  - CHECK STATUS ("project status", "list projects", "what's running")

  This is the PRIMARY skill for project lifecycle management.
---

# Project Manager

Control Docker-based Ralph Loop iterations.

## Helper Scripts

### Run Projects

**Linux/Mac (bash):**
```bash
.claude/skills/orchestrator/scripts/run.sh <project>                    # Run interactively
.claude/skills/orchestrator/scripts/run.sh <project> --background       # Run in background
.claude/skills/orchestrator/scripts/run.sh <project> --unlimited        # Unlimited iterations
.claude/skills/orchestrator/scripts/run.sh <project> -b -u              # Background + unlimited
.claude/skills/orchestrator/scripts/run.sh <project> --auth anthropic-oauth # Specify auth mode
```

**Windows (PowerShell):**
```powershell
.\.claude\skills\orchestrator\scripts\run.ps1 <project>                 # Run interactively
.\.claude\skills\orchestrator\scripts\run.ps1 <project> -Background     # Run in background
.\.claude\skills\orchestrator\scripts\run.ps1 <project> -Unlimited      # Unlimited iterations
.\.claude\skills\orchestrator\scripts\run.ps1 <project> -Background -Unlimited  # Both
.\.claude\skills\orchestrator\scripts\run.ps1 <project> -AuthMode anthropic-oauth   # Specify auth
```

### Stop Projects

```bash
.claude/skills/orchestrator/scripts/stop.sh <project>    # Stop specific project
.claude/skills/orchestrator/scripts/stop.sh --all        # Stop all Ralph containers
```

```powershell
.\.claude\skills\orchestrator\scripts\stop.ps1 <project>  # Stop specific project
.\.claude\skills\orchestrator\scripts\stop.ps1 -All       # Stop all Ralph containers
```

### Other Scripts

**Linux/Mac:**
```bash
.claude/skills/orchestrator/scripts/create-project.sh <project-name>
.claude/skills/orchestrator/scripts/status.sh [project]
```

**Windows:**
```powershell
.\.claude\skills\orchestrator\scripts\create-project.ps1 <project-name>
.\.claude\skills\orchestrator\scripts\status.ps1 [project]
```

### View Logs & Monitor

For detailed log viewing and real-time monitoring, use the **logs-viewer** skill:

```bash
# View all iterations
.claude/skills/logs-viewer/scripts/logs.sh <project>

# View specific iteration
.claude/skills/logs-viewer/scripts/logs.sh <project> -i latest

# Watch live output
.claude/skills/logs-viewer/scripts/watch.sh <project>

# Check current status
cat .projects/<project>/logs/status.json
```

Or on Windows:
```powershell
.\.claude\skills\logs-viewer\scripts\logs.ps1 <project>
.\.claude\skills\logs-viewer\scripts\watch.ps1 <project>
```

## Docker Commands (Single Service Pattern)

| Task | Command |
|------|---------|
| Build | `docker compose build` |
| Run project | `RALPH_PROJECT_DIR=./.projects/<project> docker compose run --rm ralph` |
| Run (anthropic-oauth) | `RALPH_PROJECT_DIR=./.projects/<project> RALPH_AUTH_MODE=anthropic-oauth docker compose run --rm ralph` |
| List | `docker compose ps` |
| Stop | `docker compose stop` |
| Logs | `docker compose logs -f` |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RALPH_PROJECT_DIR` | `./.projects/_default` | Project folder to mount |
| `RALPH_PROJECT_NAME` | `my-project` | Container name suffix |
| `RALPH_AUTH_MODE` | `glm` | Auth mode (see table below) |
| `RALPH_MAX_ITERATIONS` | `100` | Max iterations (0=infinite) |
| `RALPH_COMPLETION_ENABLED` | `true` | Enable file-based completion |

### Auth Modes

| Mode | Description |
|------|-------------|
| `anthropic-oauth` | Uses host `~/.claude` OAuth (recommended) |
| `anthropic-api` | Direct `ANTHROPIC_API_KEY` |
| `gemini-oauth` | Uses host `~/.gemini` OAuth |
| `gemini-api` | Direct `GEMINI_API_KEY` |
| `openai-oauth` | Uses host `~/.codex` OAuth |
| `openai-api` | Direct `OPENAI_API_KEY` |
| `opencode-oauth` | Uses host `~/.local/share/opencode` |
| `opencode-api` | Direct `OPENCODE_API_KEY` |
| `glm` | z.ai proxy (default) |

## Create Project Manually

1. Copy template: `cp -r template/ .projects/<project>/` or `Copy-Item -Recurse template .projects\<project>`
2. Edit `.projects/<project>/GOAL.md` with your project objective and completion criteria
3. Run: `RALPH_PROJECT_DIR=./.projects/<project> docker compose run --rm ralph`

## Quick Run Commands

```powershell
# Windows - run any project
.\scripts\run.ps1 <project>
.\scripts\run.ps1 <project> -Build     # Force rebuild first
.\scripts\run.ps1 <project> -Shell     # Open shell instead
```

```bash
# Linux/Mac
./scripts/run.sh <project>
```

## Project Structure

```
.projects/<project>/
├── GOAL.md                # Project objective (EDIT THIS)
├── CLAUDE.md              # Development rules
├── config.json            # Configuration
├── .project/              # State & knowledge
│   ├── prompts/           # Role prompts (DO NOT EDIT)
│   │   ├── BUILDER.md     # Builder workflow
│   │   ├── REVIEWER.md    # Reviewer instructions
│   │   └── ARCHITECT.md   # Architect instructions
│   ├── state/
│   └── knowledge/
├── logs/                  # Iteration logs
└── src/                   # Source code
```
