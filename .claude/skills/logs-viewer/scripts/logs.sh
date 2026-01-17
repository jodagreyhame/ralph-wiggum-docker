#!/bin/bash
# logs.sh - View and analyze Ralph Loop iteration logs
#
# Usage:
#   logs.sh <project>                    # List all iterations
#   logs.sh <project> -i 3               # View iteration 3
#   logs.sh <project> -i latest          # View latest iteration
#   logs.sh <project> -s "error"         # Search across iterations
#   logs.sh <project> -f                 # Show file changes
#   logs.sh <project> --stats            # Show statistics
#   logs.sh <project> --json             # JSON output

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

# Defaults
PROJECT=""
ITERATION=""
SEARCH=""
SHOW_FILES=false
SHOW_STATS=false
JSON_OUTPUT=false
VERBOSE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -i|--iteration)
            ITERATION="$2"
            shift 2
            ;;
        -s|--search)
            SEARCH="$2"
            shift 2
            ;;
        -f|--files)
            SHOW_FILES=true
            shift
            ;;
        --stats)
            SHOW_STATS=true
            shift
            ;;
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 <project> [options]"
            echo ""
            echo "Options:"
            echo "  -i, --iteration N    View specific iteration (or 'latest')"
            echo "  -s, --search TERM    Search across all iterations"
            echo "  -f, --files          Show file changes"
            echo "  --stats              Show statistics only"
            echo "  --json               Output as JSON"
            echo "  -v, --verbose        Show full output (not truncated)"
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
    echo ""
    if [ -d ".projects" ]; then
        echo -e "${YELLOW}Available projects:${NC}"
        for dir in .projects/*/; do
            [ -d "$dir" ] && echo -e "  - ${CYAN}$(basename "$dir")${NC}"
        done
    fi
    exit 1
fi

# Check logs directory
if [ ! -d "$LOGS_DIR" ]; then
    echo -e "${YELLOW}No logs found for project: $PROJECT${NC}"
    exit 0
fi

# List iteration directories
list_iterations() {
    ls -d "$LOGS_DIR/iteration_"* 2>/dev/null | sort -V
}

# Get iteration count
get_iteration_count() {
    list_iterations | wc -l
}

# Get latest iteration directory
get_latest_iteration() {
    list_iterations | tail -1
}

# Format iteration summary
format_iteration() {
    local iter_dir="$1"
    local iter_num=$(basename "$iter_dir" | sed 's/iteration_0*//')

    local exit_code=$(cat "$iter_dir/exit_code" 2>/dev/null || echo "-1")
    local duration=$(jq -r '.seconds // "?"' "$iter_dir/duration.json" 2>/dev/null || echo "?")
    local start=$(jq -r '.start // "?"' "$iter_dir/duration.json" 2>/dev/null || echo "?")

    # Status icon and color
    local status_icon="✓"
    local status_color="$GREEN"
    if [ "$exit_code" != "0" ]; then
        status_icon="✗"
        status_color="$RED"
    fi

    echo -e "${CYAN}┌─ Iteration $(printf '%03d' $iter_num) ──────────────────────────────────────────────┐${NC}"
    echo -e "${CYAN}│${NC} Status: ${status_color}$status_icon${NC} (exit $exit_code)"
    echo -e "${CYAN}│${NC} Duration: ${duration}s"
    echo -e "${CYAN}│${NC} Started: ${DIM}$start${NC}"

    # File changes
    if [ -f "$iter_dir/files_changed.json" ]; then
        local created=$(jq -r '.created | length' "$iter_dir/files_changed.json" 2>/dev/null || echo 0)
        local modified=$(jq -r '.modified | length' "$iter_dir/files_changed.json" 2>/dev/null || echo 0)
        local deleted=$(jq -r '.deleted | length' "$iter_dir/files_changed.json" 2>/dev/null || echo 0)
        echo -e "${CYAN}│${NC} Files: ${GREEN}+$created${NC} ${YELLOW}~$modified${NC} ${RED}-$deleted${NC}"
    fi

    echo -e "${CYAN}├──────────────────────────────────────────────────────────────┤${NC}"

    # Output preview
    if [ -f "$iter_dir/output.log" ]; then
        if [ "$VERBOSE" = true ]; then
            cat "$iter_dir/output.log" 2>/dev/null | sed 's/^/│ /'
        else
            head -5 "$iter_dir/output.log" 2>/dev/null | sed 's/^/│ /'
            local total_lines=$(wc -l < "$iter_dir/output.log" 2>/dev/null || echo 0)
            if [ "$total_lines" -gt 5 ]; then
                echo -e "${CYAN}│${NC} ${DIM}... ($((total_lines - 5)) more lines, use -v for full)${NC}"
            fi
        fi
    else
        echo -e "${CYAN}│${NC} ${DIM}(no output)${NC}"
    fi

    echo -e "${CYAN}└──────────────────────────────────────────────────────────────┘${NC}"
}

# Show file changes detail
show_file_changes() {
    local iter_dir="$1"
    local iter_num=$(basename "$iter_dir" | sed 's/iteration_0*//')

    if [ ! -f "$iter_dir/files_changed.json" ]; then
        return
    fi

    echo -e "${CYAN}─── Iteration $iter_num File Changes ───${NC}"

    local created=$(jq -r '.created[]' "$iter_dir/files_changed.json" 2>/dev/null)
    local modified=$(jq -r '.modified[]' "$iter_dir/files_changed.json" 2>/dev/null)
    local deleted=$(jq -r '.deleted[]' "$iter_dir/files_changed.json" 2>/dev/null)

    if [ -n "$created" ]; then
        echo -e "${GREEN}Created:${NC}"
        echo "$created" | sed 's/^/  + /'
    fi

    if [ -n "$modified" ]; then
        echo -e "${YELLOW}Modified:${NC}"
        echo "$modified" | sed 's/^/  ~ /'
    fi

    if [ -n "$deleted" ]; then
        echo -e "${RED}Deleted:${NC}"
        echo "$deleted" | sed 's/^/  - /'
    fi
    echo ""
}

# Search iterations
search_iterations() {
    local pattern="$1"
    echo -e "${CYAN}Searching for: ${BOLD}$pattern${NC}"
    echo ""

    for iter_dir in $(list_iterations); do
        local iter_num=$(basename "$iter_dir" | sed 's/iteration_0*//')
        local matches=$(grep -n "$pattern" "$iter_dir/output.log" 2>/dev/null || true)

        if [ -n "$matches" ]; then
            echo -e "${CYAN}─── Iteration $iter_num ───${NC}"
            echo "$matches" | head -10
            local match_count=$(echo "$matches" | wc -l)
            if [ "$match_count" -gt 10 ]; then
                echo -e "${DIM}... ($((match_count - 10)) more matches)${NC}"
            fi
            echo ""
        fi
    done
}

# Show statistics
show_stats() {
    local total=$(get_iteration_count)
    local successful=0
    local failed=0
    local total_duration=0
    local total_created=0
    local total_modified=0

    for iter_dir in $(list_iterations); do
        local exit_code=$(cat "$iter_dir/exit_code" 2>/dev/null || echo "-1")
        local duration=$(jq -r '.seconds // 0' "$iter_dir/duration.json" 2>/dev/null || echo 0)

        if [ "$exit_code" = "0" ]; then
            ((successful++)) || true
        else
            ((failed++)) || true
        fi

        total_duration=$((total_duration + duration))

        if [ -f "$iter_dir/files_changed.json" ]; then
            local created=$(jq -r '.created | length' "$iter_dir/files_changed.json" 2>/dev/null || echo 0)
            local modified=$(jq -r '.modified | length' "$iter_dir/files_changed.json" 2>/dev/null || echo 0)
            total_created=$((total_created + created))
            total_modified=$((total_modified + modified))
        fi
    done

    local avg_duration=0
    if [ "$total" -gt 0 ]; then
        avg_duration=$((total_duration / total))
    fi

    # Completion status
    local completion_status="in_progress"
    if [ -f "$LOGS_DIR/completion.json" ]; then
        completion_status=$(jq -r '.status // "unknown"' "$LOGS_DIR/completion.json" 2>/dev/null)
    fi

    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${BOLD}STATISTICS: $PROJECT${NC}"
    echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}│${NC} Total Iterations:    ${BOLD}$total${NC}"
    echo -e "${CYAN}│${NC} Successful:          ${GREEN}$successful${NC} ($((successful * 100 / (total > 0 ? total : 1)))%)"
    echo -e "${CYAN}│${NC} Failed:              ${RED}$failed${NC}"
    echo -e "${CYAN}├──────────────────────────────────────────────────────────────┤${NC}"
    echo -e "${CYAN}│${NC} Total Duration:      ${total_duration}s"
    echo -e "${CYAN}│${NC} Avg Duration:        ${avg_duration}s"
    echo -e "${CYAN}├──────────────────────────────────────────────────────────────┤${NC}"
    echo -e "${CYAN}│${NC} Files Created:       ${GREEN}$total_created${NC}"
    echo -e "${CYAN}│${NC} Files Modified:      ${YELLOW}$total_modified${NC}"
    echo -e "${CYAN}├──────────────────────────────────────────────────────────────┤${NC}"

    if [ "$completion_status" = "complete" ]; then
        echo -e "${CYAN}│${NC} Status:              ${GREEN}✓ COMPLETE${NC}"
    elif [ "$completion_status" = "max_iterations" ]; then
        echo -e "${CYAN}│${NC} Status:              ${YELLOW}MAX ITERATIONS${NC}"
    else
        echo -e "${CYAN}│${NC} Status:              ${DIM}In Progress${NC}"
    fi

    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
}

# JSON output
output_json() {
    local total=$(get_iteration_count)
    local completion_status="in_progress"
    local completion_iterations=0

    if [ -f "$LOGS_DIR/completion.json" ]; then
        completion_status=$(jq -r '.status // "unknown"' "$LOGS_DIR/completion.json" 2>/dev/null)
        completion_iterations=$(jq -r '.iterations // 0' "$LOGS_DIR/completion.json" 2>/dev/null)
    fi

    echo "{"
    echo "  \"project\": \"$PROJECT\","
    echo "  \"total_iterations\": $total,"
    echo "  \"status\": \"$completion_status\","
    echo "  \"iterations\": ["

    local first=true
    for iter_dir in $(list_iterations); do
        local iter_num=$(basename "$iter_dir" | sed 's/iteration_0*//')
        local exit_code=$(cat "$iter_dir/exit_code" 2>/dev/null || echo "-1")
        local duration=$(jq -r '.seconds // 0' "$iter_dir/duration.json" 2>/dev/null || echo 0)
        local start=$(jq -r '.start // ""' "$iter_dir/duration.json" 2>/dev/null || echo "")
        local preview=$(head -1 "$iter_dir/output.log" 2>/dev/null | head -c 100 | jq -Rs '.' || echo '""')

        if [ "$first" = true ]; then
            first=false
        else
            echo ","
        fi

        echo -n "    {\"number\": $iter_num, \"exit_code\": $exit_code, \"duration_seconds\": $duration, \"start\": \"$start\", \"output_preview\": $preview}"
    done

    echo ""
    echo "  ],"
    echo "  \"completion\": {\"status\": \"$completion_status\", \"iterations\": $completion_iterations}"
    echo "}"
}

# Main logic
if [ "$JSON_OUTPUT" = true ]; then
    output_json
    exit 0
fi

if [ "$SHOW_STATS" = true ]; then
    show_stats
    exit 0
fi

if [ -n "$SEARCH" ]; then
    search_iterations "$SEARCH"
    exit 0
fi

if [ -n "$ITERATION" ]; then
    # View specific iteration
    if [ "$ITERATION" = "latest" ]; then
        iter_dir=$(get_latest_iteration)
    else
        iter_dir=$(printf "$LOGS_DIR/iteration_%03d" "$ITERATION")
    fi

    if [ ! -d "$iter_dir" ]; then
        echo -e "${RED}ERROR: Iteration not found: $ITERATION${NC}"
        exit 1
    fi

    if [ "$SHOW_FILES" = true ]; then
        show_file_changes "$iter_dir"
    else
        format_iteration "$iter_dir"
    fi
    exit 0
fi

# Default: list all iterations
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  ${BOLD}$PROJECT${NC} - $(get_iteration_count) iterations"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$SHOW_FILES" = true ]; then
    for iter_dir in $(list_iterations); do
        show_file_changes "$iter_dir"
    done
else
    for iter_dir in $(list_iterations); do
        format_iteration "$iter_dir"
        echo ""
    done
fi

# Show current status if available
if [ -f "$LOGS_DIR/status.json" ]; then
    echo -e "${DIM}Current status:${NC}"
    cat "$LOGS_DIR/status.json" | jq -c '.' 2>/dev/null || cat "$LOGS_DIR/status.json"
fi
