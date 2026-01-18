---
name: docker-test
description: |
  Test Docker configurations. Use when user wants to:
  - TEST Docker setup ("test docker", "validate docker", "check docker")
  - VERIFY auth modes ("test auth", "check auth modes", "verify glm/anthropic/gemini")
  - DIAGNOSE issues ("docker not working", "container problems", "build failing")

  NOT for creating or running projects - use manage-project for that.
---

# Docker Test Skill

Automatically test all Ralph Loop Docker configurations and auth modes.

## Quick Test

```bash
# Linux/Mac
./test/test-all.sh

# Windows PowerShell
.\test\test-all.ps1
```

## Test Directory Structure

```
test/
├── test-all.sh              # Main runner (Bash)
├── test-all.ps1             # Main runner (PowerShell)
├── README.md                # Full documentation
├── lib/                     # Shared libraries
├── backends/                # Backend configs (claude, gemini, codex, opencode)
└── auth/                    # Auth mode configs (anthropic-oauth, glm, anthropic-api, etc.)
```

See `test/README.md` for full documentation on adding new auth modes and backends.

## What It Tests

| Test | Description |
|------|-------------|
| Docker available | Docker daemon running |
| Docker Compose | Compose v2 available |
| Image build | ralph-loop:latest builds |
| Template exists | template/.project/prompts/BUILDER.md present |
| anthropic-oauth | Host ~/.claude mounted |
| GLM auth | z.ai backend (requires GLM_AUTH_TOKEN) |
| anthropic-api | Direct API (requires ANTHROPIC_API_KEY) |
| gemini-oauth | Host ~/.gemini mounted |
| openai-oauth | Host ~/.codex or OPENAI_API_KEY |

## Options

```bash
# Custom timeout (seconds)
./test/test-all.sh 90

# Skip Docker image build
SKIP_BUILD=true ./test/test-all.sh

# PowerShell
.\test\test-all.ps1 -Timeout 90 -SkipBuild
```

## Manual Testing

Test specific auth mode:

```bash
# Build image
docker compose build

# Test anthropic-oauth (recommended)
RALPH_PROJECT_DIR=./.projects/_test RALPH_AUTH_MODE=anthropic-oauth docker compose run --rm ralph --version

# Test GLM
RALPH_PROJECT_DIR=./.projects/_test RALPH_AUTH_MODE=glm docker compose run --rm ralph --version
```

## Cleanup

Test projects are created in `.projects/_test-*` and cleaned up automatically.

Manual cleanup:
```bash
rm -rf .projects/_test-*
```
