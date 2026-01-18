# Ralph Loop Docker Tests

Automated test suite for validating Docker configurations and auth modes.

## Structure

```
test/
├── test-all.sh              # Main runner (Bash)
├── test-all.ps1             # Main runner (PowerShell)
├── README.md                # This file
├── lib/                     # Shared libraries
│   ├── common.sh            # Colors, pass/fail, infrastructure tests
│   └── project.sh           # Test project creation/management
├── cli/                     # CLI command tests
│   ├── test-cli.ps1         # Tests all ralph CLI commands (PowerShell)
│   └── test-cli.sh          # Tests all ralph CLI commands (Bash)
├── backends/                # Backend configs (mirrors docker/cli/)
│   ├── claude.sh            # Claude Code backend
│   ├── gemini.sh            # Gemini backend
│   ├── codex.sh             # OpenAI Codex backend
│   └── opencode.sh          # OpenCode (Antigravity) backend
└── auth/                    # Auth mode configs
    ├── anthropic-oauth.sh   # Host ~/.claude OAuth (recommended)
    ├── anthropic-api.sh     # Direct Anthropic API
    ├── gemini-oauth.sh      # Host ~/.gemini OAuth
    ├── openai-oauth.sh      # Host ~/.codex OAuth
    ├── openai-api.sh        # Direct OpenAI API
    ├── opencode-oauth.sh    # Host ~/.local/share/opencode
    └── glm.sh               # z.ai GLM backend
```

## Quick Start

```bash
# Docker tests - Linux/Mac/WSL
./test/test-all.sh

# Docker tests - Windows PowerShell
.\test\test-all.ps1

# CLI tests - Windows PowerShell (recommended)
.\test\cli\test-cli.ps1

# CLI tests - Linux/Mac/WSL
bash -c 'source test/cli/test-cli.sh'
```

## What It Tests

| Test | Description |
|------|-------------|
| Docker available | Docker daemon is running |
| Docker Compose | Compose v2 is available |
| Image build | `ralph-loop:latest` builds successfully |
| Template exists | `template/.project/prompts/BUILDER.md` is present |
| anthropic-oauth | Host `~/.claude` OAuth credentials (recommended) |
| anthropic-api | Direct API with `ANTHROPIC_API_KEY` |
| gemini-oauth | Host `~/.gemini` OAuth credentials |
| openai-oauth | Host `~/.codex` OAuth credentials |
| openai-api | Direct API with `OPENAI_API_KEY` |
| opencode-oauth | Host `~/.local/share/opencode` credentials |
| GLM (z.ai) | z.ai backend with `GLM_AUTH_TOKEN` |

## CLI Tests

The `test/cli/` directory contains tests for the Ralph CLI commands.

**Tests included:**

| Test | Description |
|------|-------------|
| ralph --version | Version output |
| ralph --help | Help output |
| ralph list | List projects |
| ralph new | Create project |
| ralph show | Show project config |
| ralph delete | Delete project |
| ralph validate | Validate config |
| ralph -p -s dashboard | Dashboard display mode |
| ralph -p -s tasks | Tasks display mode |
| ralph -p -s progress | Progress display mode |
| ralph -p -t | Task detail display |
| ralph new --preset | Preset configuration |
| ralph new --builder-* | Builder options |
| ralph new --max-iterations | Loop options |

**Running CLI tests:**

```powershell
# Windows PowerShell (recommended)
.\test\cli\test-cli.ps1

# Linux/Mac/WSL
bash -c 'source test/cli/test-cli.sh'
```

## How It Works

1. Creates temporary test projects in `.projects/_test-*`
2. Generates `config.json` with proper `backend` and `auth_mode` fields
3. Runs agents in background with quick test prompt
4. Monitors for completion signals (file creation, promise detection)
5. Reports pass/fail/skip with recommendations
6. Cleans up test projects automatically

## Adding New Auth Modes

Create a new file in `test/auth/`:

```bash
# test/auth/myauth.sh
AUTH_NAME="My Auth Mode"
AUTH_ID="myauth"
AUTH_BACKEND="claude"  # Which backend to use

auth_prereqs() {
    if [[ -n "$MY_AUTH_TOKEN" ]]; then
        return 0
    fi
    PREREQ_MESSAGE="MY_AUTH_TOKEN not set"
    return 1
}

auth_setup() {
    :  # Optional setup
}
```

The test runner will automatically pick it up.

## Adding New Backends

Create a new file in `test/backends/`:

```bash
# test/backends/mybackend.sh
BACKEND_NAME="My Backend"
BACKEND_ID="mybackend"
BACKEND_COLOR='\033[0;35m'  # Magenta

backend_prereqs() {
    return 0  # Always available in container
}

backend_setup() {
    :  # Optional setup
}
```

## Options

### PowerShell

```powershell
.\test\test-all.ps1 -Timeout 90      # Custom timeout (seconds)
.\test\test-all.ps1 -SkipBuild       # Skip Docker image build
.\test\test-all.ps1 -Verbose         # Verbose output
```

### Bash

```bash
./test/test-all.sh 90                # Custom timeout (seconds)
SKIP_BUILD=true ./test/test-all.sh   # Skip Docker image build
VERBOSE=true ./test/test-all.sh      # Verbose output
```

## Output Example

```
+----------------------------------------------------------+
|              RALPH LOOP DOCKER TEST SUITE                |
+----------------------------------------------------------+
|        Timeout: 60s per agent test
|
| [PASS] Docker available
| [PASS] Docker Compose available
|        Building image (this may take a minute)...
| [PASS] Image build successful
| [PASS] Template directory exists
|
|        Running agent connection tests...
|
|        Testing Anthropic OAuth (claude backend, anthropic-oauth auth)...
| [PASS] Anthropic OAuth - Agent created test file
|        Testing GLM (z.ai) (claude backend, glm auth)...
| [SKIP] GLM (z.ai) - GLM_AUTH_TOKEN not set
|        Testing Anthropic API (claude backend, anthropic-api auth)...
| [SKIP] Anthropic API - ANTHROPIC_API_KEY not set
|        Testing Gemini OAuth (gemini backend, gemini-oauth auth)...
| [SKIP] Gemini OAuth - ~/.gemini not found
|        Testing OpenAI OAuth (codex backend, openai-oauth auth)...
| [SKIP] OpenAI OAuth - ~/.codex not found
+----------------------------------------------------------+
| SUMMARY: 4 passed, 0 failed, 5 skipped                   |
+----------------------------------------------------------+
| RECOMMENDATIONS:                                          |
| - GLM_AUTH_TOKEN not set - configure in .env for z.ai    |
| - ANTHROPIC_API_KEY not set - configure for direct API   |
| - ~/.gemini not found - run 'gemini' to login first      |
| - ~/.codex not found - run 'codex' to login first        |
+----------------------------------------------------------+
```

## Auth Mode Setup

### Anthropic OAuth (Recommended)

```bash
# On host machine
claude login
# Then run tests - credentials are mounted automatically
```

### GLM (z.ai)

```bash
# In .env file
GLM_AUTH_TOKEN=your-token
GLM_BASE_URL=https://api.z.ai/api/anthropic
```

### Anthropic API

```bash
# In .env file
ANTHROPIC_API_KEY=sk-ant-...
```

### Gemini OAuth

```bash
# On host machine - login via browser
gemini auth login
```

### OpenAI OAuth

```bash
# On host machine
codex  # Follow login prompts
```

### OpenAI API

```bash
# In .env file
OPENAI_API_KEY=sk-...
```

### OpenCode OAuth

```bash
# On host machine
opencode auth login
```

## Troubleshooting

### Docker not available

```bash
# Start Docker Desktop or daemon
systemctl start docker  # Linux
# Or open Docker Desktop on Windows/Mac
```

### Auth test fails

1. Check credentials exist on host
2. Verify `.env` file has correct values
3. Check Docker volume mounts in `docker-compose.yml`

### Timeout errors

Increase timeout for slow connections:

```bash
./test/test-all.sh 120  # 2 minute timeout
```

## Config.json Schema

Tests create `config.json` with the current schema:

```json
{
  "ralph": {
    "backend": "claude",
    "auth_mode": "anthropic-oauth",
    "max_iterations": 2,
    "completion_promise": "TEST PASSED"
  }
}
```

This matches the schema expected by `entrypoint.sh`.

## Auth Mode Reference

| Auth Mode | Credentials | Environment Variable |
|-----------|-------------|---------------------|
| `anthropic-oauth` | Host `~/.claude` | - |
| `anthropic-api` | API key | `ANTHROPIC_API_KEY` |
| `gemini-oauth` | Host `~/.gemini` | - |
| `gemini-api` | API key | `GEMINI_API_KEY` |
| `openai-oauth` | Host `~/.codex` | - |
| `openai-api` | API key | `OPENAI_API_KEY` |
| `opencode-oauth` | Host `~/.local/share/opencode` | - |
| `opencode-api` | API key | `OPENCODE_API_KEY` |
| `glm` | z.ai proxy | `GLM_AUTH_TOKEN` |
