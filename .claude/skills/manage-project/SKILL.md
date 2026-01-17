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

## CLI Commands

Use the `ralph` CLI to manage projects:

```bash
# Create projects
ralph new my-project                      # Basic project
ralph new my-project --preset=three-tier  # With 3-tier review
ralph new my-project --preset=full        # All features enabled

# List and inspect
ralph list                                # List all projects
ralph show my-project                     # Show config

# Validate and delete
ralph validate .projects/my-project/config.json
ralph delete my-project --force
```

See [docs/CLI.md](docs/CLI.md) for full CLI reference.

## Helper Scripts

### Run Projects

**Linux/Mac (bash):**
```bash
.claude/skills/manage-project/scripts/run.sh <project>                    # Run interactively
.claude/skills/manage-project/scripts/run.sh <project> --background       # Run in background
.claude/skills/manage-project/scripts/run.sh <project> --unlimited        # Unlimited iterations
.claude/skills/manage-project/scripts/run.sh <project> -b -u              # Background + unlimited
.claude/skills/manage-project/scripts/run.sh <project> --auth anthropic-oauth # Specify auth mode
```

**Windows (PowerShell):**
```powershell
.\.claude\skills\manage-project\scripts\run.ps1 <project>                 # Run interactively
.\.claude\skills\manage-project\scripts\run.ps1 <project> -Background     # Run in background
.\.claude\skills\manage-project\scripts\run.ps1 <project> -Unlimited      # Unlimited iterations
.\.claude\skills\manage-project\scripts\run.ps1 <project> -Background -Unlimited  # Both
.\.claude\skills\manage-project\scripts\run.ps1 <project> -AuthMode anthropic-oauth   # Specify auth
```

### Stop Projects

```bash
.claude/skills/manage-project/scripts/stop.sh <project>    # Stop specific project
.claude/skills/manage-project/scripts/stop.sh --all        # Stop all Ralph containers
```

```powershell
.\.claude\skills\manage-project\scripts\stop.ps1 <project>  # Stop specific project
.\.claude\skills\manage-project\scripts\stop.ps1 -All       # Stop all Ralph containers
```

### Status

**Linux/Mac:**
```bash
.claude/skills/manage-project/scripts/status.sh [project]
```

**Windows:**
```powershell
.\.claude\skills\manage-project\scripts\status.ps1 [project]
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
├── AGENTS.md              # Development rules (canonical)
├── CLAUDE.md -> AGENTS.md # Symlink for Claude Code
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
