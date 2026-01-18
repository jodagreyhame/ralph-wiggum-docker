#!/bin/bash
# Ralph Wiggum Docker Loop Entrypoint
# Project is mounted at /project, auth configs at /home/claude/.claude and /home/claude/.gemini
# Supports: Claude, Gemini, Codex via OAuth passthrough

set -euo pipefail

# Source shared environment utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/env.sh"

# If running as root, fix permissions then switch to claude user
if [ "$(id -u)" = "0" ]; then
    # Fix ownership of project directory (mounted from Windows as root)
    chown -R claude:claude /project 2>/dev/null || true

    # Create required directories (clean, no host files)
    mkdir -p /home/claude/.claude/{projects,debug,todos,statsig}
    mkdir -p /home/claude/.gemini/tmp
    mkdir -p /home/claude/.codex
    mkdir -p /home/claude/.config/opencode

    # Copy ONLY OAuth credentials from host mounts (not CLAUDE.md, skills, plugins, hooks)
    # Host directories are mounted read-only at /mnt/*-host
    if [[ -f /mnt/claude-host/.credentials.json ]]; then
        cp /mnt/claude-host/.credentials.json /home/claude/.claude/.credentials.json
        echo "  Copied Claude OAuth credentials"
    fi
    if [[ -f /mnt/gemini-host/oauth_creds.json ]]; then
        cp /mnt/gemini-host/oauth_creds.json /home/claude/.gemini/oauth_creds.json
        echo "  Copied Gemini OAuth credentials"
    fi
    if [[ -f /mnt/codex-host/auth.json ]]; then
        cp /mnt/codex-host/auth.json /home/claude/.codex/auth.json
        echo "  Copied Codex auth credentials"
    fi

    # Copy OpenCode auth and config from host mount if they exist
    # v1.1+ stores auth in ~/.local/share/opencode/auth.json
    # Config with plugin in ~/.config/opencode/opencode.json
    # Also need to create full directory structure for opencode to write to
    mkdir -p /home/claude/.local/share/opencode/{bin,log}
    if [[ -f /mnt/opencode-host/auth.json ]]; then
        cp /mnt/opencode-host/auth.json /home/claude/.local/share/opencode/auth.json
        echo "  Copied OpenCode auth credentials"
    fi
    if [[ -f /mnt/opencode-config/opencode.json ]]; then
        mkdir -p /home/claude/.config/opencode
        cp /mnt/opencode-config/opencode.json /home/claude/.config/opencode/opencode.json
        echo "  Copied OpenCode config with Antigravity plugin"
    else
        # Create default OpenCode config with Antigravity plugin
        mkdir -p /home/claude/.config/opencode
        cat > /home/claude/.config/opencode/opencode.json << 'OPENCODEJSON'
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-antigravity-auth@beta"],
  "provider": {
    "google": {
      "models": {
        "antigravity-gemini-3-pro": {
          "name": "Gemini 3 Pro (Antigravity)",
          "limit": { "context": 1048576, "output": 65535 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "antigravity-gemini-3-flash": {
          "name": "Gemini 3 Flash (Antigravity)",
          "limit": { "context": 1048576, "output": 65536 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "antigravity-claude-sonnet-4-5": {
          "name": "Claude Sonnet 4.5 (Antigravity)",
          "limit": { "context": 200000, "output": 64000 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "antigravity-claude-sonnet-4-5-thinking": {
          "name": "Claude Sonnet 4.5 Thinking (Antigravity)",
          "limit": { "context": 200000, "output": 64000 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "antigravity-claude-opus-4-5-thinking": {
          "name": "Claude Opus 4.5 Thinking (Antigravity)",
          "limit": { "context": 200000, "output": 64000 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        }
      }
    }
  }
}
OPENCODEJSON
        echo "  Created default OpenCode config with Antigravity plugin"
    fi

    # Create Claude settings.json with full permissions (container-specific)
    cat > /home/claude/.claude/settings.json << 'SETTINGSJSON'
{
  "permissions": {
    "allow": ["Bash(*)", "Read(*)", "Write(*)", "Edit(*)"]
  },
  "env": {
    "CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS": "100000",
    "MAX_MCP_OUTPUT_TOKENS": "100000",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
    "DO_NOT_TRACK": "1"
  }
}
SETTINGSJSON

    # Configure Gemini OAuth settings if needed
    if [[ -f /home/claude/.gemini/oauth_creds.json ]]; then
        cat > /home/claude/.gemini/settings.json << 'GEMINISETTINGS'
{
  "general": {
    "previewFeatures": true
  },
  "security": {
    "auth": {
      "selectedType": "oauth-personal"
    }
  }
}
GEMINISETTINGS
    fi

    # Fix all permissions
    chown -R claude:claude /home/claude/.claude
    chown -R claude:claude /home/claude/.gemini 2>/dev/null || true
    chown -R claude:claude /home/claude/.codex 2>/dev/null || true
    chown -R claude:claude /home/claude/.config 2>/dev/null || true
    chown -R claude:claude /home/claude/.local 2>/dev/null || true

    # Configure git safe directory for claude user (required for mounted volumes)
    mkdir -p /home/claude
    cat >> /home/claude/.gitconfig << 'GITCONFIG'
[safe]
    directory = /project
[user]
    email = ralph@docker.local
    name = Ralph Loop
GITCONFIG
    chown claude:claude /home/claude/.gitconfig

    # Re-run this script as claude user
    exec gosu claude "$0" "$@"
fi

# Now running as claude user

# Colors
BOLD='\033[1m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
DIM='\033[2m'
NC='\033[0m'

# Read configuration from /project/config.json
CONFIG_FILE="config.json"
if [[ -f "$CONFIG_FILE" ]]; then
    echo -e "${DIM}Reading configuration from $CONFIG_FILE${NC}"

    # Parse config using jq (no backwards compatibility)

    # Prompt paths
    PROMPTS_DIR=$(jq -r '.prompts.dir' "$CONFIG_FILE")
    GOAL_FILE=$(jq -r '.prompts.goal' "$CONFIG_FILE")
    BUILDER_PROMPT=$(jq -r '.prompts.builder' "$CONFIG_FILE")
    REVIEWER_PROMPT=$(jq -r '.prompts.reviewer' "$CONFIG_FILE")
    ARCHITECT_PROMPT=$(jq -r '.prompts.architect' "$CONFIG_FILE")

    # Builder configuration
    CLI=$(jq -r '.builder.backend' "$CONFIG_FILE")
    AUTH_MODE=$(jq -r '.builder.auth_mode' "$CONFIG_FILE")
    MODEL=$(jq -r '.builder.model' "$CONFIG_FILE")
    BUILDER_SESSION_MODE=$(jq -r '.builder.session_mode' "$CONFIG_FILE")

    # Reviewer configuration
    REVIEWER_ENABLED=$(jq -r '.reviewer.enabled' "$CONFIG_FILE")
    REVIEWER_BACKEND=$(jq -r '.reviewer.backend' "$CONFIG_FILE")
    REVIEWER_AUTH_MODE=$(jq -r '.reviewer.auth_mode' "$CONFIG_FILE")
    REVIEWER_MODEL=$(jq -r '.reviewer.model' "$CONFIG_FILE")
    REVIEWER_SESSION_MODE=$(jq -r '.reviewer.session_mode' "$CONFIG_FILE")

    # Architect configuration
    ARCHITECT_ENABLED=$(jq -r '.architect.enabled' "$CONFIG_FILE")
    ARCHITECT_BACKEND=$(jq -r '.architect.backend' "$CONFIG_FILE")
    ARCHITECT_AUTH_MODE=$(jq -r '.architect.auth_mode' "$CONFIG_FILE")
    ARCHITECT_MODEL=$(jq -r '.architect.model' "$CONFIG_FILE")
    ARCHITECT_SESSION_MODE=$(jq -r '.architect.session_mode' "$CONFIG_FILE")

    # Escalation configuration
    ESCALATION_ENABLED=$(jq -r '.escalation.enabled' "$CONFIG_FILE")
    ESCALATION_MAX_FAILURES=$(jq -r '.escalation.max_builder_failures' "$CONFIG_FILE")

    # Provider fallback configuration
    PROVIDER_FALLBACK_ENABLED=$(jq -r '.provider_fallback.enabled // false' "$CONFIG_FILE")
    PROVIDER_FAILURE_THRESHOLD=$(jq -r '.provider_fallback.failure_threshold // 10' "$CONFIG_FILE")
    PROVIDER_FALLBACK_SEQUENCE=$(jq -c '.provider_fallback.sequence // ["claude","gemini","codex"]' "$CONFIG_FILE")
    PROVIDER_FALLBACK_AUTH_MODES=$(jq -c '.provider_fallback.auth_modes // {}' "$CONFIG_FILE")

    # Loop settings
    MAX_ITERATIONS=$(jq -r '.max_iterations' "$CONFIG_FILE")
    COMPLETION_ENABLED=$(jq -r '.completion_enabled' "$CONFIG_FILE")

    # API overrides (optional - null if not set)
    API_KEY=$(jq -r '.builder.api_key // empty' "$CONFIG_FILE")
    API_BASE_URL=$(jq -r '.builder.api_base_url // empty' "$CONFIG_FILE")

    # Handle auth modes - each mode sets CLI and configures environment
    case "$AUTH_MODE" in
        anthropic-oauth)
            CLI="claude"
            clear_glm_env
            apply_model "claude" "$MODEL"
            [[ -n "$MODEL" ]] && echo -e "  ${DIM}Model: $MODEL${NC}"
            echo -e "  ${DIM}Auth: anthropic-oauth (host ~/.claude)${NC}"
            ;;
        anthropic-api)
            CLI="claude"
            clear_glm_env
            apply_model "claude" "$MODEL"
            [[ -n "$MODEL" ]] && echo -e "  ${DIM}Model: $MODEL${NC}"
            if [[ -n "$API_KEY" ]]; then
                export ANTHROPIC_API_KEY="$API_KEY"
            fi
            if [[ -n "$API_BASE_URL" ]]; then
                export ANTHROPIC_BASE_URL="$API_BASE_URL"
            fi
            echo -e "  ${DIM}Auth: anthropic-api (API key)${NC}"
            ;;
        gemini-oauth)
            CLI="gemini"
            clear_glm_env
            echo -e "  ${DIM}Auth: gemini-oauth (host ~/.gemini)${NC}"
            ;;
        gemini-api)
            CLI="gemini"
            clear_glm_env
            if [[ -n "$API_KEY" ]]; then
                export GEMINI_API_KEY="$API_KEY"
            fi
            echo -e "  ${DIM}Auth: gemini-api (API key)${NC}"
            ;;
        openai-oauth)
            CLI="codex"
            clear_glm_env
            echo -e "  ${DIM}Auth: openai-oauth (host ~/.codex)${NC}"
            ;;
        openai-api)
            CLI="codex"
            clear_glm_env
            if [[ -n "$API_KEY" ]]; then
                export OPENAI_API_KEY="$API_KEY"
            fi
            echo -e "  ${DIM}Auth: openai-api (API key)${NC}"
            ;;
        opencode-oauth)
            CLI="opencode"
            clear_glm_env
            echo -e "  ${DIM}Auth: opencode-oauth (host ~/.local/share/opencode)${NC}"
            ;;
        opencode-api)
            CLI="opencode"
            clear_glm_env
            echo -e "  ${DIM}Auth: opencode-api (API key)${NC}"
            ;;
        glm)
            CLI="claude"
            export ANTHROPIC_BASE_URL="${GLM_BASE_URL:-https://api.z.ai/api/anthropic}"
            if [[ -n "${GLM_AUTH_TOKEN:-}" ]]; then
                export ANTHROPIC_AUTH_TOKEN="$GLM_AUTH_TOKEN"
            fi
            export ANTHROPIC_DEFAULT_SONNET_MODEL="${GLM_MODEL:-glm-4.7}"
            export ANTHROPIC_DEFAULT_OPUS_MODEL="${GLM_MODEL:-glm-4.7}"
            export ANTHROPIC_DEFAULT_HAIKU_MODEL="${GLM_MODEL:-glm-4.7}"
            echo -e "  ${DIM}Auth: glm (z.ai proxy)${NC}"
            ;;
        *)
            echo -e "  ${YELLOW}Unknown auth_mode: $AUTH_MODE, defaulting to glm${NC}"
            AUTH_MODE="glm"
            CLI="claude"
            export ANTHROPIC_BASE_URL="${GLM_BASE_URL:-https://api.z.ai/api/anthropic}"
            if [[ -n "${GLM_AUTH_TOKEN:-}" ]]; then
                export ANTHROPIC_AUTH_TOKEN="$GLM_AUTH_TOKEN"
            fi
            export ANTHROPIC_DEFAULT_SONNET_MODEL="${GLM_MODEL:-glm-4.7}"
            export ANTHROPIC_DEFAULT_OPUS_MODEL="${GLM_MODEL:-glm-4.7}"
            export ANTHROPIC_DEFAULT_HAIKU_MODEL="${GLM_MODEL:-glm-4.7}"
            ;;
    esac
else
    echo -e "${YELLOW}No config file found at $CONFIG_FILE${NC}"
    echo -e "${DIM}Using defaults: CLI=claude, max_iterations=100${NC}"
    CLI="claude"
    MAX_ITERATIONS=100
fi

# Export prompt paths
export RALPH_PROMPTS_DIR="$PROMPTS_DIR"
export RALPH_GOAL_FILE="$GOAL_FILE"
export RALPH_PROMPT_FILE="${PROMPTS_DIR}/${BUILDER_PROMPT}"
export RALPH_REVIEWER_PROMPT_FILE="${PROMPTS_DIR}/${REVIEWER_PROMPT}"
export RALPH_ARCHITECT_PROMPT_FILE="${PROMPTS_DIR}/${ARCHITECT_PROMPT}"

# Export settings for ralph scripts
export RALPH_MAX_ITERATIONS="$MAX_ITERATIONS"
export RALPH_COMPLETION_ENABLED="$COMPLETION_ENABLED"
export RALPH_PROJECT_NAME="${RALPH_PROJECT_NAME:-PROJECT}"
export RALPH_LOG_DIR="${RALPH_LOG_DIR:-logs}"

# Export builder settings
export RALPH_BUILDER_BACKEND="$CLI"
export RALPH_BUILDER_AUTH_MODE="$AUTH_MODE"
export RALPH_BUILDER_MODEL="$MODEL"
export RALPH_BUILDER_SESSION_MODE="$BUILDER_SESSION_MODE"

# Export reviewer settings
export RALPH_REVIEWER_ENABLED="$REVIEWER_ENABLED"
export RALPH_REVIEWER_BACKEND="$REVIEWER_BACKEND"
export RALPH_REVIEWER_AUTH_MODE="$REVIEWER_AUTH_MODE"
export RALPH_REVIEWER_MODEL="$REVIEWER_MODEL"
export RALPH_REVIEWER_SESSION_MODE="$REVIEWER_SESSION_MODE"

# Export architect settings
export RALPH_ARCHITECT_ENABLED="$ARCHITECT_ENABLED"
export RALPH_ARCHITECT_BACKEND="$ARCHITECT_BACKEND"
export RALPH_ARCHITECT_AUTH_MODE="$ARCHITECT_AUTH_MODE"
export RALPH_ARCHITECT_MODEL="$ARCHITECT_MODEL"
export RALPH_ARCHITECT_SESSION_MODE="$ARCHITECT_SESSION_MODE"

# Export escalation settings
export RALPH_ESCALATION_ENABLED="$ESCALATION_ENABLED"
export RALPH_ESCALATION_MAX_FAILURES="$ESCALATION_MAX_FAILURES"

# Export provider fallback settings
export RALPH_PROVIDER_FALLBACK_ENABLED="$PROVIDER_FALLBACK_ENABLED"
export RALPH_PROVIDER_FAILURE_THRESHOLD="$PROVIDER_FAILURE_THRESHOLD"
export RALPH_PROVIDER_FALLBACK_SEQUENCE="$PROVIDER_FALLBACK_SEQUENCE"
export RALPH_PROVIDER_FALLBACK_AUTH_MODES="$PROVIDER_FALLBACK_AUTH_MODES"

# Check if builder prompt exists
if [[ ! -f "$RALPH_PROMPT_FILE" ]]; then
    echo ""
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║${NC}  ${BOLD}$RALPH_PROJECT_NAME${NC} - No Prompt Found"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  Expected: ${CYAN}$RALPH_PROMPT_FILE${NC}"
    echo ""
    echo "  Your project needs:"
    echo "    - GOAL.md in project root (project objective)"
    echo "    - .project/prompts/BUILDER.md (builder workflow)"
    echo ""
    echo -e "  ${DIM}Falling back to interactive mode...${NC}"
    echo ""

    # Fall back to interactive mode based on CLI
    case "$CLI" in
        gemini)
            exec gemini
            ;;
        codex)
            exec codex
            ;;
        opencode)
            exec opencode
            ;;
        *)
            exec claude --dangerously-skip-permissions
            ;;
    esac
fi

# Run the unified ralph.sh with CLI type
# CLI configs are in /cli/<cli>.sh (claude, gemini, codex, opencode, etc.)
echo -e "${GREEN}Starting Ralph Loop with CLI: ${BOLD}$CLI${NC}"

# Normalize CLI name for config lookup
CLI_TYPE="$CLI"
case "$CLI" in
    zai) CLI_TYPE="claude" ;;  # Z.AI uses Claude backend
esac

# Check if CLI config exists
if [[ ! -f "/ralph/cli/${CLI_TYPE}.sh" ]]; then
    echo -e "${RED}ERROR: Unknown CLI: $CLI_TYPE${NC}"
    echo "Available CLIs:"
    ls -1 /ralph/cli/*.sh 2>/dev/null | xargs -I{} basename {} .sh || echo "  (none)"
    exit 1
fi

exec /ralph.sh "$CLI_TYPE"
