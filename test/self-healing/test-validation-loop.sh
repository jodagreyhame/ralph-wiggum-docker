#!/bin/bash
# test-validation-loop.sh - Tests for task validation loop
# Tests that validation loop retries until <promise>VALIDATED</promise>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source test helpers
source "$SCRIPT_DIR/lib/assertions.sh"

echo "========================================"
echo "Validation Loop Tests"
echo "========================================"
echo ""

# Test 1: Verify validation.sh exists
test_validation_exists() {
    echo "Test 1: Verify validation.sh exists"

    local validation_file="$PROJECT_ROOT/docker/lib/validation.sh"

    assert_file_exists "$validation_file" \
        "validation.sh should exist"

    echo ""
}

# Test 2: Validation checks for task specs
test_validation_checks_tasks() {
    echo "Test 2: Validation checks for task specification files"

    local validation_file="$PROJECT_ROOT/docker/lib/validation.sh"

    assert_file_contains "$validation_file" "tasks/summary.json" \
        "validation.sh should check for summary.json"

    assert_file_contains "$validation_file" "No task specs found" \
        "validation.sh should handle missing task specs"

    echo ""
}

# Test 3: Validation uses RALPH_VALIDATION_ENABLED
test_validation_uses_enabled_flag() {
    echo "Test 3: Validation uses RALPH_VALIDATION_ENABLED flag"

    local validation_file="$PROJECT_ROOT/docker/lib/validation.sh"

    assert_file_contains "$validation_file" "RALPH_VALIDATION_ENABLED" \
        "validation.sh should use RALPH_VALIDATION_ENABLED"

    assert_file_contains "$validation_file" 'VALIDATION_ENABLED.*!=.*true' \
        "validation.sh should skip when disabled"

    echo ""
}

# Test 4: Validation retries with --continue
test_validation_retries() {
    echo "Test 4: Validation retries with --continue flag"

    local validation_file="$PROJECT_ROOT/docker/lib/validation.sh"

    assert_file_contains "$validation_file" "--continue" \
        "validation.sh should use --continue for retries"

    assert_file_contains "$validation_file" "attempt -gt 1" \
        "validation.sh should check attempt number"

    echo ""
}

# Test 5: Validation checks for VALIDATED signal
test_validation_checks_signal() {
    echo "Test 5: Validation checks for <promise>VALIDATED</promise> signal"

    local validation_file="$PROJECT_ROOT/docker/lib/validation.sh"

    assert_file_contains "$validation_file" "<promise>VALIDATED</promise>" \
        "validation.sh should check for VALIDATED signal"

    echo ""
}

# Test 6: Validation has max attempts
test_validation_max_attempts() {
    echo "Test 6: Validation has maximum attempts limit"

    local validation_file="$PROJECT_ROOT/docker/lib/validation.sh"

    assert_file_contains "$validation_file" "RALPH_VALIDATION_MAX_ATTEMPTS" \
        "validation.sh should use RALPH_VALIDATION_MAX_ATTEMPTS"

    assert_file_contains "$validation_file" "Validation failed after" \
        "validation.sh should report failure after max attempts"

    echo ""
}

# Test 7: Validation is integrated in ralph.sh
test_validation_integrated() {
    echo "Test 7: Validation is integrated in ralph.sh"

    local ralph_file="$PROJECT_ROOT/docker/ralph.sh"

    assert_file_contains "$ralph_file" 'source "\$SCRIPT_DIR/lib/validation.sh"' \
        "ralph.sh should source validation.sh"

    assert_file_contains "$ralph_file" "run_validation_loop" \
        "ralph.sh should call run_validation_loop"

    echo ""
}

# Test 8: Validation exits on failure
test_validation_exits_on_failure() {
    echo "Test 8: Validation exits on failure"

    local ralph_file="$PROJECT_ROOT/docker/ralph.sh"

    assert_file_contains "$ralph_file" "Task validation failed - exiting" \
        "ralph.sh should exit on validation failure"

    echo ""
}

# Run all tests
test_validation_exists
test_validation_checks_tasks
test_validation_uses_enabled_flag
test_validation_retries
test_validation_checks_signal
test_validation_max_attempts
test_validation_integrated
test_validation_exits_on_failure

# Print summary
print_test_summary
exit_code=$?

exit $exit_code
