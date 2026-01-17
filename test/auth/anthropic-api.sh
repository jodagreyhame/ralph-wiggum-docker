#!/bin/bash
# test/auth/anthropic-api.sh - Direct Anthropic API auth config
# Uses ANTHROPIC_API_KEY environment variable

AUTH_NAME="Anthropic API"
AUTH_ID="anthropic-api"
AUTH_BACKEND="claude"  # Uses Claude backend

# Check prerequisites for this auth mode
auth_prereqs() {
    if [[ -n "$ANTHROPIC_API_KEY" ]]; then
        return 0
    fi
    PREREQ_MESSAGE="ANTHROPIC_API_KEY not set - configure for direct API access"
    return 1
}

# Any additional setup needed
auth_setup() {
    :  # Key is read from environment
}
