#!/bin/bash
# run.sh - Primary launcher for Ralph Loop projects
#
# Purpose: Config-driven launcher that reads config.json and starts Docker container
# Called by: ralph run <project>
#
# Reads configuration from .projects/{project}/config.json and starts the Docker container
# with the appropriate CLI and settings.
#
# Usage:
#   ./scripts/run.sh <project-name>
#   ./scripts/run.sh <project-name> --build    # Force rebuild
#   ./scripts/run.sh <project-name> --shell    # Open shell instead of running loop

set -euo pipefail

# Change to project root
cd "$(dirname "$0")/.."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# Check for project name
if [[ $# -lt 1 ]]; then
    echo -e "${RED}ERROR: Project name required${NC}"
    echo -e "${DIM}Usage: ./scripts/run.sh <project-name> [--build] [--shell]${NC}"
    echo ""
    # List available projects
    if [[ -d ".projects" ]]; then
        echo -e "${DIM}Available projects:${NC}"
        for dir in .projects/*/; do
            if [[ -f "${dir}config.json" ]]; then
                echo -e "  - $(basename "$dir")"
            fi
        done
    fi
    exit 1
fi

PROJECT_NAME="$1"
shift

PROJECT_DIR=".projects/$PROJECT_NAME"
CONFIG_FILE="$PROJECT_DIR/config.json"

# Check for config
if [[ ! -f "$CONFIG_FILE" ]]; then
    echo -e "${RED}ERROR: Project not found: $PROJECT_NAME${NC}"
    echo -e "${DIM}Run 'ralph new $PROJECT_NAME' first to create it.${NC}"
    exit 1
fi

# Parse config with jq (supports both flat and nested .ralph format)
CLI=$(jq -r '.ralph.cli // .ralph.backend // .cli // .backend // "claude"' "$CONFIG_FILE")
AUTH_MODE=$(jq -r '.ralph.auth_mode // .auth_mode // "glm"' "$CONFIG_FILE")
MAX_ITERATIONS=$(jq -r '.ralph.max_iterations // .max_iterations // 100' "$CONFIG_FILE")
MODEL=$(jq -r '.ralph.model // .model // ""' "$CONFIG_FILE")
API_KEY=$(jq -r '.ralph.api_key // .api_key // ""' "$CONFIG_FILE")
API_BASE_URL=$(jq -r '.ralph.api_base_url // .api_base_url // ""' "$CONFIG_FILE")

# Parse arguments
BUILD_FLAG=""
SHELL_MODE=false
for arg in "$@"; do
    case $arg in
        --build)
            BUILD_FLAG="--build"
            ;;
        --shell)
            SHELL_MODE=true
            ;;
    esac
done

# Banner
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  ${BOLD}${MAGENTA}RALPH WIGGUM DOCKER LOOP${NC}                                ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  ${DIM}Worker: $PROJECT_NAME${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${DIM}Project:${NC}        ${GREEN}$PROJECT_NAME${NC}"
echo -e "  ${DIM}CLI:${NC}            ${GREEN}$CLI${NC}"
echo -e "  ${DIM}Auth Mode:${NC}      ${GREEN}$AUTH_MODE${NC}"
echo -e "  ${DIM}Max Iterations:${NC} ${GREEN}$MAX_ITERATIONS${NC}"
if [[ -n "$MODEL" ]]; then
    echo -e "  ${DIM}Model:${NC}          ${GREEN}$MODEL${NC}"
fi
echo ""

# Build environment variables
export RALPH_AUTH_MODE="$AUTH_MODE"
export RALPH_MAX_ITERATIONS="$MAX_ITERATIONS"
export RALPH_PROJECT_NAME="$PROJECT_NAME"
export RALPH_PROMPT_FILE=".project/prompts/BUILDER.md"
export RALPH_PROJECT_DIR="$PROJECT_DIR"

# Set API keys based on auth mode (any mode ending in -api)
case "$AUTH_MODE" in
    *-api)
        case "$AUTH_MODE" in
            anthropic-api)
                export ANTHROPIC_API_KEY="$API_KEY"
                ;;
            gemini-api)
                export GEMINI_API_KEY="$API_KEY"
                ;;
            openai-api)
                export OPENAI_API_KEY="$API_KEY"
                ;;
            opencode-api)
                export OPENCODE_API_KEY="$API_KEY"
                ;;
        esac
        ;;
    glm)
        if [[ -n "$API_BASE_URL" ]]; then
            export GLM_BASE_URL="$API_BASE_URL"
        fi
        ;;
esac

# Set auth paths based on auth mode (for OAuth modes)
case "$AUTH_MODE" in
    anthropic-oauth)
        export CLAUDE_AUTH_PATH="${HOME}/.claude"
        ;;
    gemini-oauth)
        export GEMINI_AUTH_PATH="${HOME}/.gemini"
        ;;
    openai-oauth)
        export CODEX_AUTH_PATH="${HOME}/.codex"
        ;;
    opencode-oauth)
        export OPENCODE_AUTH_PATH="${HOME}/.local/share/opencode"
        ;;
    glm)
        # GLM uses z.ai proxy, no local auth needed
        export CLAUDE_AUTH_PATH="${HOME}/.claude"
        ;;
esac

# Build if needed
if [[ -n "$BUILD_FLAG" ]]; then
    echo -e "${CYAN}Building Docker image...${NC}"
    docker compose build
    echo ""
fi

# Run
if [[ "$SHELL_MODE" == true ]]; then
    echo -e "${YELLOW}Opening shell in container...${NC}"
    docker compose run --rm ralph /bin/bash
else
    echo -e "${GREEN}Starting Ralph Worker...${NC}"
    echo -e "${DIM}Press Ctrl+C to stop${NC}"
    echo ""
    docker compose run --rm ralph
fi
