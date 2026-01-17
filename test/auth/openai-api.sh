#!/bin/bash
# test/auth/openai-api.sh - OpenAI API auth config
# Uses OPENAI_API_KEY environment variable

AUTH_NAME="OpenAI API"
AUTH_ID="openai-api"
AUTH_BACKEND="codex"  # Uses Codex backend

# Check prerequisites for this auth mode
auth_prereqs() {
    if [[ -n "$OPENAI_API_KEY" ]]; then
        return 0
    fi

    PREREQ_MESSAGE="OPENAI_API_KEY not set - configure for direct API access"
    return 1
}

# Any additional setup needed
auth_setup() {
    :  # Key is read from environment
}
