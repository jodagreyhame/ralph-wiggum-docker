# Troubleshooting Guide

Ralph Loop Docker uses **passthrough authentication** - it mounts your local auth configs into the container. You must install and authenticate each CLI on your host machine first.

---

## CLI Installation

### Claude CLI (Anthropic)

```bash
# Install via npm
npm install -g @anthropic-ai/claude-code

# Authenticate (opens browser for OAuth)
claude login
```

**Auth location:** `~/.claude/`

**Verify:**
```bash
claude --version
```

### Gemini CLI (Google)

```bash
# Install via npm
npm install -g @anthropic-ai/gemini-cli
```

**Authenticate:**
```bash
gemini auth
```

**Auth location:** `~/.gemini/`

**Verify:**
```bash
gemini --version
```

### Codex CLI (OpenAI)

```bash
# Install via npm
npm install -g @openai/codex

# Authenticate (opens browser for OAuth)
codex auth
```

**Or use API key directly:**
```bash
export OPENAI_API_KEY=sk-...
```

**Auth location:** `~/.codex/` (contains `auth.json` and `config.toml`)

**Verify:**
```bash
codex --version
```

---

## Common Errors

### 401 Unauthorized

**Symptom:**
```
Missing bearer or basic authentication in header
```

**Cause:** CLI not authenticated on host machine.

**Fix:** Run the appropriate auth command:
```bash
claude login    # For Claude
gemini auth     # For Gemini
codex auth      # For Codex
```

### Read-only file system

**Symptom:**
```
/home/claude/.claude/settings.json: Read-only file system
```

**Cause:** Auth volumes mounted as read-only.

**Fix:** Ensure docker-compose.yml has writable auth mounts (no `:ro`):
```yaml
volumes:
  - ${CLAUDE_CONFIG_PATH:-~/.claude}:/home/claude/.claude
  - ${GEMINI_CONFIG_PATH:-~/.gemini}:/home/claude/.gemini
```

### Unknown option '---'

**Symptom:**
```
error: unknown option '---
model: sonnet
```

**Cause:** YAML frontmatter in BUILDER_PROMPT.md being parsed as CLI arguments.

**Fix:** Update ralph.sh/ralph-gemini.sh/ralph-codex.sh to use stdin:
```bash
# Wrong
OUTPUT=$(claude -p "$PROMPT" ...)

# Correct
OUTPUT=$(echo "$PROMPT" | claude ...)
```

### Config directory not found

**Symptom:**
```
~/.claude not found
~/.gemini not found
```

**Cause:** CLI not installed or never authenticated.

**Fix:** Install and authenticate the CLI (see Installation section above).

### Permission denied on auth files

**Symptom:**
```
Permission denied: /home/claude/.claude/credentials.json
```

**Cause:** File permissions mismatch between host and container user.

**Fix:** Check host file permissions:
```bash
# Linux/Mac
chmod 600 ~/.claude/*
chmod 700 ~/.claude

# Or fix ownership
sudo chown -R $USER:$USER ~/.claude
```

---

## Auth Modes

See [README.md](../README.md#configuration) for the full auth modes reference.

**Quick reference:** Set via `RALPH_AUTH_MODE=<mode>` in `.env` or command line.

| Mode | Auth Source |
|------|-------------|
| `anthropic-oauth` | Host `~/.claude` |
| `gemini-oauth` | Host `~/.gemini` |
| `openai-oauth` | Host `~/.codex` |
| `*-api` | Direct API key |
| `glm` | z.ai proxy (default) |

---

## 3-Tier Review System Issues

### Reviewer/Architect not running

**Symptom:** Only builder runs, no reviewer or architect phases appear.

**Cause:** Review phases not enabled in config.json.

**Fix:** Enable in your project's `config.json`:
```json
{
  "reviewer": {
    "enabled": true,
    "backend": "claude",
    "auth_mode": "anthropic-oauth"
  },
  "architect": {
    "enabled": true,
    "backend": "gemini",
    "auth_mode": "gemini-oauth"
  }
}
```

### Reviewer/Architect auth failures

**Symptom:**
```
401 Unauthorized during REVIEWER PHASE
```

**Cause:** Different auth mode needed for reviewer/architect than builder.

**Fix:** Each role can use a different auth mode. Ensure the CLI is authenticated for that mode:
- If reviewer uses `anthropic-oauth`: Run `claude login` on host
- If architect uses `gemini-oauth`: Run `gemini auth` on host

### GLM environment pollution

**Symptom:** Reviewer/Architect trying to use GLM instead of their configured auth.

**Cause:** GLM environment variables persisting when switching roles.

**What happens:** The system should automatically clear these when switching:
- `ANTHROPIC_AUTH_TOKEN`
- `ANTHROPIC_BASE_URL`
- `ANTHROPIC_DEFAULT_*_MODEL`

**Fix:** Check `docker/lib/phases.sh` has `clear_glm_env()` function being called in `apply_auth_mode()`.

### Completion signal not working with review

**Symptom:** Builder writes `COMPLETE` but loop doesn't stop.

**Cause:** With reviewer/architect enabled, completion requires approval.

**Expected behavior:**
- **Reviewer-only mode**: Reviewer must PASS for completion
- **Full 3-tier mode**: Architect must APPROVE for completion
- On FAIL/REJECT, the completion file is automatically cleared

**Fix:** Check reviewer/architect logs:
```bash
cat logs/iteration_XXX/reviewer.live
cat logs/iteration_XXX/architect.live
```

### Escalation not triggering

**Symptom:** Builder keeps failing but roles don't escalate.

**Cause:** Escalation not enabled or failure count not reached.

**Fix:** Check config.json:
```json
{
  "escalation": {
    "enabled": true,
    "max_builder_failures": 3
  }
}
```

Check escalation state:
```bash
cat .project/state/escalation.json
```

### Decision files not being created

**Symptom:** Reviewer/Architect runs but no decision.txt appears.

**Cause:** The reviewer/architect prompt may not be clear enough.

**Fix:** Check your REVIEWER.md and ARCHITECT.md prompts include clear instructions:
```bash
# Reviewer should write:
echo "PASS" > .project/review/decision.txt
# or
echo "FAIL" > .project/review/decision.txt

# Architect should write:
echo "APPROVE" > .project/architect/decision.txt
# or
echo "REJECT" > .project/architect/decision.txt
```

---

## File-Based Signaling

See [README.md](../README.md#file-based-communication) for the complete reference.

**Quick reference:**

| Signal | File | Values |
|--------|------|--------|
| Completion | `.project/state/completion.txt` | `COMPLETE` |
| Review | `.project/review/decision.txt` | `PASS` / `FAIL` |
| Architect | `.project/architect/decision.txt` | `APPROVE` / `REJECT` |
| Blocked | `BLOCKED.md` | (any content) |

---

## Verifying Auth Inside Container

```bash
# Start interactive shell in container
docker compose run --rm --entrypoint bash ralph

# Check auth files exist
ls -la /home/claude/.claude/
ls -la /home/claude/.gemini/
ls -la /home/claude/.codex/

# Test CLI directly
claude --version
gemini --version
codex --version
```

---

## Environment Variables

See [README.md](../README.md#environment-variables) for the complete reference.

**API Keys by auth mode:**

| Mode | Required Variable |
|------|-------------------|
| `glm` | (none - pre-configured) |
| `anthropic-api` | `ANTHROPIC_API_KEY` |
| `gemini-api` | `GEMINI_API_KEY` |
| `openai-api` | `OPENAI_API_KEY` |
| `*-oauth` | (none - uses host config) |

---

## Docker Issues

### Image not building

```bash
# Clean rebuild
docker compose build --no-cache
```

### Container won't start

```bash
# Check logs
docker compose logs ralph

# Run with verbose output
docker compose run --rm ralph bash -c "env && ls -la /project"
```

### Volume mount issues

```bash
# Verify paths exist on host
ls -la ~/.claude
ls -la ~/.gemini

# Check Docker has access (Docker Desktop settings)
# Settings > Resources > File Sharing
```

---

## Quick Diagnostic

```bash
./test/test-all.sh      # Linux/Mac
.\test\test-all.ps1     # Windows
```

Tests Docker, image build, volume mounts, all auth modes, and 3-tier configuration.
