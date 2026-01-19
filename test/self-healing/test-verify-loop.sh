#!/bin/bash
# test-verify-loop.sh - Tests for verification and remediation loops
# Tests that verify loop runs build/test validation with retry

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source test helpers
source "$SCRIPT_DIR/lib/assertions.sh"

echo "========================================"
echo "Verify & Remediation Loop Tests"
echo "========================================"
echo ""

# Test 1: Verify verify.sh exists
test_verify_exists() {
    echo "Test 1: Verify verify.sh exists"

    local verify_file="$PROJECT_ROOT/docker/lib/verify.sh"

    assert_file_exists "$verify_file" \
        "verify.sh should exist"

    echo ""
}

# Test 2: Verify uses RALPH_VERIFY_ENABLED
test_verify_uses_enabled_flag() {
    echo "Test 2: Verify uses RALPH_VERIFY_ENABLED flag"

    local verify_file="$PROJECT_ROOT/docker/lib/verify.sh"

    assert_file_contains "$verify_file" "RALPH_VERIFY_ENABLED" \
        "verify.sh should use RALPH_VERIFY_ENABLED"

    assert_file_contains "$verify_file" 'VERIFY_ENABLED.*!=.*true' \
        "verify.sh should skip when disabled"

    echo ""
}

# Test 3: Verify checks for PASS/FAIL/BLOCKED signals
test_verify_checks_signals() {
    echo "Test 3: Verify checks for PASS/FAIL/BLOCKED signals"

    local verify_file="$PROJECT_ROOT/docker/lib/verify.sh"

    assert_file_contains "$verify_file" "<verify>PASS</verify>" \
        "verify.sh should check for PASS signal"

    assert_file_contains "$verify_file" "<verify>FAIL</verify>" \
        "verify.sh should check for FAIL signal"

    assert_file_contains "$verify_file" "<verify>BLOCKED</verify>" \
        "verify.sh should check for BLOCKED signal"

    echo ""
}

# Test 4: Verify retries with --continue
test_verify_retries() {
    echo "Test 4: Verify retries with --continue flag"

    local verify_file="$PROJECT_ROOT/docker/lib/verify.sh"

    assert_file_contains "$verify_file" "--continue" \
        "verify.sh should use --continue for retries"

    assert_file_contains "$verify_file" "attempt -gt 1" \
        "verify.sh should check attempt number"

    echo ""
}

# Test 5: Verify has max attempts
test_verify_max_attempts() {
    echo "Test 5: Verify has maximum attempts limit"

    local verify_file="$PROJECT_ROOT/docker/lib/verify.sh"

    assert_file_contains "$verify_file" "RALPH_VERIFY_AGENT_MAX" \
        "verify.sh should use RALPH_VERIFY_AGENT_MAX"

    assert_file_contains "$verify_file" "Verification FAILED after" \
        "verify.sh should report failure after max attempts"

    echo ""
}

# Test 6: Remediation loop exists
test_remediation_exists() {
    echo "Test 6: Remediation loop exists in verify.sh"

    local verify_file="$PROJECT_ROOT/docker/lib/verify.sh"

    assert_file_contains "$verify_file" "run_remediation_loop" \
        "verify.sh should have run_remediation_loop function"

    assert_file_contains "$verify_file" "RALPH_ENABLE_REMEDIATION" \
        "verify.sh should use RALPH_ENABLE_REMEDIATION"

    echo ""
}

# Test 7: Remediation checks for DONE/BLOCKED signals
test_remediation_checks_signals() {
    echo "Test 7: Remediation checks for DONE/BLOCKED signals"

    local verify_file="$PROJECT_ROOT/docker/lib/verify.sh"

    assert_file_contains "$verify_file" "<remediate>DONE</remediate>" \
        "verify.sh should check for remediation DONE signal"

    assert_file_contains "$verify_file" "<remediate>BLOCKED</remediate>" \
        "verify.sh should check for remediation BLOCKED signal"

    echo ""
}

# Test 8: Remediation has max attempts
test_remediation_max_attempts() {
    echo "Test 8: Remediation has maximum attempts limit"

    local verify_file="$PROJECT_ROOT/docker/lib/verify.sh"

    assert_file_contains "$verify_file" "RALPH_REMEDIATE_MAX" \
        "verify.sh should use RALPH_REMEDIATE_MAX"

    assert_file_contains "$verify_file" "Remediation failed after" \
        "verify.sh should report remediation failure"

    echo ""
}

# Test 9: Verify triggers remediation on BLOCKED
test_verify_triggers_remediation() {
    echo "Test 9: Verify triggers remediation on BLOCKED"

    local verify_file="$PROJECT_ROOT/docker/lib/verify.sh"

    assert_file_contains "$verify_file" "BLOCKED.*attempting remediation" \
        "verify.sh should attempt remediation on BLOCKED"

    assert_file_contains "$verify_file" "Remediation succeeded" \
        "verify.sh should log remediation success"

    echo ""
}

# Test 10: Verify is integrated in ralph.sh
test_verify_integrated() {
    echo "Test 10: Verify is integrated in ralph.sh"

    local ralph_file="$PROJECT_ROOT/docker/ralph.sh"

    assert_file_contains "$ralph_file" 'source "\$SCRIPT_DIR/lib/verify.sh"' \
        "ralph.sh should source verify.sh"

    assert_file_contains "$ralph_file" "run_verify_loop" \
        "ralph.sh should call run_verify_loop"

    echo ""
}

# Test 11: Verify clears completion on failure
test_verify_clears_completion() {
    echo "Test 11: Verify clears completion file on failure"

    local ralph_file="$PROJECT_ROOT/docker/ralph.sh"

    assert_file_contains "$ralph_file" "Verification failed - builder must retry" \
        "ralph.sh should log verification failure"

    assert_file_contains "$ralph_file" 'rm -f "\$COMPLETION_FILE"' \
        "ralph.sh should clear completion file on verify failure"

    echo ""
}

# Test 12: Verify logs are written
test_verify_logs() {
    echo "Test 12: Verify writes log files"

    local verify_file="$PROJECT_ROOT/docker/lib/verify.sh"

    assert_file_contains "$verify_file" 'verify_log="\$iter_dir/verify_' \
        "verify.sh should create verify log files"

    assert_file_contains "$verify_file" 'remediate_log="\$iter_dir/remediate_' \
        "verify.sh should create remediate log files"

    echo ""
}

# Run all tests
test_verify_exists
test_verify_uses_enabled_flag
test_verify_checks_signals
test_verify_retries
test_verify_max_attempts
test_remediation_exists
test_remediation_checks_signals
test_remediation_max_attempts
test_verify_triggers_remediation
test_verify_integrated
test_verify_clears_completion
test_verify_logs

# Print summary
print_test_summary
exit_code=$?

exit $exit_code
