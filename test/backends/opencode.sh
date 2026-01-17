#!/bin/bash
# test/backends/opencode.sh - OpenCode (Antigravity) backend config
# Mirrors docker/cli/opencode.sh pattern

BACKEND_NAME="OpenCode"
BACKEND_ID="opencode"
BACKEND_COLOR='\033[0;35m'  # Magenta

# Check if this backend can run
# OpenCode CLI is always available in the container
backend_prereqs() {
    return 0
}

# Backend-specific setup (if needed)
backend_setup() {
    :  # No special setup needed
}
