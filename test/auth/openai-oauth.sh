#!/bin/bash
# test/auth/openai-oauth.sh - OpenAI OAuth auth config
# Uses host ~/.codex credentials

AUTH_NAME="OpenAI OAuth"
AUTH_ID="openai-oauth"
AUTH_BACKEND="codex"  # Uses Codex backend

# Check prerequisites for this auth mode
auth_prereqs() {
    local codex_config="${CODEX_CONFIG_PATH:-$HOME/.codex}"

    # Check for config directory
    if [[ -d "$codex_config" ]]; then
        return 0
    fi

    PREREQ_MESSAGE="~/.codex not found - run 'codex' to login first"
    return 1
}

# Any additional setup needed
auth_setup() {
    :  # Credentials are mounted from host
}
