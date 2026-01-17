#!/bin/bash
# CLI Configuration: Claude Code
# Used by ralph.sh for the Claude Code CLI

# Display name for logs and banners
CLI_NAME="Claude"

# Color for banners (CYAN)
CLI_COLOR='\033[0;36m'

# Session mode: "fresh" (default) or "resume" (continue previous session)
SESSION_MODE="${RALPH_SESSION_MODE:-fresh}"

# Command to execute
# --dangerously-skip-permissions: bypass permission prompts
# --output-format stream-json: real-time streaming (JSON lines)
# --model: specify model (opus, sonnet, haiku, or full model name)
# --continue: resume most recent session (if session_mode=resume)
#
# Note: stream-json outputs JSON objects as they arrive, enabling real-time
# monitoring. The raw JSON is logged; use jq to parse if needed.
# For plain text (buffered): --output-format text
CLI_CMD="claude --dangerously-skip-permissions --verbose --output-format stream-json"

# Add model if specified (enables thinking for opus/sonnet 4.5+)
# RALPH_MODEL takes precedence, then ANTHROPIC_MODEL
MODEL="${RALPH_MODEL:-${ANTHROPIC_MODEL:-}}"
if [[ -n "$MODEL" ]]; then
    CLI_CMD="$CLI_CMD --model $MODEL"
    CLI_NAME="Claude ($MODEL)"
fi

if [[ "$SESSION_MODE" == "resume" ]]; then
    CLI_CMD="$CLI_CMD --continue"
    CLI_NAME="$CLI_NAME (resume)"
fi
