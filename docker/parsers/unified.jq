# Unified CLI Output Parser - Clean Box-Drawing Format
# Supports: Claude, Gemini, Codex, OpenCode
# No emojis - uses box-drawing characters like the actual Claude CLI
#
# Environment: RALPH_SHOW_THINKING (true/false) - passed via --arg show_thinking
#
# Output format:
#   Text flows naturally as paragraphs
#   ┌─ ToolName
#   │  context (path, command, pattern)
#   └─
#   ┄┄┄ thinking ┄┄┄ (when enabled)

# Helper: Format tool input context
def tool_context:
    if .command then "$ " + (.command | split("\n")[0][:80])
    elif .file_path then .file_path
    elif .filePath then .filePath
    elif .pattern then .pattern
    elif .query then .query
    elif .url then .url
    elif .description then .description[:60]
    else null end;

# Helper: Format tool block with box drawing
def tool_box($name; $context):
    "┌─ " + $name,
    (if $context then "│  " + $context else empty end),
    "└─";

# Helper: Format tool result
def result_box($status; $content):
    if $status == "error" then
        "├─ error ─────────────────────────",
        "│  " + ($content | split("\n")[0][:80]),
        "└─"
    elif $content and ($content | length) > 0 then
        (if ($content | split("\n") | length) > 1 then
            "├─ result ─────────────────────────",
            ($content | split("\n")[:5][] | "│  " + .[:100]),
            (if ($content | split("\n") | length) > 5 then "│  ..." else empty end),
            "└─"
        else
            "└─ " + ($content | split("\n")[0][:80])
        end)
    else empty end;

# Helper: Format thinking block (only when enabled)
def thinking_block($text):
    "┄┄┄ thinking ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄",
    ($text | split("\n")[:10][] | .[:100]),
    (if ($text | split("\n") | length) > 10 then "..." else empty end),
    "┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄";

# ============================================================
# MAIN PARSER - Auto-detects backend from event type
# ============================================================

# Skip metadata/init events (all backends)
if .type == "system" or .type == "init" then empty
elif .type == "thread.started" or .type == "turn.started" or .type == "turn.completed" then empty
elif .type == "step_start" then empty
elif .type == "message_start" or .type == "message_stop" or .type == "message_delta" then empty
elif .type == "content_block_stop" then empty

# ============================================================
# THINKING BLOCKS - Show only when RALPH_SHOW_THINKING=true
# ============================================================

# Claude streaming thinking
elif .type == "content_block_start" and .content_block.type == "thinking" then
    if $show_thinking == "true" then "┄┄┄ thinking ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄" else empty end
elif .type == "content_block_delta" and .delta.type == "thinking_delta" then
    if $show_thinking == "true" then .delta.text else empty end

# Codex reasoning blocks
elif .type == "item.started" and .item.type == "reasoning" then
    if $show_thinking == "true" then "┄┄┄ thinking ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄" else empty end
elif .type == "item.completed" and .item.type == "reasoning" then
    if $show_thinking == "true" then
        (.item.text // .item.content // "" | split("\n")[:10][] | .[:100]),
        "┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄"
    else empty end

# OpenCode reasoning (if present)
elif .type == "tool_use" and .part.type == "reasoning" then
    if $show_thinking == "true" then
        "┄┄┄ thinking ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄",
        (.part.text // "" | split("\n")[:10][] | .[:100]),
        "┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄"
    else empty end

# ============================================================
# CLAUDE FORMAT
# ============================================================

# Claude: Assistant text content
elif .type == "assistant" and .message.content then
    .message.content[] |
    if .type == "text" then
        .text
    elif .type == "tool_use" then
        tool_box(.name; .input | tool_context)
    elif .type == "thinking" then
        if $show_thinking == "true" then thinking_block(.text) else empty end
    else empty end

# Claude: Streaming text delta
elif .type == "content_block_delta" and .delta.type == "text_delta" then
    .delta.text

# Claude: Tool use start (streaming)
elif .type == "content_block_start" and .content_block.type == "tool_use" then
    tool_box(.content_block.name; .content_block.input | tool_context)

# Claude: User tool results
elif .type == "user" and .message.content then
    .message.content[] |
    if .type == "tool_result" then
        if .is_error == true then
            result_box("error"; .content)
        else
            # Skip verbose tool results, just show they completed
            empty
        end
    else empty end

# Claude: Session result
elif .type == "result" and .subtype == "success" then
    "",
    "────────────────────────────────────────",
    "Complete (" + (.num_turns | tostring) + " turns" +
        (if .total_cost_usd then ", $" + (.total_cost_usd | tostring) else "" end) +
        (if .usage.input_tokens then ", " + ((.usage.input_tokens + .usage.output_tokens) | tostring) + " tokens" else "" end) + ")"

# ============================================================
# GEMINI FORMAT
# ============================================================

# Gemini: Message content
elif .type == "message" and .role == "assistant" and .delta != true then
    .content

# Gemini: Streaming delta
elif .type == "message" and .delta == true then
    .content

# Gemini: Tool use
elif .type == "tool_use" and .tool_name then
    tool_box(.tool_name; .parameters | tool_context)

# Gemini: Tool result
elif .type == "tool_result" then
    if .status == "error" then
        result_box("error"; .output // "error")
    else empty end

# Gemini: Session result
elif .type == "result" and .stats then
    "",
    "────────────────────────────────────────",
    "Complete (" + (.stats.tool_calls | tostring) + " tools, " + (.stats.total_tokens | tostring) + " tokens)"

# ============================================================
# CODEX FORMAT
# ============================================================

# Codex: Command execution start
elif .type == "item.started" and .item.type == "command_execution" then
    tool_box("Bash"; "$ " + (.item.command | split("\n")[0][:80]))

# Codex: Command execution complete
elif .type == "item.completed" and .item.type == "command_execution" then
    if .item.exit_code != 0 then
        result_box("error"; .item.aggregated_output // "exit " + (.item.exit_code | tostring))
    elif (.item.aggregated_output // "") != "" then
        # Show brief output for successful commands
        "└─ " + (.item.aggregated_output | split("\n")[0][:60]) +
            (if .item.exit_code then " (exit " + (.item.exit_code | tostring) + ")" else "" end)
    else empty end

# Codex: Message/text output
elif .type == "item.completed" and .item.type == "message" then
    .item.text // (.item.content[]? | select(.type == "text" or .type == "output_text") | .text)

# Codex: File changes
elif .type == "item.completed" and .item.type == "file_change" then
    (.item.changes[]? | "┌─ File: " + .kind + " " + .path, "└─")

# ============================================================
# OPENCODE FORMAT
# ============================================================

# OpenCode: Text content
elif .type == "text" and .part.text then
    .part.text

# OpenCode: Tool use
elif .type == "tool_use" and .part.tool then
    if .part.state.status == "running" then
        tool_box(.part.tool; .part.state.input | tool_context)
    elif .part.state.status == "completed" then
        if .part.state.output and (.part.state.output | type) == "string" and (.part.state.output | length) > 0 then
            "└─ " + (.part.state.output | split("\n")[0][:60])
        else empty end
    elif .part.state.status == "error" then
        result_box("error"; .part.state.error // "unknown error")
    else empty end

# OpenCode: Step finish (session stats)
elif .type == "step_finish" and .part.tokens then
    "",
    "────────────────────────────────────────",
    "Step complete (" + (.part.reason // "done") +
        (if .part.cost then ", $" + (.part.cost | tostring) else "" end) +
        ", " + ((.part.tokens.input + .part.tokens.output) | tostring) + " tokens)"

# ============================================================
# FALLBACK
# ============================================================

else
    # Unknown format - try to extract content if present
    if .content and (.content | type) == "string" then
        .content
    else empty end
end
