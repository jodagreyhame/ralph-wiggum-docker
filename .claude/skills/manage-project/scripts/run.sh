#!/bin/bash
# run.sh - Skill launcher for Ralph Loop projects (flag-driven)
#
# Purpose: Claude Code skill launcher with CLI flag support
# Called by: Claude Code manage-project skill invocation
# Features: --background, --unlimited, --auth, --iterations flags
#
# Note: This launcher does NOT read config.json - it uses CLI flags instead.
#       For config-driven launching, use scripts/run.sh
#
# Usage:
#   .claude/skills/manage-project/scripts/run.sh <project-name>
#   .claude/skills/manage-project/scripts/run.sh <project-name> --background
#   .claude/skills/manage-project/scripts/run.sh <project-name> --unlimited
#   .claude/skills/manage-project/scripts/run.sh <project-name> --auth anthropic-oauth
#
# Examples:
#   ./run.sh ralph-cli
#   ./run.sh ralph-cli --background --unlimited

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
DIM='\033[2m'
NC='\033[0m' # No Color

# Defaults
BACKGROUND=false
UNLIMITED=false
AUTH_MODE="glm"
MAX_ITERATIONS=100

# Parse arguments
PROJECT=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --background|-b)
            BACKGROUND=true
            shift
            ;;
        --unlimited|-u)
            UNLIMITED=true
            shift
            ;;
        --auth|-a)
            AUTH_MODE="$2"
            shift 2
            ;;
        --iterations|-i)
            MAX_ITERATIONS="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 <project-name> [options]"
            echo ""
            echo "Options:"
            echo "  --background, -b    Run in background (detached)"
            echo "  --unlimited, -u     Run with unlimited iterations"
            echo "  --auth, -a MODE     Auth mode (default: glm)"
            echo "                      - anthropic-oauth: Host ~/.claude OAuth"
            echo "                      - anthropic-api: ANTHROPIC_API_KEY"
            echo "                      - gemini-oauth: Host ~/.gemini OAuth"
            echo "                      - gemini-api: GEMINI_API_KEY"
            echo "                      - openai-oauth: Host ~/.codex OAuth"
            echo "                      - openai-api: OPENAI_API_KEY"
            echo "                      - opencode-oauth: Host ~/.local/share/opencode"
            echo "                      - opencode-api: OPENCODE_API_KEY"
            echo "                      - glm: z.ai proxy"
            echo "  --iterations, -i N  Max iterations (default: 100, ignored if --unlimited)"
            echo "  --help, -h          Show this help"
            exit 0
            ;;
        -*)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
        *)
            PROJECT="$1"
            shift
            ;;
    esac
done

# Check project name
if [ -z "$PROJECT" ]; then
    echo -e "${RED}ERROR: Project name required${NC}"
    echo "Usage: $0 <project-name> [options]"
    exit 1
fi

# Get script directory and project root
# scripts -> manage-project -> skills -> .claude -> PROJECT_ROOT (3 levels up)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$PROJECT_ROOT"

PROJECT_DIR="./.projects/$PROJECT"

# Verify project exists
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}ERROR: Project not found: $PROJECT${NC}"
    echo -e "${DIM}Location checked: $PROJECT_DIR${NC}"
    echo ""

    # List available projects
    if [ -d ".projects" ]; then
        echo -e "${YELLOW}Available projects:${NC}"
        for dir in .projects/*/; do
            [ -d "$dir" ] && echo -e "  - ${CYAN}$(basename "$dir")${NC}"
        done
    fi
    exit 1
fi

# Set iterations
if [ "$UNLIMITED" = true ]; then
    ITERATIONS=0
else
    ITERATIONS=$MAX_ITERATIONS
fi

# Banner
echo ""
echo -e "${CYAN}============================================================${NC}"
echo -e "  ${MAGENTA}RALPH WIGGUM DOCKER LOOP${NC}"
echo -e "${CYAN}============================================================${NC}"
echo ""
echo -e "  ${DIM}Project:${NC}    ${GREEN}$PROJECT${NC}"
echo -e "  ${DIM}Auth Mode:${NC}  ${GREEN}$AUTH_MODE${NC}"
if [ "$UNLIMITED" = true ]; then
    echo -e "  ${DIM}Iterations:${NC} ${YELLOW}unlimited${NC}"
else
    echo -e "  ${DIM}Iterations:${NC} ${GREEN}$ITERATIONS${NC}"
fi
echo -e "  ${DIM}Background:${NC} ${GREEN}$BACKGROUND${NC}"
echo ""

# Build docker compose command
DOCKER_ARGS="compose run --rm"
if [ "$BACKGROUND" = true ]; then
    DOCKER_ARGS="$DOCKER_ARGS -d"
fi
DOCKER_ARGS="$DOCKER_ARGS ralph"

# Run with environment variables inline (proper way for docker-compose substitution)
if [ "$BACKGROUND" = true ]; then
    echo -e "${GREEN}Starting in background...${NC}"
    CONTAINER_ID=$(RALPH_PROJECT_DIR="$PROJECT_DIR" \
                   RALPH_PROJECT_NAME="$PROJECT" \
                   RALPH_AUTH_MODE="$AUTH_MODE" \
                   RALPH_MAX_ITERATIONS="$ITERATIONS" \
                   docker $DOCKER_ARGS)
    echo ""
    echo -e "${CYAN}Container ID: $CONTAINER_ID${NC}"
    echo ""
    echo -e "${DIM}To view logs:  docker logs -f ${CONTAINER_ID:0:12}${NC}"
    echo -e "${DIM}To stop:       docker stop ${CONTAINER_ID:0:12}${NC}"
else
    echo -e "${GREEN}Starting Ralph Loop...${NC}"
    echo -e "${DIM}Press Ctrl+C to stop${NC}"
    echo ""
    RALPH_PROJECT_DIR="$PROJECT_DIR" \
    RALPH_PROJECT_NAME="$PROJECT" \
    RALPH_AUTH_MODE="$AUTH_MODE" \
    RALPH_MAX_ITERATIONS="$ITERATIONS" \
    docker $DOCKER_ARGS
fi
