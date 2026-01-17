#!/bin/bash
# stop.sh - Stop a running Ralph Loop worker
#
# Usage:
#   .claude/skills/orchestrator/scripts/stop.sh <project-name>
#   .claude/skills/orchestrator/scripts/stop.sh --all

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
DIM='\033[2m'
NC='\033[0m'

ALL=false
PROJECT=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --all|-a)
            ALL=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 <project-name>"
            echo "       $0 --all"
            exit 0
            ;;
        *)
            PROJECT="$1"
            shift
            ;;
    esac
done

if [ "$ALL" = true ]; then
    echo -e "${YELLOW}Stopping all Ralph containers...${NC}"

    CONTAINERS=$(docker ps --filter "name=ralph-wiggum-docker-loop-ralph" --format "{{.ID}} {{.Names}}" 2>/dev/null)

    if [ -z "$CONTAINERS" ]; then
        echo -e "${DIM}No running Ralph containers found.${NC}"
        exit 0
    fi

    echo "$CONTAINERS" | while read -r line; do
        if [ -n "$line" ]; then
            ID=$(echo "$line" | cut -d' ' -f1)
            NAME=$(echo "$line" | cut -d' ' -f2)
            echo -e "${CYAN}Stopping $NAME...${NC}"
            docker stop "$ID" > /dev/null
        fi
    done

    echo -e "${GREEN}All containers stopped.${NC}"
else
    if [ -z "$PROJECT" ]; then
        echo -e "${RED}ERROR: Project name required (or use --all)${NC}"
        echo -e "${DIM}Usage: $0 <project-name>${NC}"
        echo -e "${DIM}       $0 --all${NC}"
        exit 1
    fi

    CONTAINER=$(docker ps --filter "name=ralph-$PROJECT" --format "{{.ID}}" 2>/dev/null | head -1)

    if [ -z "$CONTAINER" ]; then
        echo -e "${YELLOW}No running container found for project: $PROJECT${NC}"
        exit 0
    fi

    echo -e "${CYAN}Stopping container for $PROJECT...${NC}"
    docker stop "$CONTAINER" > /dev/null
    echo -e "${GREEN}Stopped.${NC}"
fi
