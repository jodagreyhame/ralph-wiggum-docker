# Gemini CLI Output Parser - Clean Box-Drawing Format
# Handles: init, message, tool_use, tool_result, result
#
# Environment: RALPH_SHOW_THINKING (true/false) - passed via --arg show_thinking
#
# Output format:
#   Text flows naturally as paragraphs
#   ┌─ ToolName
#   │  context (path, command, pattern)
#   └─

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
        "└─ " + ($content | split("\n")[0][:60])
    else empty end;

# ============================================================
# MAIN PARSER
# ============================================================

# Skip init events
if .type == "init" then empty

# ============================================================
# MESSAGE CONTENT
# ============================================================

# User messages (skip - already know the prompt)
elif .type == "message" and .role == "user" then empty

# Assistant message (complete, non-streaming)
elif .type == "message" and .role == "assistant" and .delta != true then
    .content

# Assistant message (streaming delta)
elif .type == "message" and .delta == true then
    .content

# ============================================================
# TOOL USE
# ============================================================

# Tool use event
elif .type == "tool_use" and .tool_name then
    tool_box(.tool_name; .parameters | tool_context)

# Tool result event - show both success and error
elif .type == "tool_result" then
    if .status == "error" then
        result_box("error"; .output // "error")
    elif .output and (.output | type) == "string" and (.output | length) > 0 then
        "└─ " + (.output | split("\n")[0][:60])
    else empty end

# ============================================================
# SESSION COMPLETE
# ============================================================

elif .type == "result" and .stats then
    "",
    "────────────────────────────────────────",
    "Complete (" + (.stats.tool_calls | tostring) + " tools, " + (.stats.total_tokens | tostring) + " tokens, " + ((.stats.duration_ms / 1000) | floor | tostring) + "s)"

elif .type == "result" then
    "",
    "────────────────────────────────────────",
    "Complete (" + (.status // "done") + ")"

# ============================================================
# FALLBACK
# ============================================================

else empty end
