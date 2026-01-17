#!/bin/bash
# lib/tracking.sh - File change tracking for iterations

# Track file changes in an iteration directory
track_changes() {
    local iter_dir="$1"

    # Get git status for changed files
    if git rev-parse --git-dir > /dev/null 2>&1; then
        git diff --name-status HEAD 2>/dev/null > "$iter_dir/git_diff.txt" || true

        # Create files_changed.json
        local created=$(git ls-files --others --exclude-standard 2>/dev/null | jq -R -s -c 'split("\n") | map(select(length > 0))')
        local modified=$(git diff --name-only 2>/dev/null | jq -R -s -c 'split("\n") | map(select(length > 0))')
        local deleted=$(git diff --name-only --diff-filter=D 2>/dev/null | jq -R -s -c 'split("\n") | map(select(length > 0))')

        echo "{\"created\": $created, \"modified\": $modified, \"deleted\": $deleted}" > "$iter_dir/files_changed.json"
    else
        echo "{\"created\": [], \"modified\": [], \"deleted\": [], \"note\": \"not a git repo\"}" > "$iter_dir/files_changed.json"
    fi
}
