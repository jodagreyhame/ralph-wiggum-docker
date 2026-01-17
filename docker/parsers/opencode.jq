# OpenCode CLI Output Parser - Clean Box-Drawing Format
# Handles: step_start, step_finish, text, tool_use, error
#
# Environment: RALPH_SHOW_THINKING (true/false) - passed via --arg show_thinking
#
# Output format:
#   Text flows naturally as paragraphs
#   ┌─ ToolName
#   │  context (path, command, pattern)
#   └─ result
#   ┄┄┄ thinking ┄┄┄ (when enabled)

# Helper: Format tool input context
def tool_context:
    if .command then "$ " + (.command | split("\n")[0][:80])
    elif .filePath then .filePath
    elif .file_path then .file_path
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

# Skip step_start events
if .type == "step_start" then empty

# ============================================================
# TEXT OUTPUT
# ============================================================

# Text content
elif .type == "text" and .part.text then
    .part.text

# ============================================================
# TOOL USE
# ============================================================

# Tool use - handle different states
elif .type == "tool_use" and .part.tool then
    if .part.state.status == "running" or .part.state.status == "pending" then
        # Tool starting
        tool_box(.part.tool; .part.state.input | tool_context)
    elif .part.state.status == "completed" then
        # Tool completed - show result
        if .part.state.output and (.part.state.output | type) == "string" and (.part.state.output | length) > 0 then
            "└─ " + (.part.state.output | split("\n")[0][:60])
        else empty end
    elif .part.state.status == "error" then
        result_box("error"; .part.state.error // "unknown error")
    else
        # Unknown state - show tool name
        tool_box(.part.tool; .part.state.input | tool_context)
    end

# ============================================================
# ERROR EVENTS
# ============================================================

elif .type == "error" then
    "├─ error ─────────────────────────",
    "│  " + (.error.data.message // .error.name // "Unknown error" | split("\n")[0][:80]),
    "└─"

# ============================================================
# SESSION COMPLETE
# ============================================================

elif .type == "step_finish" and .part.tokens then
    "",
    "────────────────────────────────────────",
    "Complete (" + (.part.reason // "done") +
        (if .part.cost and .part.cost > 0 then ", $" + (.part.cost | tostring) else "" end) +
        ", " + ((.part.tokens.input + .part.tokens.output) | tostring) + " tokens)"

elif .type == "step_finish" then
    "",
    "────────────────────────────────────────",
    "Step complete"

# ============================================================
# FALLBACK
# ============================================================

else empty end
