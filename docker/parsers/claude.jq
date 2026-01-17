# Claude CLI Output Parser - Clean Box-Drawing Format
# Handles: system, assistant, content_block_delta, content_block_start, result, user
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
# MAIN PARSER
# ============================================================

# Skip metadata/init events
if .type == "system" then empty
elif .type == "message_start" or .type == "message_stop" or .type == "message_delta" then empty
elif .type == "content_block_stop" then empty

# ============================================================
# THINKING BLOCKS - Show only when RALPH_SHOW_THINKING=true
# ============================================================

# Thinking block start (streaming)
elif .type == "content_block_start" and .content_block.type == "thinking" then
    if $show_thinking == "true" then "┄┄┄ thinking ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄" else empty end

# Thinking block delta (streaming)
elif .type == "content_block_delta" and .delta.type == "thinking_delta" then
    if $show_thinking == "true" then .delta.thinking else empty end

# ============================================================
# TEXT OUTPUT
# ============================================================

# Assistant message with content array
elif .type == "assistant" and .message.content then
    .message.content[] |
    if .type == "text" then
        .text
    elif .type == "tool_use" then
        tool_box(.name; .input | tool_context)
    elif .type == "thinking" then
        if $show_thinking == "true" then thinking_block(.thinking) else empty end
    else empty end

# Streaming text delta
elif .type == "content_block_delta" and .delta.type == "text_delta" then
    .delta.text

# ============================================================
# TOOL USE
# ============================================================

# Tool use start (streaming)
elif .type == "content_block_start" and .content_block.type == "tool_use" then
    tool_box(.content_block.name; .content_block.input | tool_context)

# User tool results (only show errors)
elif .type == "user" and .message.content then
    .message.content[] |
    if .type == "tool_result" then
        if .is_error == true then
            result_box("error"; .content)
        else
            # Skip verbose tool results
            empty
        end
    else empty end

# ============================================================
# SESSION COMPLETE
# ============================================================

elif .type == "result" and .subtype == "success" then
    "",
    "────────────────────────────────────────",
    "Complete (" + (.num_turns | tostring) + " turns" +
        (if .total_cost_usd then ", $" + (.total_cost_usd | tostring) else "" end) +
        (if .usage.input_tokens then ", " + ((.usage.input_tokens + .usage.output_tokens) | tostring) + " tokens" else "" end) + ")"

# ============================================================
# FALLBACK
# ============================================================

else empty end
