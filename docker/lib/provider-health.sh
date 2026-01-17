#!/bin/bash
# lib/provider-health.sh - Provider health tracking and fallback management
# Tracks per-provider failures and manages fallback sequence

# State file location (set by ralph.sh)
# PROVIDER_HEALTH_FILE="${PROJECT_STATE_DIR}/state/provider-health.json"

# Initialize provider health state file
init_provider_health() {
    if [[ "$PROVIDER_FALLBACK_ENABLED" != "true" ]]; then return; fi

    PROVIDER_HEALTH_FILE="${STATE_DIR}/provider-health.json"
    export PROVIDER_HEALTH_FILE

    if [[ ! -f "$PROVIDER_HEALTH_FILE" ]]; then
        cat > "$PROVIDER_HEALTH_FILE" << 'EOF'
{
  "providers": {},
  "current_provider": null,
  "current_backend": null,
  "fallback_index": 0,
  "total_provider_failures": 0
}
EOF
    fi
    log "${DIM}Provider fallback enabled (threshold: $PROVIDER_FAILURE_THRESHOLD)${NC}"
}

# Get provider status (healthy/degraded/failing)
# Args: $1 = provider name
get_provider_status() {
    local provider="$1"
    if [[ ! -f "$PROVIDER_HEALTH_FILE" ]]; then
        echo "healthy"
        return
    fi
    jq -r ".providers.\"$provider\".status // \"healthy\"" "$PROVIDER_HEALTH_FILE"
}

# Get provider consecutive failures count
# Args: $1 = provider name
get_provider_failures() {
    local provider="$1"
    if [[ ! -f "$PROVIDER_HEALTH_FILE" ]]; then
        echo "0"
        return
    fi
    jq -r ".providers.\"$provider\".consecutive_failures // 0" "$PROVIDER_HEALTH_FILE"
}

# Record provider success - reset failure count
# Args: $1 = provider name
record_provider_success() {
    local provider="$1"
    if [[ "$PROVIDER_FALLBACK_ENABLED" != "true" ]]; then return; fi
    if [[ ! -f "$PROVIDER_HEALTH_FILE" ]]; then return; fi

    local now
    now=$(date -Iseconds 2>/dev/null || date +%Y-%m-%dT%H:%M:%S)

    jq --arg p "$provider" --arg t "$now" '
        .providers[$p] = {
            "status": "healthy",
            "consecutive_failures": 0,
            "last_success": $t,
            "last_error_type": null
        } |
        .current_provider = $p
    ' "$PROVIDER_HEALTH_FILE" > "${PROVIDER_HEALTH_FILE}.tmp" 2>/dev/null
    mv "${PROVIDER_HEALTH_FILE}.tmp" "$PROVIDER_HEALTH_FILE"
}

# Record provider failure with error type
# Args: $1 = provider name, $2 = error type
# Returns: current failure count (echoed)
record_provider_failure() {
    local provider="$1"
    local error_type="$2"

    if [[ "$PROVIDER_FALLBACK_ENABLED" != "true" ]]; then
        echo "0"
        return
    fi
    if [[ ! -f "$PROVIDER_HEALTH_FILE" ]]; then
        echo "0"
        return
    fi

    local now
    now=$(date -Iseconds 2>/dev/null || date +%Y-%m-%dT%H:%M:%S)

    local current_failures
    current_failures=$(jq -r ".providers.\"$provider\".consecutive_failures // 0" "$PROVIDER_HEALTH_FILE")
    current_failures=$((current_failures + 1))

    # Determine status based on failure count
    local status="healthy"
    if [[ $current_failures -ge 3 ]]; then
        status="degraded"
    fi
    if [[ $current_failures -ge ${PROVIDER_FAILURE_THRESHOLD:-10} ]]; then
        status="failing"
    fi

    jq --arg p "$provider" --arg t "$now" --arg e "$error_type" \
       --arg s "$status" --argjson f "$current_failures" '
        .providers[$p] = {
            "status": $s,
            "consecutive_failures": $f,
            "last_failure": $t,
            "last_error_type": $e
        } |
        .total_provider_failures = (.total_provider_failures + 1)
    ' "$PROVIDER_HEALTH_FILE" > "${PROVIDER_HEALTH_FILE}.tmp" 2>/dev/null
    mv "${PROVIDER_HEALTH_FILE}.tmp" "$PROVIDER_HEALTH_FILE"

    echo "$current_failures"
}

# Get next provider from fallback sequence
# Returns: provider item (string for simple format, JSON object for object format)
# Supports two sequence formats:
#   String: ["claude", "gemini", "codex"]
#   Object: [{"name": "glm", "backend": "claude", "auth_mode": "glm"}, ...]
get_next_fallback_provider() {
    if [[ ! -f "$PROVIDER_HEALTH_FILE" ]]; then
        echo ""
        return
    fi

    local current_index
    current_index=$(jq -r '.fallback_index // 0' "$PROVIDER_HEALTH_FILE")

    # Parse fallback sequence from env (JSON array)
    local sequence_length
    sequence_length=$(echo "$PROVIDER_FALLBACK_SEQUENCE" | jq -r 'length' 2>/dev/null || echo "0")

    if [[ "$sequence_length" -eq 0 ]]; then
        echo ""
        return
    fi

    local next_index=$(( (current_index + 1) % sequence_length ))

    # Update fallback index
    jq --argjson i "$next_index" '.fallback_index = $i' "$PROVIDER_HEALTH_FILE" > "${PROVIDER_HEALTH_FILE}.tmp" 2>/dev/null
    mv "${PROVIDER_HEALTH_FILE}.tmp" "$PROVIDER_HEALTH_FILE"

    # Get the item at index (could be string or object)
    local item
    item=$(echo "$PROVIDER_FALLBACK_SEQUENCE" | jq -c ".[$next_index]" 2>/dev/null)

    # Check if item is an object (has "backend" key) or string
    if echo "$item" | jq -e '.backend' >/dev/null 2>&1; then
        # Object format - return as-is (compact JSON)
        echo "$item"
    else
        # String format - return just the string value
        echo "$item" | jq -r '.'
    fi
}

# Check if provider switch is needed
# Args: $1 = provider name
# Returns: 0 if switch needed, 1 otherwise
should_switch_provider() {
    local provider="$1"
    if [[ "$PROVIDER_FALLBACK_ENABLED" != "true" ]]; then return 1; fi

    local failures
    failures=$(get_provider_failures "$provider")
    [[ $failures -ge ${PROVIDER_FAILURE_THRESHOLD:-10} ]]
}

# Reset provider to healthy state (used after successful switch)
# Args: $1 = provider name
reset_provider_health() {
    local provider="$1"
    if [[ ! -f "$PROVIDER_HEALTH_FILE" ]]; then return; fi

    jq --arg p "$provider" '
        .providers[$p].consecutive_failures = 0 |
        .providers[$p].status = "healthy"
    ' "$PROVIDER_HEALTH_FILE" > "${PROVIDER_HEALTH_FILE}.tmp" 2>/dev/null
    mv "${PROVIDER_HEALTH_FILE}.tmp" "$PROVIDER_HEALTH_FILE"
}
