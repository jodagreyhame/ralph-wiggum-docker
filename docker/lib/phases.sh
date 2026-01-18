#!/bin/bash
# lib/phases.sh - Reviewer and Architect phase execution
# Handles the review pipeline for 3-tier system

# Source shared environment utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"

# Helper: Apply auth mode for a role
# Args: auth_mode, model (optional)
apply_auth_mode() {
    local auth_mode="$1"
    local model="${2:-}"

    case "$auth_mode" in
        anthropic-oauth|anthropic-api)
            clear_glm_env
            if [[ -n "$model" ]]; then
                export ANTHROPIC_MODEL="$model"
            fi
            ;;
        gemini-oauth|gemini-api)
            clear_glm_env
            ;;
        openai-oauth|openai-api|opencode-oauth|opencode-api)
            clear_glm_env
            ;;
        glm)
            export ANTHROPIC_BASE_URL="${GLM_BASE_URL:-https://api.z.ai/api/anthropic}"
            if [[ -n "${GLM_AUTH_TOKEN:-}" ]]; then
                export ANTHROPIC_AUTH_TOKEN="$GLM_AUTH_TOKEN"
            fi
            export ANTHROPIC_DEFAULT_SONNET_MODEL="${GLM_MODEL:-glm-4.7}"
            export ANTHROPIC_DEFAULT_OPUS_MODEL="${GLM_MODEL:-glm-4.7}"
            export ANTHROPIC_DEFAULT_HAIKU_MODEL="${GLM_MODEL:-glm-4.7}"
            ;;
    esac
}

# Run the reviewer phase
# Returns: sets REVIEWER_PASSED=true/false
run_reviewer_phase() {
    local iter_dir="$1"
    REVIEWER_PASSED=false

    if [[ "$REVIEWER_ENABLED" != "true" ]]; then
        return
    fi

    log ""
    log "${YELLOW}┌── REVIEWER PHASE ($REVIEWER_BACKEND) ──┐${NC}"

    # Save builder CLI config and environment
    local builder_cli_cmd="$CLI_CMD"
    local builder_cli_name="$CLI_NAME"
    local builder_cli_color="$CLI_COLOR"
    local builder_auth_mode="${RALPH_BUILDER_AUTH_MODE:-glm}"

    # Switch to reviewer backend AND auth mode
    export RALPH_SESSION_MODE="$REVIEWER_SESSION_MODE"
    apply_auth_mode "$RALPH_REVIEWER_AUTH_MODE" "$RALPH_REVIEWER_MODEL"
    source "$SCRIPT_DIR/cli/${REVIEWER_BACKEND}.sh"

    # Read review prompt from file
    local review_prompt_file="$RALPH_REVIEWER_PROMPT_FILE"
    local review_prompt
    if [[ -f "$review_prompt_file" ]]; then
        review_prompt=$(cat "$review_prompt_file")
    else
        log "${RED}ERROR: Reviewer prompt not found: $review_prompt_file${NC}"
        return
    fi

    # Run reviewer
    local review_live="$iter_dir/reviewer.live"
    local review_readable="$iter_dir/reviewer.readable"
    set +eu
    if [[ "$READABLE_OUTPUT" == "true" ]]; then
        echo "$review_prompt" | eval "$CLI_CMD" 2>&1 | tee "$review_live" | filter_readable | tee "$review_readable"
    else
        echo "$review_prompt" | eval "$CLI_CMD" 2>&1 | tee "$review_live"
        filter_readable < "$review_live" > "$review_readable" 2>/dev/null || true
    fi
    set -eu

    # Restore builder CLI and auth
    CLI_CMD="$builder_cli_cmd"
    CLI_NAME="$builder_cli_name"
    CLI_COLOR="$builder_cli_color"
    apply_auth_mode "$builder_auth_mode"

    # Check reviewer decision
    if [[ -f "$REVIEW_DIR/decision.txt" ]]; then
        local decision=$(cat "$REVIEW_DIR/decision.txt" | tr -d '[:space:]' | tr '[:lower:]' '[:upper:]')

        if [[ "$decision" == "PASS" ]]; then
            log "${GREEN}  ✓ REVIEWER: PASS${NC}"
            reset_failure_count
            REVIEWER_PASSED=true
            rm -f "$REVIEW_DIR/feedback.md"
        else
            log "${YELLOW}  ↻ REVIEWER: FAIL${NC}"
            increment_failure_count
            check_escalation
            # Clear any completion signal - builder needs to try again
            rm -f "$COMPLETION_FILE"
            if [[ -f "$REVIEW_DIR/feedback.md" ]]; then
                log "${DIM}$(head -5 "$REVIEW_DIR/feedback.md")${NC}"
            fi
        fi
    else
        log "${YELLOW}  No reviewer decision - continuing${NC}"
    fi

    rm -f "$REVIEW_DIR/decision.txt"
    log "${YELLOW}└── REVIEWER PHASE COMPLETE ──┘${NC}"
}

# Run the architect phase
# Returns 0 if APPROVE (task complete), 1 otherwise
run_architect_phase() {
    local iter_dir="$1"
    local iteration="$2"
    local start_time="$3"

    if [[ "$ARCHITECT_ENABLED" != "true" ]] || [[ "$REVIEWER_PASSED" != "true" ]]; then
        return 1
    fi

    log ""
    log "${BLUE}┌── ARCHITECT PHASE ($ARCHITECT_BACKEND) ──┐${NC}"

    # Save builder CLI config and environment
    local builder_cli_cmd="$CLI_CMD"
    local builder_cli_name="$CLI_NAME"
    local builder_cli_color="$CLI_COLOR"
    local builder_auth_mode="$RALPH_BUILDER_AUTH_MODE"

    # Track architect session - first call is fresh, subsequent calls resume
    local architect_session_marker=".project/state/architect_session_started"
    local effective_session_mode="$ARCHITECT_SESSION_MODE"

    if [[ "$ARCHITECT_SESSION_MODE" == "resume" ]]; then
        if [[ ! -f "$architect_session_marker" ]]; then
            effective_session_mode="fresh"
            log "${DIM}  (First architect call - starting fresh session)${NC}"
        fi
    fi

    # Switch to architect backend AND auth mode
    export RALPH_SESSION_MODE="$effective_session_mode"
    apply_auth_mode "$RALPH_ARCHITECT_AUTH_MODE" "$RALPH_ARCHITECT_MODEL"
    source "$SCRIPT_DIR/cli/${ARCHITECT_BACKEND}.sh"

    # Read architect prompt from file
    local architect_prompt_file="$RALPH_ARCHITECT_PROMPT_FILE"
    local architect_prompt
    if [[ -f "$architect_prompt_file" ]]; then
        architect_prompt=$(cat "$architect_prompt_file")
    else
        log "${RED}ERROR: Architect prompt not found: $architect_prompt_file${NC}"
        return 1
    fi

    # Run architect
    local arch_live="$iter_dir/architect.live"
    local arch_readable="$iter_dir/architect.readable"
    set +eu
    if [[ "$READABLE_OUTPUT" == "true" ]]; then
        echo "$architect_prompt" | eval "$CLI_CMD" 2>&1 | tee "$arch_live" | filter_readable | tee "$arch_readable"
    else
        echo "$architect_prompt" | eval "$CLI_CMD" 2>&1 | tee "$arch_live"
        filter_readable < "$arch_live" > "$arch_readable" 2>/dev/null || true
    fi
    set -eu

    # Mark architect session as started (for resume mode)
    if [[ "$ARCHITECT_SESSION_MODE" == "resume" ]] && [[ ! -f "$architect_session_marker" ]]; then
        mkdir -p "$(dirname "$architect_session_marker")"
        echo "$(date -Iseconds)" > "$architect_session_marker"
    fi

    # Restore builder CLI and auth
    CLI_CMD="$builder_cli_cmd"
    CLI_NAME="$builder_cli_name"
    CLI_COLOR="$builder_cli_color"
    apply_auth_mode "$builder_auth_mode"

    # Check architect decision
    if [[ -f "$ARCHITECT_DIR/decision.txt" ]]; then
        local arch_decision=$(cat "$ARCHITECT_DIR/decision.txt" | tr -d '[:space:]' | tr '[:lower:]' '[:upper:]')

        if [[ "$arch_decision" == "APPROVE" ]]; then
            log "${GREEN}  ✓ ARCHITECT: APPROVE - TASK COMPLETE${NC}"
            rm -f "$ARCHITECT_DIR/feedback.md"

            # Task complete
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))

            print_completion_banner "$iteration" "$duration" "3-tier"
            echo "{\"project\":\"$PROJECT_NAME\",\"cli\":\"$CLI_TYPE\",\"status\":\"complete\",\"iterations\":$iteration,\"duration\":$duration,\"approved_by\":\"architect\"}" > "$LOG_DIR/completion.json"

            rm -f "$ARCHITECT_DIR/decision.txt"
            log "${BLUE}└── ARCHITECT PHASE COMPLETE ──┘${NC}"
            return 0
        else
            log "${YELLOW}  ↻ ARCHITECT: REJECT${NC}"
            # Clear any completion signal - builder needs to try again
            rm -f "$COMPLETION_FILE"
            if [[ -f "$ARCHITECT_DIR/feedback.md" ]]; then
                log "${DIM}$(head -5 "$ARCHITECT_DIR/feedback.md")${NC}"
            fi
        fi
    else
        log "${YELLOW}  No architect decision - continuing${NC}"
    fi

    rm -f "$ARCHITECT_DIR/decision.txt"
    log "${BLUE}└── ARCHITECT PHASE COMPLETE ──┘${NC}"
    return 1
}

# Handle reviewer-only completion (no architect)
check_reviewer_completion() {
    local iteration="$1"
    local start_time="$2"

    if [[ "$REVIEWER_ENABLED" == "true" ]] && [[ "$REVIEWER_PASSED" == "true" ]] && [[ "$ARCHITECT_ENABLED" != "true" ]]; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))

        print_completion_banner "$iteration" "$duration" "reviewer"
        echo "{\"project\":\"$PROJECT_NAME\",\"cli\":\"$CLI_TYPE\",\"status\":\"complete\",\"iterations\":$iteration,\"duration\":$duration,\"approved_by\":\"reviewer\"}" > "$LOG_DIR/completion.json"
        return 0
    fi
    return 1
}
