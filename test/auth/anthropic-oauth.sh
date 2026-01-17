#!/bin/bash
# test/auth/anthropic-oauth.sh - Anthropic OAuth auth config
# Uses host ~/.claude credentials

AUTH_NAME="Anthropic OAuth"
AUTH_ID="anthropic-oauth"
AUTH_BACKEND="claude"  # Default backend for this auth mode

# Check prerequisites for this auth mode
auth_prereqs() {
    local claude_config="${CLAUDE_CONFIG_PATH:-$HOME/.claude}"
    if [[ -d "$claude_config" ]]; then
        return 0
    fi
    PREREQ_MESSAGE="~/.claude not found - run 'claude login' on host first"
    return 1
}

# Any additional setup needed
auth_setup() {
    :  # No additional setup needed for OAuth
}
