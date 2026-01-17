#!/bin/bash
# test/backends/gemini.sh - Gemini CLI backend config
# Mirrors docker/cli/gemini.sh pattern

BACKEND_NAME="Gemini"
BACKEND_ID="gemini"
BACKEND_COLOR='\033[0;34m'  # Blue

# Check if this backend can run
# Gemini CLI is always available in the container
backend_prereqs() {
    return 0
}

# Backend-specific setup (if needed)
backend_setup() {
    :  # No special setup needed
}
