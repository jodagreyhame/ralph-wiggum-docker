# Ralph Wiggum Docker Loop

A Docker-based orchestrator for running Ralph Loop iterations on projects.

## What is Ralph Loop?

The Ralph Wiggum technique (by Geoffrey Huntley) feeds the same prompt to Claude repeatedly:

```bash
while :; do
  cat .project/prompts/BUILDER.md | claude-code --continue
done
```

Claude sees its previous work in files and git history, enabling self-referential improvement across iterations. The project goal is defined in `GOAL.md` - this is the only file you need to edit for each project.

## 3-Tier Review System

Optional quality control pipeline:

| Role | Default | Purpose | Session |
|------|---------|---------|---------|
| **Builder** | GLM | Does the work | fresh |
| **Reviewer** | Opus | Pass/fail gate | fresh |
| **Architect** | Gemini | Final approval | resume |

**Flow:** Builder → Reviewer (PASS/FAIL) → Architect (APPROVE/REJECT)
- FAIL or REJECT → feedback written to `.project/*/feedback.md`, builder retries
- APPROVE → loop exits

**Escalation:** After 3 consecutive failures, roles promote up (GLM→Opus→Gemini→disabled).

## Isolation Model

One Docker image (Claude CLI + ralph.sh + lib/) serves many projects:
- Each project mounts to `/project` inside its own container
- Projects are fully isolated (separate filesystems, can run in parallel)
- Same image, different volume mounts via `RALPH_PROJECT_DIR`

## Quick Start

```bash
# 1. Copy env template and configure auth mode
cp env.template .env

# 2. Build the image (once)
docker compose build

# 3. Build CLI (optional, for project management)
bun install && bun run build

# 4. Create a project
ralph new my-project --preset=three-tier

# 5. Run (isolated container)
RALPH_PROJECT_DIR=./.projects/my-project docker compose run --rm ralph
```

## CLI Tool

The `ralph` CLI provides project management commands. See [docs/CLI.md](docs/CLI.md) for full reference.

```bash
# Project management
ralph new <name>              # Create project
ralph new --preset=three-tier # With preset
ralph list                    # List projects
ralph show <name>             # Show config
ralph delete <name>           # Delete project
ralph validate <path>         # Validate config.json

# Display modes (requires task specs)
ralph -p <path> -s dashboard  # Project overview
ralph -p <path> -s tasks      # Task list
ralph -p <path> -s progress   # Progress view
```

## Config Schema (3-Tier)

```json
{
  "name": "my-project",
  "description": "Project description",
  "version": "0.1.0",

  "prompts": {
    "dir": ".project/prompts",
    "goal": "GOAL.md",
    "builder": "BUILDER.md",
    "reviewer": "REVIEWER.md",
    "architect": "ARCHITECT.md"
  },

  "builder": {
    "backend": "claude",
    "auth_mode": "glm",
    "model": null,
    "session_mode": "fresh"
  },

  "reviewer": {
    "enabled": false,
    "backend": "claude",
    "auth_mode": "anthropic-oauth",
    "model": null,
    "session_mode": "fresh"
  },

  "architect": {
    "enabled": false,
    "backend": "gemini",
    "auth_mode": "gemini-oauth",
    "model": null,
    "session_mode": "resume"
  },

  "escalation": {
    "enabled": false,
    "max_builder_failures": 3
  },

  "provider_fallback": {
    "enabled": true,
    "failure_threshold": 10,
    "sequence": [
      {"name": "glm", "backend": "claude", "auth_mode": "glm", "model": "glm-4.7"},
      {"name": "claude", "backend": "claude", "auth_mode": "anthropic-oauth", "model": "opus"},
      {"name": "gemini", "backend": "gemini", "auth_mode": "gemini-oauth", "model": "gemini-2.5-pro"},
      {"name": "codex", "backend": "codex", "auth_mode": "openai-oauth"},
      {"name": "opencode", "backend": "opencode", "auth_mode": "opencode-oauth", "model": "google/antigravity-claude-opus-4-5-thinking"}
    ]
  },

  "max_iterations": 0,
  "completion_enabled": true,
  "knowledge_dir": ".project"
}
```

### Config Options

| Section | Field | Values | Description |
|---------|-------|--------|-------------|
| **prompts** | dir | path | Directory for role prompts |
| | goal | filename | Project goal file (visible in root) |
| | builder | filename | Builder workflow prompt |
| | reviewer | filename | Reviewer instructions |
| | architect | filename | Architect instructions |
| **builder** | backend | `claude`, `gemini`, `codex`, `opencode` | CLI backend |
| | auth_mode | See Auth Modes | Authentication method |
| | session_mode | `fresh`, `resume` | Session handling |
| **reviewer** | enabled | `true`/`false` | Enable review phase |
| | backend | Same as builder | CLI backend |
| | auth_mode | See Auth Modes | Authentication method |
| **architect** | enabled | `true`/`false` | Enable architect phase |
| | backend | Same as builder | CLI backend |
| | session_mode | Usually `resume` | Full context across iterations |
| **escalation** | enabled | `true`/`false` | Enable role escalation |
| | max_builder_failures | number | Failures before escalation |
| **provider_fallback** | enabled | `true`/`false` | Enable automatic provider switching |
| | failure_threshold | number | CLI failures before switching (default: 10) |
| | sequence | array | Provider fallback order (see formats below) |
| | auth_modes | object | (Optional, string format only) Auth mode per provider |
| **root** | max_iterations | number, 0=infinite | Stop after N iterations |
| | completion_enabled | `true`/`false` | Enable file-based completion |

## File-Based Signaling

All decisions use file-based signaling for consistency:

| Signal | File | Values | Written By |
|--------|------|--------|------------|
| **Completion** | `.project/state/completion.txt` | `COMPLETE` | Builder |
| **Review** | `.project/review/decision.txt` | `PASS` / `FAIL` | Reviewer |
| **Architect** | `.project/architect/decision.txt` | `APPROVE` / `REJECT` | Architect |
| **Blocked** | `BLOCKED.md` | (any content) | Builder |
| **Provider Override** | `.project/state/provider-override.json` | JSON with `requested_backend` | Reviewer/Architect |
| **Provider Health** | `.project/state/provider-health.json` | Auto-tracked status | System |

### Builder Signals Completion

When all criteria are met:
```bash
echo "COMPLETE" > .project/state/completion.txt
```

### Reviewer Decision

```bash
# If work is acceptable
echo "PASS" > .project/review/decision.txt

# If work needs changes
echo "FAIL" > .project/review/decision.txt
cat > .project/review/feedback.md << 'EOF'
## Issues Found
- (list specific issues)
EOF
```

### Architect Decision

```bash
# If architecture is sound
echo "APPROVE" > .project/architect/decision.txt

# If architectural concerns
echo "REJECT" > .project/architect/decision.txt
cat > .project/architect/feedback.md << 'EOF'
## Architectural Concerns
- (high-level issues)
EOF
```

**Note:** On FAIL or REJECT, the completion file is automatically cleared - builder must try again.

## Auth Modes

| Mode | Variable | Description |
|------|----------|-------------|
| **anthropic-oauth** | `RALPH_AUTH_MODE=anthropic-oauth` | Host `~/.claude` OAuth (recommended) |
| anthropic-api | `RALPH_AUTH_MODE=anthropic-api` | Direct `ANTHROPIC_API_KEY` |
| gemini-oauth | `RALPH_AUTH_MODE=gemini-oauth` | Host `~/.gemini` OAuth |
| gemini-api | `RALPH_AUTH_MODE=gemini-api` | Direct `GEMINI_API_KEY` |
| openai-oauth | `RALPH_AUTH_MODE=openai-oauth` | Host `~/.codex` OAuth |
| openai-api | `RALPH_AUTH_MODE=openai-api` | Direct `OPENAI_API_KEY` |
| opencode-oauth | `RALPH_AUTH_MODE=opencode-oauth` | Host OpenCode OAuth |
| glm | `RALPH_AUTH_MODE=glm` | z.ai proxy (default) |

## Project Structure

```
ralph-wiggum-docker-loop/
├── CLAUDE.md                     # This file
├── README.md                     # User documentation
├── docker-compose.yml            # Container orchestration
├── env.template                  # Environment template
├── package.json                  # CLI dependencies
├── src/                          # CLI source code
│   ├── cli/                      # CLI commands
│   └── ...                       # TUI components
├── docs/                         # Documentation
│   └── CLI.md                    # CLI reference
├── template/                     # Project template
│   ├── GOAL.md                   # Project objective template
│   ├── AGENTS.md                 # Development rules (canonical)
│   ├── config.json               # 3-tier config template
│   └── .project/prompts/         # Role prompts (hidden)
│       ├── BUILDER.md            # Builder workflow
│       ├── REVIEWER.md           # Reviewer instructions
│       └── ARCHITECT.md          # Architect instructions
├── docker/                       # Docker infrastructure
│   ├── Dockerfile
│   ├── entrypoint.sh             # Config parsing, env setup
│   ├── ralph.sh                  # Main loop script (~220 lines)
│   ├── cli/                      # CLI backend configs
│   │   ├── claude.sh
│   │   ├── gemini.sh
│   │   ├── codex.sh
│   │   └── opencode.sh
│   └── lib/                      # Library modules
│       ├── colors.sh             # Terminal colors
│       ├── display.sh            # Banners, logging
│       ├── filter.sh             # Output filtering
│       ├── tracking.sh           # Git diff tracking
│       ├── escalation.sh         # Role escalation logic
│       ├── phases.sh             # Reviewer/architect phases
│       ├── completion.sh         # Completion detection
│       └── feedback.sh           # Feedback injection
├── .projects/                    # All projects (gitignored)
│   └── <project>/                # Each project (isolated)
├── test/                         # Test suite
│   └── cli/                      # CLI tests
├── scripts/                      # Launcher scripts
└── static/                       # Assets

.projects/<project>/              # Each project (isolated)
├── GOAL.md                       # Project objective (EDIT THIS)
├── AGENTS.md                     # Development rules (canonical)
├── CLAUDE.md -> AGENTS.md        # Symlink for Claude Code
├── config.json                   # 3-tier configuration
├── .project/                     # State and knowledge
│   ├── prompts/                  # Role prompts (DO NOT EDIT)
│   │   ├── BUILDER.md            # Builder workflow
│   │   ├── REVIEWER.md           # Reviewer instructions
│   │   └── ARCHITECT.md          # Architect instructions
│   ├── state/
│   │   ├── current.json          # Current focus
│   │   ├── completion.txt        # Completion signal
│   │   ├── work-summary.md       # Builder's work summary
│   │   ├── escalation.json       # Escalation tracking
│   │   └── architect_session_started  # Architect session marker
│   ├── review/                   # Reviewer state
│   │   ├── decision.txt          # PASS/FAIL
│   │   └── feedback.md           # If FAIL
│   ├── architect/                # Architect state
│   │   ├── decision.txt          # APPROVE/REJECT
│   │   └── feedback.md           # If REJECT
│   └── knowledge/                # Patterns, failures
├── logs/                         # Iteration logs
│   ├── session.log               # Full session log
│   ├── status.json               # Current status
│   ├── current.log               # Symlink to current iteration
│   └── iteration_XXX/            # Per-iteration logs
│       ├── output.live           # Raw builder output
│       ├── output.readable       # Filtered output
│       ├── reviewer.live         # Reviewer output
│       ├── reviewer.readable
│       ├── architect.live        # Architect output
│       ├── architect.readable
│       ├── duration.json         # Timing info
│       └── exit_code             # CLI exit code
└── src/                          # Source code
```

## Development Rules

### DO NOT EDIT during iterations:
- `GOAL.md` - project completion criteria
- `AGENTS.md` - development rules (canonical)
- `CLAUDE.md` - symlink to AGENTS.md (for Claude Code)
- `.project/prompts/*` - role prompts (hidden)

### Mandatory Patterns

1. **Environment Variables**: All secrets via `.env`, never hardcoded
2. **Knowledge Directory**: Every project needs `.project/` with state and knowledge
3. **Work Summary**: Builder writes `.project/state/work-summary.md` before committing
4. **Commits**: Every iteration must end with a git commit

### Anti-Patterns

- No hardcoded secrets
- No mock data
- No silent fallbacks
- No TODO comments
- No files > 300 lines
- No functions > 50 lines

### Docker Safety

**NEVER stop a Docker container without first verifying the correct container/project instance:**

```bash
# 1. ALWAYS list running containers first
docker ps --filter "name=ralph"

# 2. Identify the specific container by project name
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Command}}"

# 3. Stop ONLY the specific container
docker stop <container-name>

# Or stop by project directory match
docker ps --filter "name=ralph" --format "{{.Names}}" | grep "<project-name>"
```

**Why:** Multiple Ralph projects can run in parallel. Stopping the wrong container kills another user's work.

## Testing

Run the Docker test suite to validate all configurations:

```bash
# Linux/Mac
./test/test-all.sh

# Windows PowerShell
.\test\test-all.ps1
```

Tests all auth modes (glm, anthropic-oauth, anthropic-api, gemini-oauth, etc.), volume mounts, and image builds.

### CLI Tests

```bash
# Linux/Mac
./test/cli/test-cli.sh

# Windows PowerShell
.\test\cli\test-cli.ps1
```

Tests all CLI commands: new, list, show, delete, validate, and display modes.

## Usage

### Linux/Mac (Bash)

```bash
# Build image once
docker compose build

# Run with builder only (no review)
RALPH_PROJECT_DIR=./.projects/my-project docker compose run --rm ralph

# With Anthropic OAuth
RALPH_PROJECT_DIR=./.projects/my-project RALPH_AUTH_MODE=anthropic-oauth docker compose run --rm ralph

# Run multiple in parallel (separate terminals)
RALPH_PROJECT_DIR=./.projects/project-a docker compose run --rm ralph &
RALPH_PROJECT_DIR=./.projects/project-b docker compose run --rm ralph &
```

### Windows (PowerShell)

```powershell
# Build image once
docker compose build

# Run a project (set env var BEFORE the command)
$env:RALPH_PROJECT_DIR="./.projects/my-project"; docker compose run --rm ralph

# With specific auth mode
$env:RALPH_PROJECT_DIR="./.projects/my-project"
$env:RALPH_AUTH_MODE="anthropic-oauth"
docker compose run --rm ralph

# Run multiple in parallel (separate PowerShell windows)
# Terminal 1:
$env:RALPH_PROJECT_DIR="./.projects/project-a"; docker compose run --rm ralph

# Terminal 2:
$env:RALPH_PROJECT_DIR="./.projects/project-b"; docker compose run --rm ralph
```

## Environment Variables

### Builder

| Variable | Default | Description |
|----------|---------|-------------|
| `RALPH_CLI` | `claude` | Builder CLI backend |
| `RALPH_MODEL` | (none) | Model override (opus, sonnet, haiku) |
| `RALPH_SESSION_MODE` | `fresh` | Session mode |

### Reviewer

| Variable | Default | Description |
|----------|---------|-------------|
| `RALPH_REVIEWER_ENABLED` | `false` | Enable reviewer |
| `RALPH_REVIEWER_BACKEND` | `claude` | Reviewer CLI |
| `RALPH_REVIEWER_AUTH_MODE` | `anthropic-oauth` | Reviewer auth |
| `RALPH_REVIEWER_SESSION_MODE` | `fresh` | Session mode |

### Architect

| Variable | Default | Description |
|----------|---------|-------------|
| `RALPH_ARCHITECT_ENABLED` | `false` | Enable architect |
| `RALPH_ARCHITECT_BACKEND` | `gemini` | Architect CLI |
| `RALPH_ARCHITECT_AUTH_MODE` | `gemini-oauth` | Architect auth |
| `RALPH_ARCHITECT_SESSION_MODE` | `resume` | Session mode |

### Escalation

| Variable | Default | Description |
|----------|---------|-------------|
| `RALPH_ESCALATION_ENABLED` | `false` | Enable escalation |
| `RALPH_ESCALATION_MAX_FAILURES` | `3` | Failures before escalation |

### Provider Fallback

| Variable | Default | Description |
|----------|---------|-------------|
| `RALPH_PROVIDER_FALLBACK_ENABLED` | `false` | Enable automatic provider switching |
| `RALPH_PROVIDER_FAILURE_THRESHOLD` | `10` | CLI failures before switching |
| `RALPH_PROVIDER_FALLBACK_SEQUENCE` | (see below) | Provider fallback order (JSON array) |
| `RALPH_PROVIDER_FALLBACK_AUTH_MODES` | `{}` | Auth modes per provider (string format only) |

**Sequence formats:**

String format (simple, uses auth_modes lookup):
```json
["claude", "gemini", "codex", "opencode"]
```

Object format (explicit backend + auth + model per provider):
```json
[
  {"name": "glm", "backend": "claude", "auth_mode": "glm", "model": "glm-4.7"},
  {"name": "claude", "backend": "claude", "auth_mode": "anthropic-oauth", "model": "opus"},
  {"name": "gemini", "backend": "gemini", "auth_mode": "gemini-oauth", "model": "gemini-2.5-pro"}
]
```

Object format allows the same backend with different auth modes (e.g., GLM → Claude OAuth) and per-provider model selection. The `model` field is optional.

### General

| Variable | Default | Description |
|----------|---------|-------------|
| `RALPH_MAX_ITERATIONS` | `100` | Max iterations (0=infinite) |
| `RALPH_COMPLETION_ENABLED` | `true` | Enable completion detection |
| `RALPH_PROJECT_NAME` | `PROJECT` | Project name for logs |
| `RALPH_READABLE_OUTPUT` | `true` | Filter output for readability |
| `RALPH_SHOW_THINKING` | `true` | Show thinking blocks (requires thinking model) |
