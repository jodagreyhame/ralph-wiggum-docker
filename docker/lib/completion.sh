#!/bin/bash
# lib/completion.sh - Completion detection for Ralph Loop
# Uses file-based signaling consistent with reviewer/architect decision files
# COMPLETION_FILE is defined in ralph.sh

# Check for completion signal (file-based)
# Builder writes: echo "COMPLETE" > .project/state/completion.txt
# Returns 0 if completion found, 1 otherwise
check_completion_signal() {
    local iteration="$1"
    local start_time="$2"

    if [[ "$CHECK_COMPLETION" != "true" ]]; then
        return 1
    fi

    # Check for completion file
    if [[ -f "$COMPLETION_FILE" ]]; then
        local decision=$(cat "$COMPLETION_FILE" | tr -d '[:space:]' | tr '[:lower:]' '[:upper:]')

        if [[ "$decision" == "COMPLETE" ]]; then
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))

            print_completion_banner "$iteration" "$duration" "builder"
            echo "{\"project\":\"$PROJECT_NAME\",\"cli\":\"$CLI_TYPE\",\"status\":\"complete\",\"iterations\":$iteration,\"duration\":$duration,\"signaled_by\":\"builder\"}" > "$LOG_DIR/completion.json"

            rm -f "$COMPLETION_FILE"
            return 0
        fi
    fi

    return 1
}

# Check for BLOCKED.md signal
check_blocked_signal() {
    local iteration="$1"

    if [[ -f "BLOCKED.md" ]]; then
        print_blocked_banner
        echo "{\"project\":\"$PROJECT_NAME\",\"cli\":\"$CLI_TYPE\",\"status\":\"blocked\",\"iterations\":$iteration}" > "$LOG_DIR/completion.json"
        return 0
    fi
    return 1
}

# Write max iterations completion
write_max_iterations_completion() {
    local iterations="$1"
    local duration="$2"

    print_max_iterations_banner "$iterations" "$duration"
    echo "{\"project\":\"$PROJECT_NAME\",\"cli\":\"$CLI_TYPE\",\"status\":\"max_iterations\",\"iterations\":$iterations,\"duration\":$duration}" > "$LOG_DIR/completion.json"
}
