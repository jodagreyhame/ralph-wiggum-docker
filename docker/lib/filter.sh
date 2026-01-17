#!/bin/bash
# lib/filter.sh - Human-readable JSON stream filter
# Extracts meaningful content from stream-json output (Claude, Gemini, Codex, OpenCode)

# Human-readable JSON stream filter
filter_readable() {
    # Option 1: Node.js formatter (Claude-style output)
    local node_formatter="$SCRIPT_DIR/formatter/src/index.js"
    if [[ -f "$node_formatter" ]] && command -v node >/dev/null 2>&1; then
        node "$node_formatter"
        return
    fi

    # Option 2: jq parsers (fallback)
    local filter_file="$SCRIPT_DIR/parsers/${CLI_TYPE}.jq"
    if [[ ! -f "$filter_file" ]]; then
        filter_file="$SCRIPT_DIR/parsers/unified.jq"
    fi

    if [[ -f "$filter_file" ]] && command -v jq >/dev/null 2>&1; then
        # Use CLI-specific parser with thinking toggle
        jq -r --unbuffered --arg show_thinking "$SHOW_THINKING" -f "$filter_file" 2>/dev/null || cat
    else
        # Fallback: inline minimal filter (no emojis)
        jq -r --unbuffered '
        # Skip metadata
        if .type == "system" or .type == "init" then empty
        elif .type == "thread.started" or .type == "turn.started" then empty
        elif .type == "step_start" or .type == "message_start" or .type == "message_stop" then empty
        elif .type == "content_block_stop" or .type == "message_delta" then empty
        # Skip thinking blocks
        elif .type == "content_block_start" and .content_block.type == "thinking" then empty
        elif .type == "content_block_delta" and .delta.type == "thinking_delta" then empty
        elif .type == "item.completed" and .item.type == "reasoning" then empty
        # Claude text
        elif .type == "assistant" and .message.content then
            .message.content[] | select(.type == "text") | .text
        elif .type == "content_block_delta" and .delta.type == "text_delta" then
            .delta.text
        # Claude tool use
        elif .type == "content_block_start" and .content_block.type == "tool_use" then
            "-- " + .content_block.name + " --"
        # Codex
        elif .type == "item.completed" and .item.type == "message" then
            .item.text
        elif .type == "item.completed" and .item.type == "command_execution" then
            "-- Bash: " + (.item.command | split("\n")[0][:60]) + " --"
        # OpenCode
        elif .type == "text" and .part.text then
            .part.text
        elif .type == "tool_use" and .part.tool then
            "-- " + .part.tool + " --"
        # Gemini
        elif .type == "message" and .role == "assistant" then
            .content
        elif .type == "tool_use" and .tool_name then
            "-- " + .tool_name + " --"
        # Session complete
        elif .type == "result" and .subtype == "success" then
            "-- Complete (" + (.num_turns | tostring) + " turns) --"
        elif .type == "step_finish" then
            "-- Step complete --"
        else empty end
        ' 2>/dev/null || cat
    fi
}
