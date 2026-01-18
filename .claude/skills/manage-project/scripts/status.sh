#!/bin/bash
# Show status of all Ralph Loop projects
# Usage: status.sh [project]

PROJECT=$1

show_project_status() {
    local proj=$1
    if [ -d "$proj" ] && [ -f "$proj/config.json" ]; then
        echo "=== $proj ==="

        # Check state
        if [ -f "$proj/.project/state/current.json" ]; then
            iteration=$(jq -r '.iteration // 0' "$proj/.project/state/current.json" 2>/dev/null || echo "0")
            status=$(jq -r '.status // "unknown"' "$proj/.project/state/current.json" 2>/dev/null || echo "unknown")
            echo "  Iteration: $iteration"
            echo "  Status: $status"
        fi

        # Count logs
        if [ -d "$proj/logs" ]; then
            log_count=$(ls -d "$proj/logs/iteration_"* 2>/dev/null | wc -l)
            echo "  Logs: $log_count iterations"
        fi

        echo ""
    fi
}

if [ -n "$PROJECT" ]; then
    show_project_status "$PROJECT"
else
    # Show all projects
    for dir in */; do
        if [ -f "${dir}config.json" ]; then
            show_project_status "${dir%/}"
        fi
    done

    # Docker status
    echo "=== Docker Containers ==="
    docker compose ps 2>/dev/null || echo "Docker not running or compose file not found"
fi
