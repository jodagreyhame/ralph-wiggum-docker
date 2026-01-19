#!/bin/bash
# test-preflight.sh - Tests for pre-flight validation
# Tests that preflight validation catches missing files and invalid configs

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source test helpers
source "$SCRIPT_DIR/lib/assertions.sh"

echo "========================================"
echo "Pre-flight Validation Tests"
echo "========================================"
echo ""

# Test 1: Verify preflight.sh exists
test_preflight_exists() {
    echo "Test 1: Verify preflight.sh exists"

    local preflight_file="$PROJECT_ROOT/docker/lib/preflight.sh"

    assert_file_exists "$preflight_file" \
        "preflight.sh should exist"

    echo ""
}

# Test 2: Preflight checks builder prompt
test_preflight_checks_builder_prompt() {
    echo "Test 2: Preflight checks builder prompt exists"

    local preflight_file="$PROJECT_ROOT/docker/lib/preflight.sh"

    assert_file_contains "$preflight_file" "Builder prompt not found" \
        "preflight.sh should check builder prompt"

    assert_file_contains "$preflight_file" '"\$PROMPT_FILE"' \
        "preflight.sh should reference PROMPT_FILE"

    echo ""
}

# Test 3: Preflight checks reviewer prompt when enabled
test_preflight_checks_reviewer_prompt() {
    echo "Test 3: Preflight checks reviewer prompt when enabled"

    local preflight_file="$PROJECT_ROOT/docker/lib/preflight.sh"

    assert_file_contains "$preflight_file" "Reviewer prompt not found" \
        "preflight.sh should check reviewer prompt"

    assert_file_contains "$preflight_file" 'REVIEWER_ENABLED.*true' \
        "preflight.sh should check if reviewer is enabled"

    echo ""
}

# Test 4: Preflight checks architect prompt when enabled
test_preflight_checks_architect_prompt() {
    echo "Test 4: Preflight checks architect prompt when enabled"

    local preflight_file="$PROJECT_ROOT/docker/lib/preflight.sh"

    assert_file_contains "$preflight_file" "Architect prompt not found" \
        "preflight.sh should check architect prompt"

    assert_file_contains "$preflight_file" 'ARCHITECT_ENABLED.*true' \
        "preflight.sh should check if architect is enabled"

    echo ""
}

# Test 5: Preflight checks CLI backend exists
test_preflight_checks_cli_backend() {
    echo "Test 5: Preflight checks CLI backend exists"

    local preflight_file="$PROJECT_ROOT/docker/lib/preflight.sh"

    assert_file_contains "$preflight_file" "CLI backend not found" \
        "preflight.sh should check CLI backend"

    assert_file_contains "$preflight_file" "Available:" \
        "preflight.sh should list available backends on error"

    echo ""
}

# Test 6: Preflight checks auth credentials (warnings)
test_preflight_checks_credentials() {
    echo "Test 6: Preflight checks auth credentials"

    local preflight_file="$PROJECT_ROOT/docker/lib/preflight.sh"

    assert_file_contains "$preflight_file" "anthropic-oauth" \
        "preflight.sh should check anthropic-oauth"

    assert_file_contains "$preflight_file" "gemini-oauth" \
        "preflight.sh should check gemini-oauth"

    assert_file_contains "$preflight_file" "glm" \
        "preflight.sh should check glm"

    assert_file_contains "$preflight_file" "warning" \
        "preflight.sh should use warnings for credentials"

    echo ""
}

# Test 7: Preflight creates state directory
test_preflight_creates_state_dir() {
    echo "Test 7: Preflight creates state directory if missing"

    local preflight_file="$PROJECT_ROOT/docker/lib/preflight.sh"

    assert_file_contains "$preflight_file" 'mkdir -p "\$PROJECT_STATE_DIR/state"' \
        "preflight.sh should create state directory"

    echo ""
}

# Test 8: Preflight exits on errors
test_preflight_exits_on_errors() {
    echo "Test 8: Preflight exits with code 1 on errors"

    local preflight_file="$PROJECT_ROOT/docker/lib/preflight.sh"

    assert_file_contains "$preflight_file" "exit 1" \
        "preflight.sh should exit 1 on errors"

    assert_file_contains "$preflight_file" "Pre-flight failed" \
        "preflight.sh should log failure message"

    echo ""
}

# Test 9: Preflight is integrated in ralph.sh
test_preflight_integrated() {
    echo "Test 9: Preflight is integrated in ralph.sh"

    local ralph_file="$PROJECT_ROOT/docker/ralph.sh"

    assert_file_contains "$ralph_file" 'source "\$SCRIPT_DIR/lib/preflight.sh"' \
        "ralph.sh should source preflight.sh"

    assert_file_contains "$ralph_file" "validate_preflight" \
        "ralph.sh should call validate_preflight"

    echo ""
}

# Run all tests
test_preflight_exists
test_preflight_checks_builder_prompt
test_preflight_checks_reviewer_prompt
test_preflight_checks_architect_prompt
test_preflight_checks_cli_backend
test_preflight_checks_credentials
test_preflight_creates_state_dir
test_preflight_exits_on_errors
test_preflight_integrated

# Print summary
print_test_summary
exit_code=$?

exit $exit_code
