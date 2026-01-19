# Self-Healing E2E Tests

End-to-end tests that run real agents in Docker to verify self-healing loops.

## How It Works

1. **Control file**: Test creates `.project/test/control.json` with thresholds
2. **Agent reads control**: Agent prompt tells it to read control file
3. **Call counting**: Agent increments `.project/test/{role}_calls.txt` each call
4. **Conditional behavior**: Agent only writes decision when call count >= threshold
5. **Verification**: Test script checks call counts match expectations

## Example

```json
// .project/test/control.json
{
  "builder_decision_on_call": 1,    // Builder signals complete on call 1
  "reviewer_decision_on_call": 2,   // Reviewer writes PASS on call 2 (retry!)
  "architect_decision_on_call": 1   // Architect writes APPROVE on call 1
}
```

With `reviewer_decision_on_call: 2`:
- Call 1: Reviewer runs, doesn't write decision.txt
- Ralph detects missing decision, retries with `--continue`
- Call 2: Reviewer runs again, writes PASS
- Test verifies `reviewer_calls.txt` contains "2"

## Running Tests

```bash
# All e2e tests (requires Docker + auth)
./test/self-healing/e2e/test-self-healing-e2e.sh

# With specific auth mode
TEST_AUTH_MODE=glm ./test/self-healing/e2e/test-self-healing-e2e.sh

# Single test
./test/self-healing/e2e/test-self-healing-e2e.sh --test builder_completes_first_try
./test/self-healing/e2e/test-self-healing-e2e.sh --test reviewer_retry
```

## Test Cases

| Test | Description | Expected Calls |
|------|-------------|----------------|
| `builder_completes_first_try` | Builder signals complete immediately | builder: 1 |
| `builder_completes_second_iteration` | Builder needs 2 iterations | builder: 2 |
| `reviewer_retry` | Reviewer doesn't write decision on first call | reviewer: 2 |
| `three_tier_flow` | Full builder → reviewer → architect flow | all: 1 |
| `provider_switch_request` | Reviewer requests provider change via override file | reviewer: 1 |
| `provider_fallback` | Provider fallback on failures with health tracking | builder: 2 |

## Files Created During Test

```
.projects/_e2e-self-healing-*/
├── .project/
│   ├── test/
│   │   ├── control.json         # Test configuration
│   │   ├── builder_calls.txt    # Builder call count
│   │   ├── reviewer_calls.txt   # Reviewer call count
│   │   └── architect_calls.txt  # Architect call count
│   ├── state/
│   │   ├── completion.txt       # Builder completion signal
│   │   ├── provider-override.json  # Provider switch request (if written)
│   │   └── provider-health.json    # Provider health tracking
│   ├── review/
│   │   └── decision.txt         # Reviewer decision
│   └── architect/
│       └── decision.txt         # Architect decision
└── logs/
    └── iteration_*/             # Per-iteration logs
```

## Consolidated Test Log

Each test run generates a consolidated log file at:
```
test/self-healing/e2e/logs/e2e-test-YYYYMMDD-HHMMSS.log
```

The consolidated log contains:
- **Header**: Timestamp, auth mode, host
- **Per-test sections**: Control file, call counts, decisions
- **Per-iteration logs**: Duration, exit code, builder/reviewer/architect output
- **Final summary**: Pass/fail counts, overall result

Example structure:
```
╔════════════════════════════════════════════════════════════════════════════════╗
║                    SELF-HEALING E2E TEST CONSOLIDATED LOG                      ║
╚════════════════════════════════════════════════════════════════════════════════╝

Started: 2026-01-19 12:30:00
Auth Mode: anthropic-oauth

════════════════════════════════════════════════════════════════════════════════
TEST: builder-first-try
════════════════════════════════════════════════════════════════════════════════
┌─────────────────────────────────────────────────────────────────────────────┐
│ CONTROL FILE                                                                │
└─────────────────────────────────────────────────────────────────────────────┘
{ "builder_decision_on_call": 1 }

┌─────────────────────────────────────────────────────────────────────────────┐
│ CALL COUNTS                                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
  builder: 1 calls

┌─────────────────────────────────────────────────────────────────────────────┐
│ ITERATION 001                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
Duration: 45s
Exit code: 0

── Builder Output ──
(truncated agent output...)

... (more tests) ...

╔════════════════════════════════════════════════════════════════════════════════╗
║                              FINAL SUMMARY                                      ║
╚════════════════════════════════════════════════════════════════════════════════╝
Tests Passed: 6
Tests Failed: 0
Result: PASSED
```

## Debugging Failed Tests

```bash
# View consolidated log (recommended)
cat test/self-healing/e2e/logs/e2e-test-*.log | less

# Check call counts
cat .projects/_e2e-*/.project/test/*_calls.txt

# Check control file
cat .projects/_e2e-*/.project/test/control.json

# Check logs
tail -100 .projects/_e2e-*/logs/iteration_001/output.readable

# Check reviewer logs
cat .projects/_e2e-*/logs/iteration_001/reviewer.readable
```

## Adding New Tests

```bash
test_my_new_scenario() {
    log "${BLUE}━━━ Test: My new scenario ━━━${NC}"

    # setup_test <name> <builder_threshold> <reviewer_threshold> <architect_threshold> <reviewer_enabled> <architect_enabled>
    setup_test "my-scenario" 1 3 0 true false  # Reviewer needs 3 calls

    if run_container 180; then
        verify_calls "builder" 1
        verify_calls "reviewer" 3  # Should be called 3 times
    else
        log "${RED}[FAIL] Container timed out${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}
```

## Prerequisites

- Docker running
- Valid auth credentials (set `TEST_AUTH_MODE` or defaults to `anthropic-oauth`)
- Docker image built: `docker compose build`
