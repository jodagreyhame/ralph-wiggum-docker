#!/bin/bash
# CLI Configuration: OpenCode
# Used by ralph.sh for the OpenCode CLI

# Display name for logs and banners
CLI_NAME="OpenCode"

# Color for banners (MAGENTA - distinct from others)
CLI_COLOR='\033[0;35m'

# Model selection (can be overridden by OPENCODE_MODEL env var)
# Antigravity models: google/antigravity-claude-sonnet-4-5, google/antigravity-gemini-3-flash, etc.
# Free models: opencode/glm-4.7-free, opencode/gpt-5-nano, opencode/grok-code
OPENCODE_MODEL="${OPENCODE_MODEL:-google/antigravity-claude-opus-4-5-thinking}"

# Command to execute
# Uses opencode CLI v1.1+
# run: non-interactive mode (reads prompt from stdin)
# -m: select the model
# --format json: raw JSON event streaming (like Claude's stream-json)
CLI_CMD="opencode run -m \"$OPENCODE_MODEL\" --format json"
