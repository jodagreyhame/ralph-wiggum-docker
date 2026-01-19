#!/bin/bash
# Test assertion helpers for self-healing loop tests

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Assert that a file exists
assert_file_exists() {
    local file="$1"
    local message="${2:-File should exist: $file}"

    if [[ -f "$file" ]]; then
        echo -e "${GREEN}[PASS]${NC} $message"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}[FAIL]${NC} $message"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Assert that a file does not exist
assert_file_not_exists() {
    local file="$1"
    local message="${2:-File should not exist: $file}"

    if [[ ! -f "$file" ]]; then
        echo -e "${GREEN}[PASS]${NC} $message"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}[FAIL]${NC} $message"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Assert that a file contains a pattern
assert_file_contains() {
    local file="$1"
    local pattern="$2"
    local message="${3:-File should contain pattern: $pattern}"

    if grep -q -- "$pattern" "$file" 2>/dev/null; then
        echo -e "${GREEN}[PASS]${NC} $message"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}[FAIL]${NC} $message"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Assert that a file does not contain a pattern
assert_file_not_contains() {
    local file="$1"
    local pattern="$2"
    local message="${3:-File should not contain pattern: $pattern}"

    if ! grep -q -- "$pattern" "$file" 2>/dev/null; then
        echo -e "${GREEN}[PASS]${NC} $message"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}[FAIL]${NC} $message"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Assert that output contains a pattern
assert_output_contains() {
    local output="$1"
    local pattern="$2"
    local message="${3:-Output should contain: $pattern}"

    if echo "$output" | grep -q "$pattern"; then
        echo -e "${GREEN}[PASS]${NC} $message"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}[FAIL]${NC} $message"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Assert exit code
assert_exit_code() {
    local expected="$1"
    local actual="$2"
    local message="${3:-Exit code should be $expected}"

    if [[ "$actual" -eq "$expected" ]]; then
        echo -e "${GREEN}[PASS]${NC} $message"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}[FAIL]${NC} $message (got $actual)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Assert JSON field value
assert_json_value() {
    local file="$1"
    local field="$2"
    local expected="$3"
    local message="${4:-JSON field $field should be $expected}"

    local actual
    actual=$(jq -r "$field" "$file" 2>/dev/null)

    if [[ "$actual" == "$expected" ]]; then
        echo -e "${GREEN}[PASS]${NC} $message"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}[FAIL]${NC} $message (got $actual)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Print test summary
print_test_summary() {
    local total=$((TESTS_PASSED + TESTS_FAILED))
    echo ""
    echo "================================"
    echo "Test Summary"
    echo "================================"
    echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
    echo "Total:  $total"
    echo "================================"

    if [[ $TESTS_FAILED -gt 0 ]]; then
        return 1
    fi
    return 0
}

# Reset test counters
reset_test_counters() {
    TESTS_PASSED=0
    TESTS_FAILED=0
}
