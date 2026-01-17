#!/bin/bash
# test/backends/claude.sh - Claude Code backend config
# Mirrors docker/cli/claude.sh pattern

BACKEND_NAME="Claude"
BACKEND_ID="claude"
BACKEND_COLOR='\033[0;36m'  # Cyan

# Check if this backend can run
# Claude CLI is always available in the container
backend_prereqs() {
    return 0
}

# Backend-specific setup (if needed)
backend_setup() {
    :  # No special setup needed
}
