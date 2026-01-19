#!/bin/bash
# lib/validation.sh - Task specification validation loop
# Validates task format and retries until <promise>VALIDATED</promise>

# Source shared environment utilities
source /app/lib/env.sh

# Configuration
VALIDATION_MAX_ATTEMPTS="${RALPH_VALIDATION_MAX_ATTEMPTS:-5}"
VALIDATION_ENABLED="${RALPH_VALIDATION_ENABLED:-false}"

# Run validation loop for task specifications
# Returns: 0 if validated or no tasks, 1 if validation failed
run_validation_loop() {
    if [[ "$VALIDATION_ENABLED" != "true" ]]; then
        return 0
    fi

    local tasks_file=".project/tasks/summary.json"
    if [[ ! -f "$tasks_file" ]]; then
        log "${DIM}No task specs found, skipping validation${NC}"
        return 0
    fi

    log ""
    log "${CYAN}┌── VALIDATION LOOP ──┐${NC}"

    local attempt=0
    local validation_prompt="Validate the task specifications in .project/tasks/. Check format, dependencies, and completeness. If valid, respond with <promise>VALIDATED</promise>. If issues found, fix them and respond with <promise>VALIDATED</promise> after fixing."
    local validation_log="$LOG_DIR/validation.log"

    while [[ $attempt -lt $VALIDATION_MAX_ATTEMPTS ]]; do
        attempt=$((attempt + 1))
        log "${DIM}  Validation attempt $attempt/$VALIDATION_MAX_ATTEMPTS${NC}"

        # Build CLI command (first=fresh, subsequent=--continue)
        local cli_cmd="$CLI_CMD"
        local current_prompt="$validation_prompt"
        if [[ $attempt -gt 1 ]]; then
            cli_cmd="$cli_cmd --continue"
            current_prompt="Continue fixing task format issues. When done, respond with <promise>VALIDATED</promise>."
        fi

        # Run validation
        local output
        set +eu
        output=$(echo "$current_prompt" | eval "$cli_cmd" 2>&1 | tee -a "$validation_log")
        set -eu

        # Check for validation signal
        if echo "$output" | grep -q "<promise>VALIDATED</promise>"; then
            log "${GREEN}  ✓ Tasks validated${NC}"
            log "${CYAN}└── VALIDATION COMPLETE ──┘${NC}"
            return 0
        fi

        log "${YELLOW}  ↻ Validation not complete, retrying...${NC}"
    done

    log "${RED}  ✗ Validation failed after $VALIDATION_MAX_ATTEMPTS attempts${NC}"
    log "${CYAN}└── VALIDATION FAILED ──┘${NC}"
    return 1
}
