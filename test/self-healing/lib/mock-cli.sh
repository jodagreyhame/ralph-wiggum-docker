#!/bin/bash
# Mock CLI for testing self-healing loops
# Controlled via environment variables:
#   MOCK_FAIL_COUNT       - Fail this many times before succeeding
#   MOCK_WRITE_DECISION   - Write decision.txt (yes/no/delayed/never)
#   MOCK_DECISION         - Decision value (PASS/FAIL/APPROVE/REJECT)
#   MOCK_DECISION_DIR     - Directory to write decision (review/architect)
#   MOCK_WRITE_SIGNAL     - Signal to write (<verify>PASS</verify>, etc.)
#   MOCK_WRITE_COMPLETION - Write completion.txt (yes/no)
#   MOCK_OUTPUT           - Custom output to return

# Use a project-specific call count file
CALL_COUNT_FILE="${MOCK_CALL_COUNT_FILE:-/tmp/mock_cli_calls}"

# Track call count
count=0
if [[ -f "$CALL_COUNT_FILE" ]]; then
    count=$(cat "$CALL_COUNT_FILE")
fi
count=$((count + 1))
echo "$count" > "$CALL_COUNT_FILE"

# Log the call
echo "Mock CLI call #$count" >&2
echo "  MOCK_FAIL_COUNT=${MOCK_FAIL_COUNT:-0}" >&2
echo "  MOCK_WRITE_DECISION=${MOCK_WRITE_DECISION:-no}" >&2
echo "  MOCK_DECISION=${MOCK_DECISION:-PASS}" >&2

# Simulate failures
if [[ $count -le ${MOCK_FAIL_COUNT:-0} ]]; then
    echo "Mock CLI: Simulated failure $count"
    exit 1
fi

# Determine decision directory
decision_dir="${MOCK_DECISION_DIR:-review}"

# Write decision if configured
case "${MOCK_WRITE_DECISION:-no}" in
    yes)
        mkdir -p ".project/$decision_dir"
        echo "${MOCK_DECISION:-PASS}" > ".project/$decision_dir/decision.txt"
        echo "Mock CLI: Wrote ${MOCK_DECISION:-PASS} to .project/$decision_dir/decision.txt" >&2
        ;;
    delayed)
        if [[ $count -gt 1 ]]; then
            mkdir -p ".project/$decision_dir"
            echo "${MOCK_DECISION:-PASS}" > ".project/$decision_dir/decision.txt"
            echo "Mock CLI: Wrote delayed ${MOCK_DECISION:-PASS} to .project/$decision_dir/decision.txt" >&2
        else
            echo "Mock CLI: Delayed decision, not writing yet (attempt $count)" >&2
        fi
        ;;
    attempt_*)
        # Write on specific attempt number
        target_attempt="${MOCK_WRITE_DECISION#attempt_}"
        if [[ $count -ge $target_attempt ]]; then
            mkdir -p ".project/$decision_dir"
            echo "${MOCK_DECISION:-PASS}" > ".project/$decision_dir/decision.txt"
            echo "Mock CLI: Wrote ${MOCK_DECISION:-PASS} on attempt $count (target: $target_attempt)" >&2
        fi
        ;;
    never)
        echo "Mock CLI: Configured to never write decision" >&2
        ;;
esac

# Write completion if configured
if [[ "${MOCK_WRITE_COMPLETION:-no}" == "yes" ]]; then
    mkdir -p ".project/state"
    echo "COMPLETE" > ".project/state/completion.txt"
    echo "Mock CLI: Wrote COMPLETE to .project/state/completion.txt" >&2
fi

# Write signal if configured
if [[ -n "${MOCK_WRITE_SIGNAL:-}" ]]; then
    echo "${MOCK_WRITE_SIGNAL}"
fi

# Custom output
if [[ -n "${MOCK_OUTPUT:-}" ]]; then
    echo "${MOCK_OUTPUT}"
fi

echo "Mock CLI: Success on call $count"
exit 0
