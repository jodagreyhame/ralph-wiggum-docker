#!/bin/bash
# lib/error-classifier.sh - Classify CLI errors for smart provider fallback
# Detects provider errors (rate limits, auth, timeout) vs work errors

# Error type constants
ERROR_NONE="NONE"
ERROR_RATE_LIMIT="RATE_LIMIT"
ERROR_AUTH="AUTH_ERROR"
ERROR_TIMEOUT="TIMEOUT"
ERROR_PROVIDER="PROVIDER_ERROR"

# Classify error from CLI output and exit code
# Args: $1 = output file path, $2 = exit code
# Returns: error type string (echoed)
classify_error() {
    local output_file="$1"
    local exit_code="${2:-0}"

    # Exit 0 means no provider error
    if [[ "$exit_code" -eq 0 ]]; then
        echo "$ERROR_NONE"
        return
    fi

    # Read output for pattern matching
    local output=""
    if [[ -f "$output_file" ]]; then
        output=$(cat "$output_file" 2>/dev/null || echo "")
    fi

    # Check rate limit patterns (most common, check first)
    if echo "$output" | grep -iqE "rate.?limit|429|Too.Many.Requests|quota.?exceeded|usage_limit_reached|credits|throttl"; then
        echo "$ERROR_RATE_LIMIT"
        return
    fi

    # Check auth patterns
    if echo "$output" | grep -iqE "unauthorized|401|authentication.?failed|invalid.*(api.?)?key|invalid.*(api.?)?token|Missing.?bearer|permission.?denied|access.?denied"; then
        echo "$ERROR_AUTH"
        return
    fi

    # Check timeout patterns
    if echo "$output" | grep -iqE "timeout|ETIMEDOUT|ECONNRESET|socket.?hang.?up|connection.?reset|ENOTFOUND|ECONNREFUSED"; then
        echo "$ERROR_TIMEOUT"
        return
    fi

    # Check provider error patterns (5xx errors, overloaded)
    if echo "$output" | grep -iqE "overloaded|529|503|502|500|internal.?server.?error|service.?unavailable|temporarily.?unavailable|capacity"; then
        echo "$ERROR_PROVIDER"
        return
    fi

    # Non-zero exit but no recognizable pattern = generic provider error
    echo "$ERROR_PROVIDER"
}

# Check if error is recoverable by switching providers
# Args: $1 = error type
# Returns: 0 (true) if recoverable, 1 (false) if not
is_provider_recoverable() {
    local error_type="$1"
    case "$error_type" in
        "$ERROR_RATE_LIMIT"|"$ERROR_TIMEOUT"|"$ERROR_PROVIDER")
            return 0  # Can try another provider
            ;;
        "$ERROR_AUTH"|"$ERROR_NONE")
            return 1  # Auth needs fixing, NONE is not an error
            ;;
        *)
            return 1
            ;;
    esac
}

# Get human-readable error description
# Args: $1 = error type
get_error_description() {
    local error_type="$1"
    case "$error_type" in
        "$ERROR_RATE_LIMIT") echo "Rate limit exceeded" ;;
        "$ERROR_AUTH") echo "Authentication failed" ;;
        "$ERROR_TIMEOUT") echo "Connection timeout" ;;
        "$ERROR_PROVIDER") echo "Provider error" ;;
        "$ERROR_NONE") echo "No error" ;;
        *) echo "Unknown error" ;;
    esac
}
