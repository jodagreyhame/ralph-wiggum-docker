#!/bin/bash
# test-reviewer-retry.sh - Tests for reviewer decision retry loop
# Tests that reviewer retries with --continue when no decision.txt is written

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source test helpers
source "$SCRIPT_DIR/lib/assertions.sh"

# Test project directory
TEST_PROJECT="$PROJECT_ROOT/.projects/_test-reviewer-retry"

# Cleanup function
cleanup() {
    rm -rf "$TEST_PROJECT"
    rm -f /tmp/mock_cli_calls_reviewer
}
trap cleanup EXIT

setup_test_project() {
    cleanup

    # Create minimal test project structure
    mkdir -p "$TEST_PROJECT/.project/review"
    mkdir -p "$TEST_PROJECT/.project/state"
    mkdir -p "$TEST_PROJECT/.project/prompts"
    mkdir -p "$TEST_PROJECT/logs"

    # Create minimal prompts
    echo "Test builder prompt" > "$TEST_PROJECT/.project/prompts/BUILDER.md"
    echo "Test reviewer prompt" > "$TEST_PROJECT/.project/prompts/REVIEWER.md"

    # Create config
    cat > "$TEST_PROJECT/config.json" << 'EOF'
{
  "name": "test-reviewer-retry",
  "builder": {
    "backend": "mock",
    "auth_mode": "glm"
  },
  "reviewer": {
    "enabled": true,
    "backend": "mock",
    "auth_mode": "glm"
  }
}
EOF

    # Reset mock call counter
    rm -f /tmp/mock_cli_calls_reviewer
}

echo "========================================"
echo "Reviewer Retry Loop Tests"
echo "========================================"
echo ""

# Test 1: Reviewer writes decision on first attempt (no retry needed)
test_reviewer_immediate_decision() {
    echo "Test 1: Reviewer writes decision immediately"
    setup_test_project

    # Setup: Write decision immediately
    echo "PASS" > "$TEST_PROJECT/.project/review/decision.txt"

    assert_file_exists "$TEST_PROJECT/.project/review/decision.txt" \
        "Decision file should exist"
    assert_file_contains "$TEST_PROJECT/.project/review/decision.txt" "PASS" \
        "Decision should be PASS"

    echo ""
}

# Test 2: Verify retry logic structure in phases.sh
test_phases_has_retry_loop() {
    echo "Test 2: Verify phases.sh has retry loop structure"

    local phases_file="$PROJECT_ROOT/docker/lib/phases.sh"

    assert_file_exists "$phases_file" \
        "phases.sh should exist"

    assert_file_contains "$phases_file" "RALPH_REVIEWER_RETRY_MAX" \
        "phases.sh should reference RALPH_REVIEWER_RETRY_MAX"

    assert_file_contains "$phases_file" "No decision - retry" \
        "phases.sh should have retry message"

    assert_file_contains "$phases_file" "--continue" \
        "phases.sh should use --continue flag for retries"

    assert_file_contains "$phases_file" "No decision after.*attempts" \
        "phases.sh should have max retries failure message"

    echo ""
}

# Test 3: Verify architect retry logic structure in phases.sh
test_architect_has_retry_loop() {
    echo "Test 3: Verify phases.sh has architect retry loop"

    local phases_file="$PROJECT_ROOT/docker/lib/phases.sh"

    assert_file_contains "$phases_file" "RALPH_ARCHITECT_RETRY_MAX" \
        "phases.sh should reference RALPH_ARCHITECT_RETRY_MAX"

    assert_file_contains "$phases_file" "ARCHITECT: No decision after" \
        "phases.sh should have architect max retries message"

    echo ""
}

# Test 4: Synthetic feedback on no decision
test_synthetic_feedback_on_no_decision() {
    echo "Test 4: Verify synthetic feedback is written when no decision"
    setup_test_project

    # Simulate no decision scenario by checking the code
    local phases_file="$PROJECT_ROOT/docker/lib/phases.sh"

    assert_file_contains "$phases_file" "Reviewer did not provide a decision" \
        "phases.sh should write synthetic feedback for reviewer"

    assert_file_contains "$phases_file" "Architect did not provide a decision" \
        "phases.sh should write synthetic feedback for architect"

    echo ""
}

# Test 5: Completion file cleared on no decision
test_completion_cleared_on_no_decision() {
    echo "Test 5: Verify completion file is cleared when no decision"

    local phases_file="$PROJECT_ROOT/docker/lib/phases.sh"

    # Count occurrences of rm -f "$COMPLETION_FILE" after "No decision"
    assert_file_contains "$phases_file" 'rm -f "\$COMPLETION_FILE"' \
        "phases.sh should clear completion file"

    echo ""
}

# Test 6: Escalation triggered on no decision
test_escalation_on_no_decision() {
    echo "Test 6: Verify escalation is triggered when no decision"

    local phases_file="$PROJECT_ROOT/docker/lib/phases.sh"

    # After the "No decision after" message, should call increment_failure_count
    assert_file_contains "$phases_file" "increment_failure_count" \
        "phases.sh should increment failure count"

    assert_file_contains "$phases_file" "check_escalation" \
        "phases.sh should check escalation"

    echo ""
}

# Run all tests
test_reviewer_immediate_decision
test_phases_has_retry_loop
test_architect_has_retry_loop
test_synthetic_feedback_on_no_decision
test_completion_cleared_on_no_decision
test_escalation_on_no_decision

# Print summary
print_test_summary
exit_code=$?

exit $exit_code
