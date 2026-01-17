#!/bin/bash
# watch.sh - Follow Ralph Loop logs in real-time
#
# Usage:
#   watch.sh <project>                   # Follow current iteration
#   watch.sh <project> -i 3              # Follow specific iteration
#   watch.sh <project> --session         # Follow session.log
#   watch.sh <project> -f "error"        # Filter output

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

# Defaults
PROJECT=""
ITERATION=""
FILTER=""
SESSION=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -i|--iteration)
            ITERATION="$2"
            shift 2
            ;;
        -f|--filter)
            FILTER="$2"
            shift 2
            ;;
        --session)
            SESSION=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 <project> [options]"
            echo ""
            echo "Options:"
            echo "  -i, --iteration N    Follow specific iteration"
            echo "  -f, --filter TERM    Filter output by pattern"
            echo "  --session            Follow session.log instead of current.log"
            echo "  -h, --help           Show this help"
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
    echo "Usage: $0 <project> [options]"
    exit 1
fi

# Get project root (4 levels up from scripts)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
cd "$PROJECT_ROOT"

PROJECT_DIR=".projects/$PROJECT"
LOGS_DIR="$PROJECT_DIR/logs"

# Verify project exists
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}ERROR: Project not found: $PROJECT${NC}"
    echo -e "${DIM}Location checked: $PROJECT_DIR${NC}"
    exit 1
fi

# Determine which log file to follow
if [ "$SESSION" = true ]; then
    LOG_FILE="$LOGS_DIR/session.log"
    echo -e "${CYAN}Following session log: $LOG_FILE${NC}"
elif [ -n "$ITERATION" ]; then
    LOG_FILE=$(printf "$LOGS_DIR/iteration_%03d/output.live" "$ITERATION")
    echo -e "${CYAN}Following iteration $ITERATION: $LOG_FILE${NC}"
else
    LOG_FILE="$LOGS_DIR/current.log"
    echo -e "${CYAN}Following current iteration: $LOG_FILE${NC}"
fi

# Check if log file exists
if [ ! -f "$LOG_FILE" ] && [ ! -L "$LOG_FILE" ]; then
    echo -e "${YELLOW}Log file not found yet: $LOG_FILE${NC}"
    echo -e "${DIM}Waiting for log file to be created...${NC}"

    # Wait for file to appear
    while [ ! -f "$LOG_FILE" ] && [ ! -L "$LOG_FILE" ]; do
        sleep 1
    done

    echo -e "${GREEN}Log file created, starting to follow...${NC}"
fi

echo -e "${DIM}Press Ctrl+C to stop${NC}"
echo ""

# Follow the log
if [ -n "$FILTER" ]; then
    echo -e "${DIM}Filtering for: $FILTER${NC}"
    echo ""
    tail -f "$LOG_FILE" 2>/dev/null | grep --line-buffered "$FILTER"
else
    tail -f "$LOG_FILE" 2>/dev/null
fi
