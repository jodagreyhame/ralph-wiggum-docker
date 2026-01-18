# Ralph CLI Reference

The Ralph CLI (`ralph`) is a command-line tool for managing Ralph Loop projects. It provides project management commands and display modes for monitoring project state.

---

## Installation

```bash
# Install dependencies
bun install

# Build the CLI
bun run build

# Option 1: Link globally (recommended)
bun link
# Now you can use 'ralph' from anywhere

# Option 2: Run from dist
node dist/cli/index.js --help

# Option 3: Run directly with bun (development)
bun run dev --help
```

### Global Installation with `bun link`

After building, link the CLI globally to use `ralph` from anywhere:

```bash
# In the project root
bun install
bun run build
bun link

# Now you can use ralph from any directory
ralph --help
ralph new my-project
ralph run my-project
```

To unlink:
```bash
bun unlink ralph
```

### Setting Up Symlinks

Each project requires a symlink `CLAUDE.md -> AGENTS.md` for compatibility with Claude Code:

**Linux/Mac:**
```bash
# Automatic during project creation
ralph new my-project

# Manual setup (if needed)
cd .projects/my-project
ln -s AGENTS.md CLAUDE.md
```

**Windows (PowerShell as Administrator):**
```powershell
# Automatic during project creation
ralph new my-project

# Manual setup (if needed)
cd .projects/my-project
New-Item -ItemType SymbolicLink -Path CLAUDE.md -Target AGENTS.md
```

**Windows (without admin - using hard link):**
```powershell
# If symlinks require admin and you can't use them
cd .projects/my-project
New-Item -ItemType HardLink -Path CLAUDE.md -Target AGENTS.md
```

**Note:** The `ralph new` command handles symlink creation automatically. Manual setup is only needed if you're creating projects without the CLI.

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `ralph new <name>` | Create a new project |
| `ralph list` | List all projects |
| `ralph show <name>` | Show project configuration |
| `ralph edit <name>` | Edit project in TUI |
| `ralph delete <name>` | Delete a project |
| `ralph validate <path>` | Validate a config.json |
| `ralph run <name>` | Run project with Docker |
| `ralph tui` | Launch interactive TUI |

---

## Project Management Commands

### `ralph new [project-name]`

Create a new Ralph Loop project.

**Usage:**
```bash
ralph new my-project
ralph new my-project --preset=three-tier
ralph new --interactive
```

**Options:**

| Option | Description |
|--------|-------------|
| `-d, --description <desc>` | Project description |
| `-p, --preset <preset>` | Use preset configuration |
| `-i, --interactive` | Launch interactive TUI mode |

**Builder Options:**

| Option | Description |
|--------|-------------|
| `--builder-backend <backend>` | Backend (claude, gemini, codex, opencode, zai) |
| `--builder-auth <auth>` | Auth mode (glm, anthropic-oauth, etc.) |
| `--builder-model <model>` | Model override |
| `--builder-session <mode>` | Session mode (fresh, resume) |

**Reviewer Options:**

| Option | Description |
|--------|-------------|
| `--reviewer-enabled` | Enable reviewer |
| `--no-reviewer` | Disable reviewer |
| `--reviewer-backend <backend>` | Reviewer backend |
| `--reviewer-auth <auth>` | Reviewer auth mode |
| `--reviewer-model <model>` | Reviewer model override |
| `--reviewer-session <mode>` | Session mode (fresh, resume) |

**Architect Options:**

| Option | Description |
|--------|-------------|
| `--architect-enabled` | Enable architect |
| `--no-architect` | Disable architect |
| `--architect-backend <backend>` | Architect backend |
| `--architect-auth <auth>` | Architect auth mode |
| `--architect-model <model>` | Architect model override |
| `--architect-session <mode>` | Session mode (fresh, resume) |

**Escalation Options:**

| Option | Description |
|--------|-------------|
| `--escalation-enabled` | Enable escalation |
| `--no-escalation` | Disable escalation |
| `--escalation-failures <n>` | Max failures before escalation |

**Provider Fallback Options:**

| Option | Description |
|--------|-------------|
| `--fallback-enabled` | Enable provider fallback |
| `--no-fallback` | Disable provider fallback |
| `--fallback-threshold <n>` | Failure threshold |
| `--fallback-sequence <json>` | Provider sequence (JSON array) |

**Loop Options:**

| Option | Description |
|--------|-------------|
| `--max-iterations <n>` | Maximum iterations (0 = infinite) |
| `--completion-enabled` | Enable completion detection |
| `--no-completion` | Disable completion detection |

**Presets:**

| Preset | Description |
|--------|-------------|
| `minimal` | Builder only, no review |
| `standard` | Builder + optional reviewer |
| `three-tier` | Builder + Reviewer + Architect |
| `full` | All features enabled |

**Example:**
```bash
# Create with three-tier review
ralph new my-project --preset=three-tier --description="AI research project"

# Create with custom builder
ralph new my-project --builder-backend=gemini --builder-auth=gemini-oauth

# Create with provider fallback
ralph new my-project --fallback-enabled --fallback-sequence='["glm","claude","gemini"]'
```

---

### `ralph list` (alias: `ralph ls`)

List all projects in the `.projects/` directory.

**Usage:**
```bash
ralph list
ralph ls
```

**Output:**
```
Projects:

  my-project
    Backend: claude
    Tiers: Builder → Reviewer

  another-project
    Backend: gemini
    Tiers: Builder → Reviewer → Architect
```

---

### `ralph show <project>`

Display the full configuration for a project.

**Usage:**
```bash
ralph show my-project
```

**Output:**
```
Project: my-project
Description here

Config:
{
  "name": "my-project",
  "builder": { ... },
  "reviewer": { ... },
  ...
}
```

---

### `ralph edit <project>`

Open an existing project in the interactive TUI for editing.

**Usage:**
```bash
ralph edit my-project
```

Launches the TUI with the project's current configuration pre-loaded.

---

### `ralph delete <project>` (alias: `ralph rm`)

Delete a project and all its files.

**Usage:**
```bash
ralph delete my-project
ralph rm my-project
ralph delete my-project --force  # Skip confirmation
```

**Options:**

| Option | Description |
|--------|-------------|
| `-f, --force` | Skip confirmation prompt |

---

### `ralph validate <path>`

Validate a config.json file against the schema.

**Usage:**
```bash
ralph validate .projects/my-project/config.json
ralph validate ./config.json
```

**Output (valid):**
```
✓ Configuration is valid
```

**Output (invalid):**
```
✗ Configuration has errors:
  builder.backend: must be one of: claude, gemini, codex, opencode, zai
  reviewer.auth_mode: invalid auth mode
```

---

### `ralph run <project>`

Run a project using Docker Compose. Cross-platform: automatically uses PowerShell on Windows and Bash on Unix.

**Usage:**
```bash
ralph run my-project
```

**Platform-Specific Behavior:**

- **Windows:** Executes `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "./scripts/run.ps1" -Project "my-project"`
- **Linux/Mac:** Executes `./scripts/run.sh my-project`

Falls back to manual instructions if the script is not available.

---

### `ralph tui`

Launch the interactive TUI (Terminal User Interface) mode.

**Usage:**
```bash
ralph tui
```

The TUI provides a visual interface for:
- Creating new projects
- Configuring builder, reviewer, and architect settings
- Setting up escalation and provider fallback
- Saving configurations

**Keyboard Navigation:**
- `Tab` / `Shift+Tab` - Switch tabs
- `↑` / `↓` - Navigate fields
- `Enter` - Select/toggle
- `Space` - Toggle boolean values
- `1-5` - Select backend provider
- `q` / `Ctrl+C` - Quit

---

## Display Mode Options

When using the `-p, --project` flag, the CLI enters display mode to show project state.

### Dashboard View

```bash
ralph -p .projects/my-project -s dashboard
```

Shows project overview with:
- Current phase and task
- Completion percentage
- Recent activity

### Tasks View

```bash
ralph -p .projects/my-project -s tasks
ralph -p .projects/my-project -s tasks --status pending
ralph -p .projects/my-project -s tasks --phase 2
```

Shows task list with filtering options.

**Options:**

| Option | Description |
|--------|-------------|
| `--status <status>` | Filter by status (pending, in_progress, completed, blocked) |
| `--phase <number>` | Filter by phase number |

### Task Detail View

```bash
ralph -p .projects/my-project -t 2.3
```

Shows detailed information for a specific task by ID.

### Progress View

```bash
ralph -p .projects/my-project -s progress
```

Shows overall progress with phase breakdown.

---

## Global Options

| Option | Description |
|--------|-------------|
| `-V, --version` | Output version number |
| `-h, --help` | Display help |
| `-p, --project <path>` | Project directory for display mode |
| `-s, --screen <screen>` | Screen to display (dashboard, tasks, progress) |
| `-t, --task <id>` | Show task detail by ID |

---

## Task Specifications

Projects can include task specifications in `.project/specs/tasks/`. These are JSON files that define structured tasks with dependencies.

### File Structure

```
.project/specs/tasks/
├── schema.json          # JSON Schema
├── summary.json         # Auto-generated summary
├── phase-00-bootstrap.json
├── phase-01-foundation.json
└── phase-02-features.json
```

### Phase File Format

```json
{
  "phase": 1,
  "name": "Foundation",
  "description": "Core infrastructure",
  "tasks": [
    {
      "id": "1.1",
      "name": "Setup project structure",
      "description": "Create base directories",
      "status": "pending",
      "provider": "glm",
      "complexity": "S",
      "depends_on": ["0.1"]
    }
  ]
}
```

### Status Values

| Status | Description |
|--------|-------------|
| `pending` | Not started |
| `in_progress` | Currently being worked on |
| `completed` | Done |
| `blocked` | Cannot proceed (requires `blocked_reason`) |

### Complexity

| Value | Description |
|-------|-------------|
| `S` | Small (< 1 hour) |
| `M` | Medium (1-4 hours) |
| `L` | Large (> 4 hours) |

---

## Examples

### Create a minimal project
```bash
ralph new test-project --preset=minimal
```

### Create a full 3-tier project
```bash
ralph new production-app \
  --preset=three-tier \
  --description="Production application" \
  --builder-backend=claude \
  --builder-auth=anthropic-oauth \
  --reviewer-backend=claude \
  --reviewer-auth=anthropic-oauth \
  --architect-backend=gemini \
  --architect-auth=gemini-oauth
```

### Create with provider fallback
```bash
ralph new resilient-project \
  --fallback-enabled \
  --fallback-threshold=5 \
  --fallback-sequence='[{"name":"glm","backend":"claude","auth_mode":"glm"},{"name":"claude","backend":"claude","auth_mode":"anthropic-oauth"}]'
```

### Run a project (cross-platform)
```bash
# Works on both Windows (PowerShell) and Unix (Bash)
ralph run my-project
```

### View project tasks
```bash
ralph -p .projects/my-project -s tasks --status in_progress
```

### Validate before running
```bash
ralph validate .projects/my-project/config.json && ralph run my-project
```
