#!/bin/bash
# test/auth/glm.sh - GLM (z.ai) backend auth config
# Uses GLM_AUTH_TOKEN environment variable

AUTH_NAME="GLM (z.ai)"
AUTH_ID="glm"
AUTH_BACKEND="claude"  # GLM uses Claude backend with custom base URL

# Check prerequisites for this auth mode
auth_prereqs() {
    if [[ -n "$GLM_AUTH_TOKEN" ]]; then
        return 0
    fi
    PREREQ_MESSAGE="GLM_AUTH_TOKEN not set - configure in .env for z.ai backend"
    return 1
}

# Any additional setup needed
auth_setup() {
    :  # Token is read from environment
}
