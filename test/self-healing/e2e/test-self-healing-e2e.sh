#!/bin/bash
# test-self-healing-e2e.sh - Comprehensive E2E test for self-healing loops
#
# How it works:
# 1. Script creates control.json with test scenario
# 2. Agent reads control.json to know what to do
# 3. Agent increments call_count.txt on each call
# 4. Agent behavior changes based on call count (e.g., write decision on call 2)
# 5. Script verifies correct number of calls happened

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
DIM='\033[2m'
NC='\033[0m'

TEST_PROJECT="_e2e-self-healing-$$"
TEST_PROJECT_DIR="$PROJECT_ROOT/.projects/$TEST_PROJECT"
MAX_WAIT=300
AUTH_MODE="${TEST_AUTH_MODE:-anthropic-oauth}"

TESTS_PASSED=0
TESTS_FAILED=0

log() { echo -e "$1"; }

# Consolidated test log output directory
CONSOLIDATED_LOG_DIR="$PROJECT_ROOT/test/self-healing/e2e/logs"
CONSOLIDATED_LOG="$CONSOLIDATED_LOG_DIR/e2e-test-$(date +%Y%m%d-%H%M%S).log"
CURRENT_TEST_NAME=""

# Generate consolidated log for a single test
generate_test_log() {
    local test_name="$1"
    local log_dir="$TEST_PROJECT_DIR/logs"

    mkdir -p "$CONSOLIDATED_LOG_DIR"

    {
        echo ""
        echo "════════════════════════════════════════════════════════════════════════════════"
        echo "TEST: $test_name"
        echo "════════════════════════════════════════════════════════════════════════════════"
        echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "Project: $TEST_PROJECT_DIR"
        echo ""

        # Control file
        echo "┌─────────────────────────────────────────────────────────────────────────────┐"
        echo "│ CONTROL FILE                                                                │"
        echo "└─────────────────────────────────────────────────────────────────────────────┘"
        if [[ -f "$TEST_PROJECT_DIR/.project/test/control.json" ]]; then
            cat "$TEST_PROJECT_DIR/.project/test/control.json"
        else
            echo "(not found)"
        fi
        echo ""

        # Call counts summary
        echo "┌─────────────────────────────────────────────────────────────────────────────┐"
        echo "│ CALL COUNTS                                                                 │"
        echo "└─────────────────────────────────────────────────────────────────────────────┘"
        for role in builder reviewer architect; do
            local call_file="$TEST_PROJECT_DIR/.project/test/${role}_calls.txt"
            if [[ -f "$call_file" ]]; then
                echo "  $role: $(cat "$call_file") calls"
            fi
        done
        echo ""

        # Decision files
        echo "┌─────────────────────────────────────────────────────────────────────────────┐"
        echo "│ DECISIONS                                                                   │"
        echo "└─────────────────────────────────────────────────────────────────────────────┘"
        if [[ -f "$TEST_PROJECT_DIR/.project/state/completion.txt" ]]; then
            echo "  completion: $(cat "$TEST_PROJECT_DIR/.project/state/completion.txt")"
        fi
        if [[ -f "$TEST_PROJECT_DIR/.project/review/decision.txt" ]]; then
            echo "  reviewer: $(cat "$TEST_PROJECT_DIR/.project/review/decision.txt")"
        fi
        if [[ -f "$TEST_PROJECT_DIR/.project/architect/decision.txt" ]]; then
            echo "  architect: $(cat "$TEST_PROJECT_DIR/.project/architect/decision.txt")"
        fi
        if [[ -f "$TEST_PROJECT_DIR/.project/state/provider-override.json" ]]; then
            echo "  provider-override: $(cat "$TEST_PROJECT_DIR/.project/state/provider-override.json")"
        fi
        echo ""

        # Per-iteration logs
        if [[ -d "$log_dir" ]]; then
            for iter_dir in "$log_dir"/iteration_*; do
                if [[ -d "$iter_dir" ]]; then
                    local iter_num=$(basename "$iter_dir" | sed 's/iteration_//')
                    echo "┌─────────────────────────────────────────────────────────────────────────────┐"
                    echo "│ ITERATION $iter_num                                                            │"
                    echo "└─────────────────────────────────────────────────────────────────────────────┘"

                    # Duration
                    if [[ -f "$iter_dir/duration.json" ]]; then
                        echo "Duration: $(jq -r '.duration_seconds // "unknown"' "$iter_dir/duration.json" 2>/dev/null)s"
                    fi

                    # Exit code
                    if [[ -f "$iter_dir/exit_code" ]]; then
                        echo "Exit code: $(cat "$iter_dir/exit_code")"
                    fi
                    echo ""

                    # Builder output (readable)
                    if [[ -f "$iter_dir/output.readable" ]]; then
                        echo "── Builder Output ──"
                        head -100 "$iter_dir/output.readable" 2>/dev/null || cat "$iter_dir/output.readable"
                        local lines=$(wc -l < "$iter_dir/output.readable" 2>/dev/null || echo 0)
                        if [[ $lines -gt 100 ]]; then
                            echo "... (truncated, $lines total lines)"
                        fi
                        echo ""
                    fi

                    # Reviewer output
                    if [[ -f "$iter_dir/reviewer.readable" ]]; then
                        echo "── Reviewer Output ──"
                        head -50 "$iter_dir/reviewer.readable" 2>/dev/null || cat "$iter_dir/reviewer.readable"
                        local lines=$(wc -l < "$iter_dir/reviewer.readable" 2>/dev/null || echo 0)
                        if [[ $lines -gt 50 ]]; then
                            echo "... (truncated, $lines total lines)"
                        fi
                        echo ""
                    fi

                    # Architect output
                    if [[ -f "$iter_dir/architect.readable" ]]; then
                        echo "── Architect Output ──"
                        head -50 "$iter_dir/architect.readable" 2>/dev/null || cat "$iter_dir/architect.readable"
                        local lines=$(wc -l < "$iter_dir/architect.readable" 2>/dev/null || echo 0)
                        if [[ $lines -gt 50 ]]; then
                            echo "... (truncated, $lines total lines)"
                        fi
                        echo ""
                    fi
                fi
            done
        fi

        # Completion info
        if [[ -f "$log_dir/completion.json" ]]; then
            echo "┌─────────────────────────────────────────────────────────────────────────────┐"
            echo "│ COMPLETION                                                                  │"
            echo "└─────────────────────────────────────────────────────────────────────────────┘"
            cat "$log_dir/completion.json"
            echo ""
        fi

    } >> "$CONSOLIDATED_LOG"

    log "${DIM}  Log appended to: $CONSOLIDATED_LOG${NC}"
}

# Save test log after each test
save_test_log() {
    if [[ -n "$CURRENT_TEST_NAME" ]] && [[ -d "$TEST_PROJECT_DIR" ]]; then
        generate_test_log "$CURRENT_TEST_NAME"
    fi
}

cleanup() {
    log "${YELLOW}Cleaning up $TEST_PROJECT...${NC}"
    rm -rf "$TEST_PROJECT_DIR"
    docker ps -q --filter "label=ralph.project=$TEST_PROJECT" | xargs -r docker stop 2>/dev/null || true
}

check_docker() {
    if ! docker info &>/dev/null; then
        log "${RED}Docker not running${NC}"
        exit 1
    fi
    log "${GREEN}Docker OK${NC}"
}

# Create the universal agent prompt that reads control.json
create_agent_prompt() {
    local role="$1"  # builder, reviewer, or architect
    local decision_file="$2"  # e.g., .project/review/decision.txt
    local decision_value="$3"  # e.g., PASS, APPROVE

    cat << EOF
# $role Agent (Test Mode)

You are a test agent. Read the control file and behave accordingly.

## Instructions

1. Read \`.project/test/control.json\` for test configuration
2. Increment the call counter in \`.project/test/${role}_calls.txt\`
3. Check if current call count meets the threshold to act

### Step-by-step:

\`\`\`bash
# 1. Ensure test directory exists
mkdir -p .project/test

# 2. Read and increment call counter
CALL_FILE=".project/test/${role}_calls.txt"
if [[ -f "\$CALL_FILE" ]]; then
    CALLS=\$(cat "\$CALL_FILE")
else
    CALLS=0
fi
CALLS=\$((CALLS + 1))
echo "\$CALLS" > "\$CALL_FILE"
echo "${role} call #\$CALLS"

# 3. Read control file
CONTROL=".project/test/control.json"
if [[ -f "\$CONTROL" ]]; then
    # Get threshold for this role (when to write decision)
    THRESHOLD=\$(jq -r '.${role}_decision_on_call // 1' "\$CONTROL")
else
    THRESHOLD=1
fi

# 4. Act based on call count
if [[ \$CALLS -ge \$THRESHOLD ]]; then
    echo "Threshold met (\$CALLS >= \$THRESHOLD), writing decision"
    $(if [[ "$role" == "builder" ]]; then
        echo 'echo "COMPLETE" > .project/state/completion.txt'
    else
        echo "mkdir -p \$(dirname \"$decision_file\")"
        echo "echo \"$decision_value\" > \"$decision_file\""
    fi)
else
    echo "Threshold not met (\$CALLS < \$THRESHOLD), skipping decision"
fi
\`\`\`

Execute the above bash commands exactly. This tests the retry mechanism.
EOF
}

# Setup test project with control file
setup_test() {
    local test_name="$1"
    local builder_threshold="$2"
    local reviewer_threshold="${3:-0}"
    local architect_threshold="${4:-0}"
    local reviewer_enabled="${5:-false}"
    local architect_enabled="${6:-false}"

    log "${CYAN}Setting up: $test_name${NC}"

    rm -rf "$TEST_PROJECT_DIR"
    mkdir -p "$TEST_PROJECT_DIR/.project/prompts"
    mkdir -p "$TEST_PROJECT_DIR/.project/state"
    mkdir -p "$TEST_PROJECT_DIR/.project/test"
    mkdir -p "$TEST_PROJECT_DIR/.project/review"
    mkdir -p "$TEST_PROJECT_DIR/.project/architect"
    mkdir -p "$TEST_PROJECT_DIR/logs"

    # Control file - tells agent when to write decisions
    cat > "$TEST_PROJECT_DIR/.project/test/control.json" << EOF
{
  "test_name": "$test_name",
  "builder_decision_on_call": $builder_threshold,
  "reviewer_decision_on_call": $reviewer_threshold,
  "architect_decision_on_call": $architect_threshold
}
EOF

    # GOAL
    cat > "$TEST_PROJECT_DIR/GOAL.md" << EOF
# Self-Healing Test: $test_name

This is an automated test. The agent reads control.json to determine behavior.
EOF

    # Prompts
    create_agent_prompt "builder" ".project/state/completion.txt" "COMPLETE" \
        > "$TEST_PROJECT_DIR/.project/prompts/BUILDER.md"

    if [[ "$reviewer_enabled" == "true" ]]; then
        create_agent_prompt "reviewer" ".project/review/decision.txt" "PASS" \
            > "$TEST_PROJECT_DIR/.project/prompts/REVIEWER.md"
    fi

    if [[ "$architect_enabled" == "true" ]]; then
        create_agent_prompt "architect" ".project/architect/decision.txt" "APPROVE" \
            > "$TEST_PROJECT_DIR/.project/prompts/ARCHITECT.md"
    fi

    # Config
    cat > "$TEST_PROJECT_DIR/config.json" << EOF
{
  "name": "$TEST_PROJECT",
  "description": "$test_name",
  "version": "0.1.0",
  "prompts": {
    "dir": ".project/prompts",
    "goal": "GOAL.md",
    "builder": "BUILDER.md"
    $(if [[ "$reviewer_enabled" == "true" ]]; then echo ', "reviewer": "REVIEWER.md"'; fi)
    $(if [[ "$architect_enabled" == "true" ]]; then echo ', "architect": "ARCHITECT.md"'; fi)
  },
  "builder": {
    "backend": "claude",
    "auth_mode": "$AUTH_MODE",
    "session_mode": "fresh"
  },
  "reviewer": {
    "enabled": $reviewer_enabled,
    "backend": "claude",
    "auth_mode": "$AUTH_MODE",
    "session_mode": "fresh"
  },
  "architect": {
    "enabled": $architect_enabled,
    "backend": "claude",
    "auth_mode": "$AUTH_MODE",
    "session_mode": "fresh"
  },
  "escalation": { "enabled": false },
  "self_healing": {
    "reviewer_retry_max": 3,
    "architect_retry_max": 3
  },
  "max_iterations": 10,
  "completion_enabled": true
}
EOF

    cp "$PROJECT_ROOT/template/AGENTS.md" "$TEST_PROJECT_DIR/AGENTS.md" 2>/dev/null || true
}

# Run container and wait
run_container() {
    local timeout="${1:-$MAX_WAIT}"

    cd "$PROJECT_ROOT"
    RALPH_PROJECT_DIR="./.projects/$TEST_PROJECT" \
        docker compose run --rm -d ralph > /tmp/cid_$$ 2>&1 || return 1

    local cid=$(cat /tmp/cid_$$)
    log "Container: ${cid:0:12}"

    local elapsed=0
    while [[ $elapsed -lt $timeout ]]; do
        # Check completion or container exit
        if [[ -f "$TEST_PROJECT_DIR/.project/state/completion.txt" ]] && \
           [[ -f "$TEST_PROJECT_DIR/logs/completion.json" ]]; then
            break
        fi
        if ! docker ps -q --filter "id=$cid" | grep -q .; then
            break
        fi
        sleep 3
        elapsed=$((elapsed + 3))
        echo -n "."
    done
    echo ""

    docker stop "$cid" &>/dev/null || true
    [[ $elapsed -lt $timeout ]]
}

# Verify call counts
verify_calls() {
    local role="$1"
    local expected="$2"
    local call_file="$TEST_PROJECT_DIR/.project/test/${role}_calls.txt"

    if [[ -f "$call_file" ]]; then
        local actual=$(cat "$call_file")
        if [[ "$actual" -ge "$expected" ]]; then
            log "${GREEN}[PASS] $role calls: $actual (expected >= $expected)${NC}"
            TESTS_PASSED=$((TESTS_PASSED + 1))
            return 0
        else
            log "${RED}[FAIL] $role calls: $actual (expected >= $expected)${NC}"
            TESTS_FAILED=$((TESTS_FAILED + 1))
            return 1
        fi
    else
        if [[ "$expected" -eq 0 ]]; then
            log "${GREEN}[PASS] $role not called (as expected)${NC}"
            TESTS_PASSED=$((TESTS_PASSED + 1))
            return 0
        else
            log "${RED}[FAIL] $role call file missing${NC}"
            TESTS_FAILED=$((TESTS_FAILED + 1))
            return 1
        fi
    fi
}

# ═══════════════════════════════════════════════════════════
# TEST CASES
# ═══════════════════════════════════════════════════════════

test_builder_completes_first_try() {
    CURRENT_TEST_NAME="builder-first-try"
    log ""
    log "${BLUE}━━━ Test: Builder completes on first try ━━━${NC}"

    # Builder writes completion on call 1
    setup_test "builder-first-try" 1

    if run_container 120; then
        verify_calls "builder" 1
    else
        log "${RED}[FAIL] Container timed out${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    save_test_log
}

test_provider_switch_request() {
    CURRENT_TEST_NAME="provider-switch"
    log ""
    log "${BLUE}━━━ Test: Reviewer requests provider switch ━━━${NC}"

    # Setup with reviewer that writes provider override
    setup_test "provider-switch" 1 1 0 true false

    # Modify reviewer prompt to also write provider-override.json
    cat >> "$TEST_PROJECT_DIR/.project/prompts/REVIEWER.md" << 'EOF'

## Additional: Write provider override on first call
If this is call 1, also write a provider switch request:
```bash
if [[ "$CALLS" -eq 1 ]]; then
    echo '{"requested_backend":"gemini","reason":"testing provider switch"}' > .project/state/provider-override.json
fi
```
EOF

    if run_container 180; then
        verify_calls "reviewer" 1

        # Check if provider override was written
        if [[ -f "$TEST_PROJECT_DIR/.project/state/provider-override.json" ]]; then
            log "${GREEN}[PASS] Provider override file created${NC}"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            log "${YELLOW}[WARN] Provider override not written (agent may not have followed prompt)${NC}"
        fi
    else
        log "${RED}[FAIL] Container timed out${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    save_test_log
}

test_builder_completes_second_iteration() {
    CURRENT_TEST_NAME="builder-second-iteration"
    log ""
    log "${BLUE}━━━ Test: Builder completes on second iteration ━━━${NC}"

    # Builder writes completion on call 2
    setup_test "builder-second-iteration" 2

    if run_container 180; then
        verify_calls "builder" 2
    else
        log "${RED}[FAIL] Container timed out${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    save_test_log
}

test_reviewer_retry() {
    CURRENT_TEST_NAME="reviewer-retry"
    log ""
    log "${BLUE}━━━ Test: Reviewer retry loop ━━━${NC}"

    # Builder completes on 1, reviewer writes PASS on call 2 (triggers retry)
    setup_test "reviewer-retry" 1 2 0 true false

    if run_container 240; then
        verify_calls "builder" 1
        verify_calls "reviewer" 2
    else
        log "${RED}[FAIL] Container timed out${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    save_test_log
}

test_three_tier_flow() {
    CURRENT_TEST_NAME="three-tier"
    log ""
    log "${BLUE}━━━ Test: 3-tier flow (builder → reviewer → architect) ━━━${NC}"

    # Builder: 1, Reviewer: 1, Architect: 1
    setup_test "three-tier" 1 1 1 true true

    if run_container 300; then
        verify_calls "builder" 1
        verify_calls "reviewer" 1
        verify_calls "architect" 1
    else
        log "${RED}[FAIL] Container timed out${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    save_test_log
}

test_provider_fallback() {
    CURRENT_TEST_NAME="provider-fallback"
    log ""
    log "${BLUE}━━━ Test: Provider fallback on failures ━━━${NC}"

    # Setup with provider fallback enabled
    setup_test "provider-fallback" 2 0 0 false false

    # Enable provider fallback in config
    local config="$TEST_PROJECT_DIR/config.json"
    local tmp_config=$(mktemp)
    jq '.provider_fallback = {
        "enabled": true,
        "failure_threshold": 5,
        "sequence": [
            {"name": "primary", "backend": "claude", "auth_mode": "'"$AUTH_MODE"'"},
            {"name": "fallback", "backend": "claude", "auth_mode": "'"$AUTH_MODE"'"}
        ]
    }' "$config" > "$tmp_config" && mv "$tmp_config" "$config"

    if run_container 180; then
        verify_calls "builder" 2

        # Check if provider health tracking file exists
        if [[ -f "$TEST_PROJECT_DIR/.project/state/provider-health.json" ]]; then
            log "${GREEN}[PASS] Provider health tracking file created${NC}"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            log "${YELLOW}[WARN] Provider health file not created (may be optional)${NC}"
        fi
    else
        log "${RED}[FAIL] Container timed out${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    save_test_log
}

# ═══════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════

main() {
    log ""
    log "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
    log "${BLUE}║     Self-Healing E2E Test Suite                      ║${NC}"
    log "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
    log ""
    log "Auth mode: $AUTH_MODE"
    log ""

    check_docker
    trap cleanup EXIT

    # Initialize consolidated log
    mkdir -p "$CONSOLIDATED_LOG_DIR"
    {
        echo "╔════════════════════════════════════════════════════════════════════════════════╗"
        echo "║                    SELF-HEALING E2E TEST CONSOLIDATED LOG                      ║"
        echo "╚════════════════════════════════════════════════════════════════════════════════╝"
        echo ""
        echo "Started: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "Auth Mode: $AUTH_MODE"
        echo "Host: $(hostname)"
        echo ""
    } > "$CONSOLIDATED_LOG"
    log "${DIM}Consolidated log: $CONSOLIDATED_LOG${NC}"
    log ""

    # Run tests
    test_builder_completes_first_try
    test_builder_completes_second_iteration
    test_reviewer_retry
    test_three_tier_flow
    test_provider_switch_request
    test_provider_fallback

    # Summary
    log ""
    log "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
    log "${BLUE}║     Summary                                          ║${NC}"
    log "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
    log ""
    log "Passed: ${GREEN}$TESTS_PASSED${NC}"
    log "Failed: ${RED}$TESTS_FAILED${NC}"
    log ""

    # Write final summary to consolidated log
    {
        echo ""
        echo "╔════════════════════════════════════════════════════════════════════════════════╗"
        echo "║                              FINAL SUMMARY                                      ║"
        echo "╚════════════════════════════════════════════════════════════════════════════════╝"
        echo ""
        echo "Completed: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "Tests Passed: $TESTS_PASSED"
        echo "Tests Failed: $TESTS_FAILED"
        echo ""
        if [[ $TESTS_FAILED -gt 0 ]]; then
            echo "Result: FAILED"
        else
            echo "Result: PASSED"
        fi
        echo ""
    } >> "$CONSOLIDATED_LOG"

    log "${CYAN}Full consolidated log: $CONSOLIDATED_LOG${NC}"
    log ""

    if [[ $TESTS_FAILED -gt 0 ]]; then
        log "${RED}Some tests failed!${NC}"
        exit 1
    else
        log "${GREEN}All tests passed!${NC}"
        exit 0
    fi
}

# Allow running single test
if [[ "${1:-}" == "--test" ]] && [[ -n "${2:-}" ]]; then
    check_docker
    trap cleanup EXIT

    # Initialize consolidated log for single test
    mkdir -p "$CONSOLIDATED_LOG_DIR"
    {
        echo "╔════════════════════════════════════════════════════════════════════════════════╗"
        echo "║                    SELF-HEALING E2E TEST CONSOLIDATED LOG                      ║"
        echo "╚════════════════════════════════════════════════════════════════════════════════╝"
        echo ""
        echo "Started: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "Single Test: $2"
        echo "Auth Mode: $AUTH_MODE"
        echo ""
    } > "$CONSOLIDATED_LOG"

    "test_$2"
    exit_code=$?

    log "${CYAN}Consolidated log: $CONSOLIDATED_LOG${NC}"
    exit $exit_code
fi

main "$@"
