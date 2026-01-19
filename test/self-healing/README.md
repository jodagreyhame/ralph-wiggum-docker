# Self-Healing Loop Tests

This directory contains tests for Ralph Loop's self-healing mechanisms - automatic retry and recovery systems that handle failures gracefully.

## What Are Self-Healing Loops?

Self-healing loops are retry mechanisms that automatically recover from common failure modes:

| Loop | Trigger | Recovery Action |
|------|---------|-----------------|
| **Reviewer Retry** | No `decision.txt` written | Retry with `--continue`, prompt for decision |
| **Architect Retry** | No `decision.txt` written | Retry with `--continue`, prompt for decision |
| **Pre-flight** | Missing prompts/backends | Fail fast before main loop starts |
| **Validation** | Invalid task specs | Retry until `<promise>VALIDATED</promise>` |
| **Verify** | Build/test failures | Retry verification, trigger remediation |
| **Remediation** | Environment issues | Auto-fix dependencies, retry verify |
| **Provider Fallback** | Repeated CLI failures | Switch to next provider in sequence |
| **Provider Switch** | Reviewer/architect request | Override provider via `provider-override.json` |

## Running Tests

```bash
# Unit tests (no Docker required)
bash -c 'source test/self-healing/run-all.sh'

# Individual unit test suites
bash -c 'source test/self-healing/test-preflight.sh'
bash -c 'source test/self-healing/test-reviewer-retry.sh'
bash -c 'source test/self-healing/test-validation-loop.sh'
bash -c 'source test/self-healing/test-verify-loop.sh'

# E2E tests (requires Docker + auth)
./test/self-healing/e2e/test-self-healing-e2e.sh

# E2E with specific auth
TEST_AUTH_MODE=glm ./test/self-healing/e2e/test-self-healing-e2e.sh
```

> **Note:** On Windows, use `bash -c 'source ...'` pattern due to path handling differences.

## Test Structure

```
test/self-healing/
├── README.md                    # This file
├── run-all.sh                   # Unit test runner
├── lib/
│   ├── assertions.sh            # Test assertion helpers
│   └── mock-cli.sh              # Mock CLI for simulating failures
├── test-preflight.sh            # Pre-flight validation tests (18 tests)
├── test-reviewer-retry.sh       # Reviewer retry loop tests (14 tests)
├── test-validation-loop.sh      # Validation loop tests (13 tests)
├── test-verify-loop.sh          # Verify/remediation tests (24 tests)
└── e2e/                         # E2E tests with real agents
    ├── README.md                # E2E test documentation
    └── test-self-healing-e2e.sh # Comprehensive E2E test (6 tests)
                                 # - builder_completes_first_try
                                 # - builder_completes_second_iteration
                                 # - reviewer_retry
                                 # - three_tier_flow
                                 # - provider_switch_request
                                 # - provider_fallback
```

## Test Files

### test-preflight.sh

Tests pre-flight validation that runs before the main loop:

- Verifies `preflight.sh` exists and is sourced
- Checks builder prompt validation
- Checks reviewer/architect prompt validation when enabled
- Checks CLI backend existence validation
- Checks auth credential warnings
- Checks state directory creation
- Verifies integration in `ralph.sh`

### test-reviewer-retry.sh

Tests the reviewer decision retry loop:

- Verifies retry loop structure in `phases.sh`
- Checks `RALPH_REVIEWER_RETRY_MAX` configuration
- Verifies `--continue` flag usage on retries
- Checks synthetic feedback generation when no decision
- Verifies completion file is cleared on failure
- Checks escalation trigger on repeated failures

### test-validation-loop.sh

Tests task specification validation:

- Verifies `validation.sh` exists and is sourced
- Checks `RALPH_VALIDATION_ENABLED` flag
- Verifies task spec file checking (`summary.json`)
- Checks `--continue` flag usage on retries
- Verifies `<promise>VALIDATED</promise>` signal detection
- Checks max attempts limit
- Verifies integration in `ralph.sh`

### test-verify-loop.sh

Tests build/test verification and remediation:

- Verifies `verify.sh` exists and is sourced
- Checks `RALPH_VERIFY_ENABLED` flag
- Verifies signal detection: `<verify>PASS|FAIL|BLOCKED</verify>`
- Checks `--continue` flag usage on retries
- Verifies max attempts limit
- Checks remediation loop structure
- Verifies `<remediate>DONE|BLOCKED</remediate>` signals
- Checks remediation trigger on BLOCKED
- Verifies log file creation
- Checks completion file clearing on failure

## Assertion Library

The `lib/assertions.sh` provides test helpers:

```bash
# File assertions
assert_file_exists "$file" "message"
assert_file_not_exists "$file" "message"
assert_file_contains "$file" "pattern" "message"
assert_file_not_contains "$file" "pattern" "message"

# Output assertions
assert_output_contains "$output" "pattern" "message"
assert_exit_code "$expected" "$actual" "message"
assert_json_value "$file" ".field" "expected" "message"

# Test summary
print_test_summary  # Prints passed/failed counts, returns exit code
reset_test_counters # Reset TESTS_PASSED and TESTS_FAILED
```

## Mock CLI

The `lib/mock-cli.sh` simulates CLI behavior for testing:

```bash
# Environment variables control behavior:
MOCK_FAIL_COUNT=2        # Fail first N calls
MOCK_WRITE_DECISION=yes  # Write decision.txt (yes/no/delayed)
MOCK_DECISION=PASS       # Decision value (PASS/FAIL/APPROVE/REJECT)
MOCK_WRITE_SIGNAL="<verify>PASS</verify>"  # Signal to output

# Call tracking
# Writes call count to /tmp/mock_cli_calls
```

### Mock CLI Examples

```bash
# Simulate reviewer that writes PASS immediately
MOCK_WRITE_DECISION=yes MOCK_DECISION=PASS ./lib/mock-cli.sh

# Simulate reviewer that fails twice, then succeeds
MOCK_FAIL_COUNT=2 MOCK_WRITE_DECISION=yes ./lib/mock-cli.sh

# Simulate delayed decision (writes on 2nd call)
MOCK_WRITE_DECISION=delayed MOCK_DECISION=PASS ./lib/mock-cli.sh

# Simulate verifier that returns PASS
MOCK_WRITE_SIGNAL="<verify>PASS</verify>" ./lib/mock-cli.sh
```

## Adding New Tests

1. Create a new test file: `test-<feature>.sh`
2. Follow this template:

```bash
#!/bin/bash
# test-<feature>.sh - Description
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$SCRIPT_DIR/lib/assertions.sh"

echo "========================================"
echo "Feature Tests"
echo "========================================"
echo ""

# Test 1: Description
test_something() {
    echo "Test 1: Description"

    local file="$PROJECT_ROOT/path/to/file.sh"

    assert_file_exists "$file" \
        "file should exist"

    assert_file_contains "$file" "pattern" \
        "file should contain pattern"

    echo ""
}

# Run tests
test_something

# Summary
print_test_summary
exit $?
```

3. The test will be auto-discovered by `run-all.sh` (matches `test-*.sh`)

## Environment Variables

These control self-healing behavior (set in `config.json` or environment):

| Variable | Default | Description |
|----------|---------|-------------|
| `RALPH_REVIEWER_RETRY_MAX` | `3` | Max reviewer decision retries |
| `RALPH_ARCHITECT_RETRY_MAX` | `3` | Max architect decision retries |
| `RALPH_VALIDATION_ENABLED` | `false` | Enable task validation loop |
| `RALPH_VALIDATION_MAX_ATTEMPTS` | `5` | Max validation attempts |
| `RALPH_VERIFY_ENABLED` | `false` | Enable build/test verification |
| `RALPH_VERIFY_AGENT_MAX` | `3` | Max verification attempts |
| `RALPH_ENABLE_REMEDIATION` | `false` | Enable auto-remediation |
| `RALPH_REMEDIATE_MAX` | `2` | Max remediation attempts |

## Signal Reference

### Reviewer/Architect Decisions

Written to `.project/review/decision.txt` or `.project/architect/decision.txt`:

| Signal | Meaning |
|--------|---------|
| `PASS` | Reviewer approves work |
| `FAIL` | Reviewer rejects work (feedback in `feedback.md`) |
| `APPROVE` | Architect approves work |
| `REJECT` | Architect rejects work (feedback in `feedback.md`) |

### Validation Signal

Output by agent, detected in stdout:

```
<promise>VALIDATED</promise>
```

### Verify Signals

Output by agent, detected in stdout:

| Signal | Meaning |
|--------|---------|
| `<verify>PASS</verify>` | Build/tests pass |
| `<verify>FAIL</verify>` | Build/tests fail, retry |
| `<verify>BLOCKED</verify>` | Environment issue, trigger remediation |

### Remediation Signals

Output by agent, detected in stdout:

| Signal | Meaning |
|--------|---------|
| `<remediate>DONE</remediate>` | Environment fixed |
| `<remediate>BLOCKED</remediate>` | Cannot fix, give up |

## Debugging

```bash
# Run with bash tracing
bash -x test/self-healing/test-preflight.sh

# Check specific file patterns
grep -n "pattern" docker/lib/phases.sh

# Verify bash syntax
bash -n docker/lib/verify.sh
```
