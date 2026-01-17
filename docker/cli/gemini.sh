#!/bin/bash
# CLI Configuration: Gemini CLI
# Used by ralph.sh for the Gemini CLI

# Display name for logs and banners
CLI_NAME="Gemini"

# Color for banners (BLUE)
CLI_COLOR='\033[0;34m'

# Model selection (can be overridden by GEMINI_MODEL env var)
GEMINI_MODEL="${GEMINI_MODEL:-gemini-2.5-pro}"

# Session mode: "fresh" (default) or "resume" (continue previous session)
# With Gemini's 1M+ token context, resume mode allows accumulating knowledge
SESSION_MODE="${RALPH_SESSION_MODE:-fresh}"

# Build command
# -m: model selection
# --approval-mode yolo: bypass approvals
# --output-format stream-json: real-time streaming (JSON lines)
# --resume latest: continue previous session (if session_mode=resume)
CLI_CMD="gemini -m \"$GEMINI_MODEL\" --approval-mode yolo --output-format stream-json"

if [[ "$SESSION_MODE" == "resume" ]]; then
    CLI_CMD="$CLI_CMD --resume latest"
    CLI_NAME="Gemini (resume)"
fi
