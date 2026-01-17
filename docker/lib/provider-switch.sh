#!/bin/bash
# lib/provider-switch.sh - Provider switching logic
# Handles automatic fallback and higher-tier override requests

# Provider override file location (written by reviewer/architect)
# PROVIDER_OVERRIDE_FILE="${STATE_DIR}/provider-override.json"

# Check for higher-tier provider override request
# Returns: 0 if override applied, 1 if no override
check_provider_override() {
    local override_file="${STATE_DIR}/provider-override.json"

    if [[ ! -f "$override_file" ]]; then
        return 1
    fi

    local requested_backend
    local requested_auth
    local reason

    requested_backend=$(jq -r '.requested_backend // empty' "$override_file" 2>/dev/null)
    requested_auth=$(jq -r '.requested_auth_mode // empty' "$override_file" 2>/dev/null)
    reason=$(jq -r '.reason // "unspecified"' "$override_file" 2>/dev/null)

    if [[ -z "$requested_backend" ]]; then
        return 1
    fi

    log ""
    log "${CYAN}+------------------------------------------------------------+${NC}"
    log "${CYAN}|${NC}  ${BOLD}PROVIDER OVERRIDE${NC} (requested by reviewer/architect)"
    log "${CYAN}|${NC}  Switching to: ${GREEN}$requested_backend${NC} ($requested_auth)"
    log "${CYAN}|${NC}  Reason: $reason"
    log "${CYAN}+------------------------------------------------------------+${NC}"

    # Apply the switch
    switch_builder_provider "$requested_backend" "$requested_auth"

    # Clear the override file
    rm -f "$override_file"

    return 0
}

# Switch builder to a new provider
# Args: $1 = backend (claude/gemini/codex/opencode)
#       $2 = auth_mode (optional, defaults to get_default_auth_mode)
#       $3 = provider_name (optional, for object format - defaults to backend)
#       $4 = model (optional, model to use with this provider)
switch_builder_provider() {
    local new_backend="$1"
    local new_auth_mode="${2:-$(get_default_auth_mode "$new_backend")}"
    local provider_name="${3:-$new_backend}"
    local model="${4:-}"

    # Update environment
    export RALPH_BUILDER_BACKEND="$new_backend"
    export RALPH_BUILDER_AUTH_MODE="$new_auth_mode"
    export RALPH_CLI="$new_backend"
    export CLI_TYPE="$new_backend"

    # Set model env var before sourcing CLI config
    # Each CLI reads from its preferred env var (RALPH_MODEL, GEMINI_MODEL, OPENCODE_MODEL)
    if [[ -n "$model" ]]; then
        export RALPH_MODEL="$model"
        # Also set backend-specific model vars for consistency
        case "$new_backend" in
            gemini) export GEMINI_MODEL="$model" ;;
            opencode) export OPENCODE_MODEL="$model" ;;
        esac
    else
        unset RALPH_MODEL
        unset GEMINI_MODEL
        unset OPENCODE_MODEL
    fi

    # Determine CLI script type
    local cli_script="$new_backend"

    # Check CLI script exists
    if [[ ! -f "$SCRIPT_DIR/cli/${cli_script}.sh" ]]; then
        log "${RED}  Error: CLI config not found: ${cli_script}.sh${NC}"
        return 1
    fi

    # Apply auth mode with model
    apply_auth_mode "$new_auth_mode" "$model" 2>/dev/null || true

    # Re-source CLI config
    source "$SCRIPT_DIR/cli/${cli_script}.sh"

    log "${GREEN}  Switched to $CLI_NAME ($provider_name)${NC}"

    # Update provider health state - track both provider name and backend
    if [[ -f "$PROVIDER_HEALTH_FILE" ]]; then
        jq --arg p "$provider_name" --arg b "$new_backend" \
            '.current_provider = $p | .current_backend = $b' \
            "$PROVIDER_HEALTH_FILE" > "${PROVIDER_HEALTH_FILE}.tmp" 2>/dev/null
        mv "${PROVIDER_HEALTH_FILE}.tmp" "$PROVIDER_HEALTH_FILE"
    fi

    return 0
}

# Execute automatic provider fallback
# Args: $1 = current provider, $2 = error type
# Returns: 0 on success, 1 on failure (no more providers)
# Supports two sequence formats:
#   String: ["claude", "gemini"] - provider name used as backend, auth looked up
#   Object: [{"name": "glm", "backend": "claude", "auth_mode": "glm"}] - explicit config
execute_provider_fallback() {
    local current_provider="$1"
    local error_type="$2"

    log ""
    log "${YELLOW}+------------------------------------------------------------+${NC}"
    log "${YELLOW}|${NC}  ${BOLD}PROVIDER FALLBACK${NC}: $current_provider is failing"
    log "${YELLOW}|${NC}  Error: $(get_error_description "$error_type")"
    log "${YELLOW}|${NC}  Trying next provider in fallback sequence..."
    log "${YELLOW}+------------------------------------------------------------+${NC}"

    # Get next provider from sequence (could be string or JSON object)
    local next_item
    next_item=$(get_next_fallback_provider)

    if [[ -z "$next_item" || "$next_item" == "null" ]]; then
        log "${RED}  No more providers in fallback sequence${NC}"
        return 1
    fi

    local next_provider next_backend next_auth next_model

    # Check if object format (has backend key)
    if echo "$next_item" | jq -e '.backend' >/dev/null 2>&1; then
        # Object format: extract fields
        next_provider=$(echo "$next_item" | jq -r '.name')
        next_backend=$(echo "$next_item" | jq -r '.backend')
        next_auth=$(echo "$next_item" | jq -r '.auth_mode')
        next_model=$(echo "$next_item" | jq -r '.model // empty')
    else
        # String format: use as provider name, look up auth, no model
        next_provider="$next_item"
        next_backend="$next_item"
        next_auth=$(get_default_auth_mode "$next_provider")
        next_model=""
    fi

    # Don't switch to the same provider (compare by name)
    if [[ "$next_provider" == "$current_provider" ]]; then
        log "${YELLOW}  Next provider is same as current ($next_provider), trying next...${NC}"
        next_item=$(get_next_fallback_provider)
        if [[ -z "$next_item" || "$next_item" == "null" ]]; then
            log "${RED}  No alternative providers available${NC}"
            return 1
        fi
        # Re-parse the new item
        if echo "$next_item" | jq -e '.backend' >/dev/null 2>&1; then
            next_provider=$(echo "$next_item" | jq -r '.name')
            next_backend=$(echo "$next_item" | jq -r '.backend')
            next_auth=$(echo "$next_item" | jq -r '.auth_mode')
            next_model=$(echo "$next_item" | jq -r '.model // empty')
        else
            next_provider="$next_item"
            next_backend="$next_item"
            next_auth=$(get_default_auth_mode "$next_provider")
            next_model=""
        fi
        if [[ "$next_provider" == "$current_provider" ]]; then
            log "${RED}  No alternative providers available${NC}"
            return 1
        fi
    fi

    local switch_msg="$current_provider -> $next_provider ($next_backend + $next_auth"
    if [[ -n "$next_model" ]]; then
        switch_msg="$switch_msg, model: $next_model"
    fi
    switch_msg="$switch_msg)"
    log "${CYAN}  Switching: $switch_msg${NC}"

    switch_builder_provider "$next_backend" "$next_auth" "$next_provider" "$next_model"
    return $?
}

# Get default auth mode for a provider
# Args: $1 = provider name
get_default_auth_mode() {
    local provider="$1"

    # Check if auth_modes defined in fallback config
    if [[ -n "$PROVIDER_FALLBACK_AUTH_MODES" ]]; then
        local mode
        mode=$(echo "$PROVIDER_FALLBACK_AUTH_MODES" | jq -r ".\"$provider\" // empty" 2>/dev/null)
        if [[ -n "$mode" && "$mode" != "null" ]]; then
            echo "$mode"
            return
        fi
    fi

    # Default auth modes per provider
    case "$provider" in
        claude) echo "anthropic-oauth" ;;
        gemini) echo "gemini-oauth" ;;
        codex) echo "openai-oauth" ;;
        opencode) echo "opencode-oauth" ;;
        *) echo "glm" ;;
    esac
}

# Log provider switch to history (for debugging)
log_provider_switch() {
    local from="$1"
    local to="$2"
    local reason="$3"
    local now

    now=$(date -Iseconds 2>/dev/null || date +%Y-%m-%dT%H:%M:%S)

    if [[ -f "$PROVIDER_HEALTH_FILE" ]]; then
        jq --arg f "$from" --arg t "$to" --arg r "$reason" --arg ts "$now" '
            .switch_history = (.switch_history // []) + [{
                "from": $f,
                "to": $t,
                "reason": $r,
                "at": $ts
            }]
        ' "$PROVIDER_HEALTH_FILE" > "${PROVIDER_HEALTH_FILE}.tmp" 2>/dev/null
        mv "${PROVIDER_HEALTH_FILE}.tmp" "$PROVIDER_HEALTH_FILE"
    fi
}
