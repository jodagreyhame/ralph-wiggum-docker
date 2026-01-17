#!/bin/bash
# CLI Configuration: OpenAI Codex CLI
# Used by ralph.sh for the Codex CLI

# Display name for logs and banners
CLI_NAME="Codex"

# Color for banners (ORANGE/YELLOW)
CLI_COLOR='\033[0;33m'

# Command to execute
# exec: execute mode
# --yolo: bypass approvals and sandboxing
# --json: output JSON events for structured logging
# -C /project: set workspace root
# --skip-git-repo-check: allow running outside git repo
CLI_CMD="codex exec --yolo --json -C /project --skip-git-repo-check"
