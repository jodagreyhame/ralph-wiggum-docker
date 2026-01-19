#!/bin/bash
# lib/verify.sh - Build/test verification and remediation loops
# Runs verification after builder completion, with retry and remediation

# Source shared environment utilities
source /app/lib/env.sh

# Configuration
VERIFY_ENABLED="${RALPH_VERIFY_ENABLED:-false}"
VERIFY_MODE="${RALPH_VERIFY_MODE:-agent}"  # agent or deterministic
VERIFY_AGENT_MAX="${RALPH_VERIFY_AGENT_MAX:-3}"
REMEDIATE_ENABLED="${RALPH_ENABLE_REMEDIATION:-false}"
REMEDIATE_MAX="${RALPH_REMEDIATE_MAX:-2}"

# Run verification loop
# Args: task_id (optional), iter_dir
# Returns: 0=PASS, 1=FAIL, 2=BLOCKED
run_verify_loop() {
    local task_id="${1:-}"
    local iter_dir="${2:-$ITER_DIR}"

    if [[ "$VERIFY_ENABLED" != "true" ]]; then
        return 0
    fi

    log ""
    log "${MAGENTA}┌── VERIFY LOOP ──┐${NC}"

    local attempt=0
    while [[ $attempt -lt $VERIFY_AGENT_MAX ]]; do
        attempt=$((attempt + 1))
        log "${DIM}  Verification attempt $attempt/$VERIFY_AGENT_MAX${NC}"

        local exit_code
        run_verifier_agent "$task_id" "$attempt" "$iter_dir"
        exit_code=$?

        if [[ $exit_code -eq 0 ]]; then
            log "${GREEN}  ✓ Verification PASSED${NC}"
            log "${MAGENTA}└── VERIFY COMPLETE ──┘${NC}"
            return 0
        elif [[ $exit_code -eq 2 ]]; then
            log "${YELLOW}  ⚠ Verification BLOCKED - attempting remediation${NC}"
            if [[ "$REMEDIATE_ENABLED" == "true" ]]; then
                if run_remediation_loop "$task_id" "$iter_dir"; then
                    log "${DIM}  Remediation succeeded, retrying verification${NC}"
                    continue
                fi
            fi
            log "${RED}  ✗ Cannot remediate${NC}"
            log "${MAGENTA}└── VERIFY BLOCKED ──┘${NC}"
            return 2
        fi
        log "${YELLOW}  ↻ Verification failed, retrying...${NC}"
    done

    log "${RED}  ✗ Verification FAILED after $VERIFY_AGENT_MAX attempts${NC}"
    log "${MAGENTA}└── VERIFY FAILED ──┘${NC}"
    return 1
}

# Run verifier agent
# Args: task_id, attempt, iter_dir
# Returns: 0=PASS, 1=FAIL, 2=BLOCKED
run_verifier_agent() {
    local task_id="${1:-}"
    local attempt="$2"
    local iter_dir="$3"

    local verify_prompt="Run build and test commands to verify the work. Check for errors, test failures, and missing dependencies.

If everything passes, respond with: <verify>PASS</verify>
If tests fail or build errors, respond with: <verify>FAIL</verify>
If blocked by missing tools/dependencies that can't be installed, respond with: <verify>BLOCKED</verify>"

    if [[ -n "$task_id" ]]; then
        verify_prompt="$verify_prompt

Verifying task: $task_id"
    fi

    local cli_cmd="$CLI_CMD"
    if [[ $attempt -gt 1 ]]; then
        cli_cmd="$cli_cmd --continue"
        verify_prompt="Continue verification. Previous attempt failed. Check remaining issues and respond with <verify>PASS</verify>, <verify>FAIL</verify>, or <verify>BLOCKED</verify>."
    fi

    local output
    local verify_log="$iter_dir/verify_${attempt}.log"
    set +eu
    output=$(echo "$verify_prompt" | eval "$cli_cmd" 2>&1 | tee "$verify_log")
    set -eu

    if echo "$output" | grep -q "<verify>PASS</verify>"; then
        return 0
    elif echo "$output" | grep -q "<verify>BLOCKED</verify>"; then
        return 2
    fi
    return 1
}

# Run remediation loop
# Args: task_id, iter_dir
# Returns: 0=fixed, 1=failed
run_remediation_loop() {
    local task_id="${1:-}"
    local iter_dir="${2:-$ITER_DIR}"

    log "${CYAN}  ┌── REMEDIATION ──┐${NC}"

    local attempt=0
    while [[ $attempt -lt $REMEDIATE_MAX ]]; do
        attempt=$((attempt + 1))
        log "${DIM}    Remediation attempt $attempt/$REMEDIATE_MAX${NC}"

        local remediate_prompt="Fix environment issues that are blocking verification. You may install tools, packages, or fix configurations. Do NOT modify the repository source code.

When environment is fixed, respond with: <remediate>DONE</remediate>
If you cannot fix the issue, respond with: <remediate>BLOCKED</remediate>"

        local cli_cmd="$CLI_CMD"
        if [[ $attempt -gt 1 ]]; then
            cli_cmd="$cli_cmd --continue"
            remediate_prompt="Continue fixing environment issues. Respond with <remediate>DONE</remediate> when fixed or <remediate>BLOCKED</remediate> if impossible."
        fi

        local output
        local remediate_log="$iter_dir/remediate_${attempt}.log"
        set +eu
        output=$(echo "$remediate_prompt" | eval "$cli_cmd" 2>&1 | tee "$remediate_log")
        set -eu

        if echo "$output" | grep -q "<remediate>DONE</remediate>"; then
            log "${GREEN}    ✓ Remediation complete${NC}"
            log "${CYAN}  └── REMEDIATION DONE ──┘${NC}"
            return 0
        elif echo "$output" | grep -q "<remediate>BLOCKED</remediate>"; then
            log "${RED}    ✗ Remediation blocked${NC}"
            break
        fi
        log "${YELLOW}    ↻ Remediation incomplete, retrying...${NC}"
    done

    log "${RED}    ✗ Remediation failed after $REMEDIATE_MAX attempts${NC}"
    log "${CYAN}  └── REMEDIATION FAILED ──┘${NC}"
    return 1
}
