#!/bin/bash
# test/auth/gemini-oauth.sh - Gemini OAuth auth config
# Uses host ~/.gemini credentials

AUTH_NAME="Gemini OAuth"
AUTH_ID="gemini-oauth"
AUTH_BACKEND="gemini"  # Uses Gemini backend

# Check prerequisites for this auth mode
auth_prereqs() {
    local gemini_config="${GEMINI_CONFIG_PATH:-$HOME/.gemini}"
    if [[ -d "$gemini_config" ]]; then
        return 0
    fi
    PREREQ_MESSAGE="~/.gemini not found - run 'gemini' to login first"
    return 1
}

# Any additional setup needed
auth_setup() {
    :  # Credentials are mounted from host
}
