#!/bin/bash
# test/backends/codex.sh - OpenAI Codex CLI backend config
# Mirrors docker/cli/codex.sh pattern

BACKEND_NAME="Codex"
BACKEND_ID="codex"
BACKEND_COLOR='\033[0;33m'  # Orange/Yellow

# Check if this backend can run
# Codex CLI is always available in the container
backend_prereqs() {
    return 0
}

# Backend-specific setup (if needed)
backend_setup() {
    :  # No special setup needed
}
