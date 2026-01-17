#!/bin/bash
# lib/steering.sh - Steering file support for task prioritization
# Reads from .project/steering.md

# ═══════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════

STEERING_FILE="${RALPH_STEERING_FILE:-.project/steering.md}"

# ═══════════════════════════════════════════════════════════
# STEERING PARSING
# ═══════════════════════════════════════════════════════════

# Check if steering file exists
has_steering() {
    [[ -f "$STEERING_FILE" ]]
}

# Get raw steering content
get_steering_content() {
    if has_steering; then
        cat "$STEERING_FILE"
    fi
}

# Parse FOCUS directive - forces specific task
# Format: FOCUS: 2.3
parse_steering_focus() {
    if has_steering; then
        grep -E "^FOCUS:\s*" "$STEERING_FILE" 2>/dev/null | sed 's/^FOCUS:\s*//' | head -1
    fi
}

# Parse SKIP directive - skip specific task
# Format: SKIP: 1.4
parse_steering_skip() {
    if has_steering; then
        grep -E "^SKIP:\s*" "$STEERING_FILE" 2>/dev/null | sed 's/^SKIP:\s*//'
    fi
}

# Parse PRIORITY directive - prioritize entire phase
# Format: PRIORITY: phase-02
parse_steering_priority() {
    if has_steering; then
        grep -E "^PRIORITY:\s*" "$STEERING_FILE" 2>/dev/null | sed 's/^PRIORITY:\s*//' | head -1
    fi
}

# Get focused task ID (respects FOCUS directive)
get_steered_task() {
    local default_task="$1"
    
    # Check for explicit focus
    local focus=$(parse_steering_focus)
    if [[ -n "$focus" ]]; then
        echo "$focus"
        return 0
    fi
    
    echo "$default_task"
}

# Check if task should be skipped
is_task_skipped() {
    local task_id="$1"
    local skipped=$(parse_steering_skip)
    
    for skip in $skipped; do
        if [[ "$skip" == "$task_id" ]]; then
            return 0
        fi
    done
    return 1
}

# ═══════════════════════════════════════════════════════════
# STEERING INJECTION
# ═══════════════════════════════════════════════════════════

# Inject steering guidance into prompt
# Usage: inject_steering "$AUGMENTED_PROMPT"
inject_steering() {
    local base_prompt="$1"
    
    if ! has_steering; then
        echo "$base_prompt"
        return
    fi
    
    local steering_content=$(get_steering_content)
    
    # Only inject if there's meaningful content (not just whitespace)
    if [[ -n "${steering_content//[$'\t\r\n ']}" ]]; then
        log "${CYAN}  Injecting steering guidance${NC}"
        echo "## STEERING GUIDANCE (Priority)

$steering_content

---

$base_prompt"
    else
        echo "$base_prompt"
    fi
}
