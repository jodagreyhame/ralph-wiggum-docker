#!/bin/bash
# ralph.sh - Unified Ralph Loop with pluggable CLI backends
# Usage: ralph.sh <cli>  (claude, gemini, codex, opencode, etc.)
# Writes to logs/iteration_XXX/ folders

set -euo pipefail

# Get CLI type from argument or environment
CLI_TYPE="${1:-${RALPH_BUILDER_BACKEND:-claude}}"

# In Docker container, files are always at /app
# ralph.sh is at /app/ralph.sh (with symlink at /ralph.sh)
# lib/ is at /app/lib/, cli/ is at /app/cli/
SCRIPT_DIR="/app"

# Source library modules
source "$SCRIPT_DIR/lib/colors.sh"
source "$SCRIPT_DIR/lib/filter.sh"
source "$SCRIPT_DIR/lib/tracking.sh"

# Source CLI configuration
CLI_CONFIG="$SCRIPT_DIR/cli/${CLI_TYPE}.sh"
if [[ ! -f "$CLI_CONFIG" ]]; then
    echo "ERROR: Unknown CLI type: $CLI_TYPE"
    echo "Available CLIs:"
    ls -1 "$SCRIPT_DIR/cli/"*.sh 2>/dev/null | xargs -I{} basename {} .sh || echo "  (none found)"
    exit 1
fi
source "$CLI_CONFIG"

# Verify required variables from CLI config
: "${CLI_NAME:?CLI_NAME not defined in $CLI_CONFIG}"
: "${CLI_CMD:?CLI_CMD not defined in $CLI_CONFIG}"
: "${CLI_COLOR:?CLI_COLOR not defined in $CLI_CONFIG}"

# Configuration (from environment variables)
PROJECT_NAME="${RALPH_PROJECT_NAME:-PROJECT}"
PROMPT_FILE="${RALPH_PROMPT_FILE:-BUILDER_PROMPT.md}"
MAX_ITERATIONS="${RALPH_MAX_ITERATIONS:-100}"
LOG_DIR="${RALPH_LOG_DIR:-logs}"
STATUS_FILE="$LOG_DIR/status.json"
READABLE_OUTPUT="${RALPH_READABLE_OUTPUT:-true}"
SHOW_THINKING="${RALPH_SHOW_THINKING:-false}"

# 3-tier review configuration
REVIEWER_ENABLED="${RALPH_REVIEWER_ENABLED:-false}"
REVIEWER_BACKEND="${RALPH_REVIEWER_BACKEND:-claude}"
REVIEWER_SESSION_MODE="${RALPH_REVIEWER_SESSION_MODE:-fresh}"

ARCHITECT_ENABLED="${RALPH_ARCHITECT_ENABLED:-false}"
ARCHITECT_BACKEND="${RALPH_ARCHITECT_BACKEND:-gemini}"
ARCHITECT_SESSION_MODE="${RALPH_ARCHITECT_SESSION_MODE:-resume}"

# Escalation configuration
ESCALATION_ENABLED="${RALPH_ESCALATION_ENABLED:-false}"
ESCALATION_MAX_FAILURES="${RALPH_ESCALATION_MAX_FAILURES:-3}"

# Provider fallback configuration
PROVIDER_FALLBACK_ENABLED="${RALPH_PROVIDER_FALLBACK_ENABLED:-false}"
PROVIDER_FAILURE_THRESHOLD="${RALPH_PROVIDER_FAILURE_THRESHOLD:-10}"
PROVIDER_FALLBACK_SEQUENCE="${RALPH_PROVIDER_FALLBACK_SEQUENCE:-[\"claude\",\"gemini\",\"codex\"]}"
PROVIDER_FALLBACK_AUTH_MODES="${RALPH_PROVIDER_FALLBACK_AUTH_MODES:-{}}"

# State directories and files
PROJECT_STATE_DIR=".project"
REVIEW_DIR="$PROJECT_STATE_DIR/review"
ARCHITECT_DIR="$PROJECT_STATE_DIR/architect"
ESCALATION_FILE="$PROJECT_STATE_DIR/state/escalation.json"
COMPLETION_FILE="$PROJECT_STATE_DIR/state/completion.txt"

# Normalize iterations (0 = infinite)
if [[ "$MAX_ITERATIONS" -eq 0 ]]; then
    MAX_ITERATIONS=999999999
fi

# Check completion mode (file-based: .project/state/completion.txt)
CHECK_COMPLETION="${RALPH_COMPLETION_ENABLED:-true}"

# Task mode configuration
TASK_MODE="${RALPH_TASK_MODE:-false}"

# Create directories and session log
mkdir -p "$LOG_DIR"
SESSION_LOG="$LOG_DIR/session.log"

# Source remaining library modules (need SESSION_LOG defined first)
source "$SCRIPT_DIR/lib/display.sh"
source "$SCRIPT_DIR/lib/escalation.sh"
source "$SCRIPT_DIR/lib/feedback.sh"
source "$SCRIPT_DIR/lib/phases.sh"
source "$SCRIPT_DIR/lib/completion.sh"
source "$SCRIPT_DIR/lib/error-classifier.sh"
source "$SCRIPT_DIR/lib/provider-health.sh"
source "$SCRIPT_DIR/lib/provider-switch.sh"
source "$SCRIPT_DIR/lib/tasks.sh"
source "$SCRIPT_DIR/lib/steering.sh"
source "$SCRIPT_DIR/lib/preflight.sh"
source "$SCRIPT_DIR/lib/validation.sh"
source "$SCRIPT_DIR/lib/verify.sh"

# Alias for provider modules
STATE_DIR="$PROJECT_STATE_DIR"

# Signal handling
cleanup() {
    print_cancelled_banner
    exit 130
}
trap cleanup SIGINT SIGTERM

# Run pre-flight validation (checks prompts, backends, credentials)
validate_preflight

PROMPT=$(cat "$PROMPT_FILE")

# Display startup banner
print_startup_banner

START_TIME=$(date +%s)

# Initialize 3-tier state directories
mkdir -p "$PROJECT_STATE_DIR/state"
if [[ "$REVIEWER_ENABLED" == "true" ]]; then
    mkdir -p "$REVIEW_DIR"
    rm -f "$REVIEW_DIR/decision.txt" "$REVIEW_DIR/feedback.md"
    log "${DIM}Reviewer enabled - state in $REVIEW_DIR${NC}"
fi
if [[ "$ARCHITECT_ENABLED" == "true" ]]; then
    mkdir -p "$ARCHITECT_DIR"
    rm -f "$ARCHITECT_DIR/decision.txt" "$ARCHITECT_DIR/feedback.md"
    log "${DIM}Architect enabled - state in $ARCHITECT_DIR${NC}"
fi

# Initialize escalation and provider health
init_escalation
init_provider_health

# Find starting iteration (continue from where we left off)
START_ITER=1
if ls "$LOG_DIR"/iteration_* 1>/dev/null 2>&1; then
    LAST_ITER=$(ls -d "$LOG_DIR"/iteration_* 2>/dev/null | sed 's/.*iteration_//' | sort -n | tail -1)
    LAST_ITER=$((10#$LAST_ITER))
    START_ITER=$((LAST_ITER + 1))
    log "${DIM}Resuming from iteration $START_ITER${NC}"
fi

# Run validation loop for task specs (if enabled)
if ! run_validation_loop; then
    log "${RED}Task validation failed - exiting${NC}"
    exit 1
fi

# ═══════════════════════════════════════════════════════════
# MAIN LOOP
# ═══════════════════════════════════════════════════════════
for ((i=START_ITER; i<=MAX_ITERATIONS; i++)); do
    # Create iteration directory
    ITER_DIR=$(printf "$LOG_DIR/iteration_%03d" $i)
    mkdir -p "$ITER_DIR"

    print_iteration_header "$i" "$MAX_ITERATIONS"

    # Record start time
    ITER_START=$(date +%s)
    echo "{\"start\": \"$(date -Iseconds)\", \"iteration\": $i, \"cli\": \"$CLI_TYPE\"}" > "$ITER_DIR/duration.json"

    # Update status.json for external monitoring
    echo "{\"iteration\":$i,\"status\":\"running\",\"started\":\"$(date -Iseconds)\",\"project\":\"$PROJECT_NAME\",\"cli\":\"$CLI_TYPE\"}" > "$STATUS_FILE"

    # Create live log file and symlink
    LIVE_LOG="$ITER_DIR/output.live"
    LIVE_LOG_READABLE="$ITER_DIR/output.readable"
    ln -sf "iteration_$(printf '%03d' $i)/output.live" "$LOG_DIR/current.log"
    ln -sf "iteration_$(printf '%03d' $i)/output.readable" "$LOG_DIR/current.readable"

    # Check for provider override from reviewer/architect
    check_provider_override || true

    # Inject feedback from previous FAIL/REJECT decisions
    AUGMENTED_PROMPT=$(inject_feedback "$PROMPT")

    # Task mode: inject current task context and steering
    if [[ "$TASK_MODE" == "true" ]] && has_task_specs; then
        # Get current or next task (respecting steering)
        CURRENT_TASK=$(get_current_task)
        if [[ -z "$CURRENT_TASK" ]]; then
            CURRENT_TASK=$(get_next_pending_task)
        fi
        
        # Apply steering overrides
        CURRENT_TASK=$(get_steered_task "$CURRENT_TASK")
        
        if [[ -n "$CURRENT_TASK" ]] && ! is_task_skipped "$CURRENT_TASK"; then
            mark_task_in_progress "$CURRENT_TASK"
            AUGMENTED_PROMPT=$(inject_task_context "$AUGMENTED_PROMPT" "$CURRENT_TASK")
        fi
        
        # Inject steering guidance
        AUGMENTED_PROMPT=$(inject_steering "$AUGMENTED_PROMPT")
    fi

    # Run CLI and capture output
    set +eu
    if [[ "$READABLE_OUTPUT" == "true" ]]; then
        echo "$AUGMENTED_PROMPT" | eval "$CLI_CMD" 2>&1 | tee "$LIVE_LOG" | filter_readable | tee "$LIVE_LOG_READABLE"
    else
        echo "$AUGMENTED_PROMPT" | eval "$CLI_CMD" 2>&1 | tee "$LIVE_LOG"
        filter_readable < "$LIVE_LOG" > "$LIVE_LOG_READABLE" 2>/dev/null || true
    fi
    CLI_EXIT=${PIPESTATUS[1]:-0}
    set -eu

    OUTPUT=$(cat "$LIVE_LOG")

    # Record timing
    ITER_END=$(date +%s)
    ITER_DURATION=$((ITER_END - ITER_START))
    echo "{\"start\": \"$(date -d @$ITER_START -Iseconds 2>/dev/null || date -Iseconds)\", \"end\": \"$(date -Iseconds)\", \"seconds\": $ITER_DURATION, \"iteration\": $i, \"cli\": \"$CLI_TYPE\"}" > "$ITER_DIR/duration.json"

    # Save outputs
    echo "$CLI_EXIT" > "$ITER_DIR/exit_code"
    echo "$OUTPUT" > "$ITER_DIR/output.log"
    track_changes "$ITER_DIR"

    log ""
    log "${DIM}── $PROJECT_NAME #$i complete (exit: $CLI_EXIT, ${ITER_DURATION}s) ──${NC}"

    # Update status
    echo "{\"iteration\":$i,\"status\":\"complete\",\"exit_code\":$CLI_EXIT,\"seconds\":$ITER_DURATION,\"project\":\"$PROJECT_NAME\",\"cli\":\"$CLI_TYPE\"}" > "$STATUS_FILE"

    # Check for BLOCKED signal
    if check_blocked_signal "$i"; then
        exit 1
    fi

    # Check for completion signal (builder signals ready for review)
    if [[ -f "$COMPLETION_FILE" ]]; then
        log "${GREEN}  ✓ Builder signaled completion${NC}"

        # Run reviewer phase (only when builder signals complete)
        run_reviewer_phase "$ITER_DIR"

        # Run architect phase (if reviewer passed)
        if run_architect_phase "$ITER_DIR" "$i" "$START_TIME"; then
            # Run verification before final exit (if enabled)
            if ! run_verify_loop "${CURRENT_TASK:-}" "$ITER_DIR"; then
                log "${YELLOW}Verification failed - builder must retry${NC}"
                rm -f "$COMPLETION_FILE"
                continue
            fi
            rm -f "$COMPLETION_FILE"
            exit 0
        fi

        # Check reviewer-only completion (no architect)
        if check_reviewer_completion "$i" "$START_TIME"; then
            # Run verification before final exit (if enabled)
            if ! run_verify_loop "${CURRENT_TASK:-}" "$ITER_DIR"; then
                log "${YELLOW}Verification failed - builder must retry${NC}"
                rm -f "$COMPLETION_FILE"
                REVIEWER_PASSED=false  # Reset for next iteration
                continue
            fi
            rm -f "$COMPLETION_FILE"
            exit 0
        fi

        # Builder-only mode: if no reviewer enabled, check completion signal
        if check_completion_signal "$i" "$START_TIME"; then
            # Run verification before final exit (if enabled)
            if ! run_verify_loop "${CURRENT_TASK:-}" "$ITER_DIR"; then
                log "${YELLOW}Verification failed - builder must retry${NC}"
                rm -f "$COMPLETION_FILE"
                continue
            fi
            # Task mode: mark current task complete on successful completion
            if [[ "$TASK_MODE" == "true" ]] && [[ -n "${CURRENT_TASK:-}" ]]; then
                mark_task_complete "$CURRENT_TASK"
            fi
            exit 0
        fi

        # If reviewer/architect rejected, completion file is already cleared by phases.sh
    fi

    # Smart error handling with provider fallback
    ERROR_TYPE=$(classify_error "$LIVE_LOG" "$CLI_EXIT")
    echo "$ERROR_TYPE" > "$ITER_DIR/error_type"

    if [[ "$ERROR_TYPE" != "$ERROR_NONE" ]]; then
        log "${YELLOW}  ⚠ Error: $(get_error_description "$ERROR_TYPE") (exit: $CLI_EXIT)${NC}"

        # Record provider failure
        FAILURE_COUNT=$(record_provider_failure "$CLI_TYPE" "$ERROR_TYPE")
        log "${DIM}    Provider $CLI_TYPE failures: $FAILURE_COUNT${NC}"

        # Auth errors can't be recovered by switching providers
        if [[ "$ERROR_TYPE" == "$ERROR_AUTH" ]]; then
            log "${RED}  ✗ Authentication error - please check credentials for $CLI_TYPE${NC}"
            log "${RED}    Stopping loop. Fix credentials and restart.${NC}"
            exit 1
        fi

        # Check if we should switch providers
        if is_provider_recoverable "$ERROR_TYPE" && should_switch_provider "$CLI_TYPE"; then
            if [[ "$PROVIDER_FALLBACK_ENABLED" == "true" ]]; then
                log_provider_switch "$CLI_TYPE" "pending" "$ERROR_TYPE"
                if execute_provider_fallback "$CLI_TYPE" "$ERROR_TYPE"; then
                    # Successfully switched - retry this iteration with new provider
                    log "${GREEN}  → Retrying iteration with new provider...${NC}"
                    ((i--))  # Decrement to retry this iteration
                else
                    log "${YELLOW}  No fallback available - continuing with current provider${NC}"
                fi
            else
                log "${DIM}    Provider fallback disabled - continuing...${NC}"
            fi
        fi
    else
        # Success - record healthy provider
        record_provider_success "$CLI_TYPE"
    fi

    sleep 1
done

# Max iterations reached
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
write_max_iterations_completion "$MAX_ITERATIONS" "$DURATION"
exit 0
