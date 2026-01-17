#!/bin/bash
# test/auth/opencode-oauth.sh - OpenCode OAuth auth config
# Uses host ~/.local/share/opencode credentials

AUTH_NAME="OpenCode OAuth"
AUTH_ID="opencode-oauth"
AUTH_BACKEND="opencode"  # Uses OpenCode backend

# Check prerequisites for this auth mode
auth_prereqs() {
    local opencode_config="${OPENCODE_CONFIG_PATH:-$HOME/.local/share/opencode}"

    if [[ -d "$opencode_config" ]]; then
        return 0
    fi

    PREREQ_MESSAGE="~/.local/share/opencode not found - run 'opencode auth login' first"
    return 1
}

# Any additional setup needed
auth_setup() {
    :  # Config is mounted from host
}
