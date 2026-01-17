# Codex CLI Output Parser - Clean Box-Drawing Format
# Handles: thread.started, turn.started, turn.completed, item.started, item.completed
#
# Environment: RALPH_SHOW_THINKING (true/false) - passed via --arg show_thinking
#
# Output format:
#   Text flows naturally as paragraphs
#   ┌─ Bash
#   │  $ command
#   └─ output (exit 0)
#   ┄┄┄ thinking ┄┄┄ (when enabled)

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

# Skip thread/turn events
if .type == "thread.started" then empty
elif .type == "turn.started" then empty
elif .type == "turn.completed" then empty

# ============================================================
# REASONING/THINKING - Show only when RALPH_SHOW_THINKING=true
# ============================================================

# Reasoning item started
elif .type == "item.started" and .item.type == "reasoning" then
    if $show_thinking == "true" then "┄┄┄ thinking ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄" else empty end

# Reasoning item completed
elif .type == "item.completed" and .item.type == "reasoning" then
    if $show_thinking == "true" then
        (.item.text // "" | split("\n")[:10][] | .[:100]),
        "┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄"
    else empty end

# ============================================================
# COMMAND EXECUTION
# ============================================================

# Command execution start
elif .type == "item.started" and .item.type == "command_execution" then
    tool_box("Bash"; "$ " + (.item.command | split("\n")[0][:80]))

# Command execution complete
elif .type == "item.completed" and .item.type == "command_execution" then
    if .item.exit_code != 0 then
        result_box("error"; .item.aggregated_output // ("exit " + (.item.exit_code | tostring)))
    elif (.item.aggregated_output // "") != "" then
        "└─ " + (.item.aggregated_output | split("\n")[0][:60]) +
            (if .item.exit_code != null then " (exit " + (.item.exit_code | tostring) + ")" else "" end)
    else empty end

# ============================================================
# FILE CHANGES
# ============================================================

# File change completed
elif .type == "item.completed" and .item.type == "file_change" then
    (.item.changes[]? | "┌─ File: " + .kind + " " + .path, "└─")

# ============================================================
# MESSAGE OUTPUT (text response)
# ============================================================

# Message item completed (assistant text response)
elif .type == "item.completed" and .item.type == "message" then
    .item.text // (.item.content[]? | select(.type == "text" or .type == "output_text") | .text)

# ============================================================
# SESSION COMPLETE
# ============================================================

elif .type == "session.complete" or .type == "thread.complete" then
    "",
    "────────────────────────────────────────",
    "Complete"

# ============================================================
# FALLBACK
# ============================================================

else empty end
