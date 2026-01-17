#!/bin/bash
# show-all-displays.sh - Display all formatter output styles
# Usage: ./show-all-displays.sh [--thinking]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FORMATTER="$SCRIPT_DIR/../src/index.js"
FIXTURE="$SCRIPT_DIR/all-displays.ndjson"

echo "========================================"
echo "Ralph Formatter - All Display Styles"
echo "========================================"
echo ""

if [[ "$1" == "--thinking" ]]; then
    echo "[RALPH_SHOW_THINKING=true]"
    echo ""
    RALPH_SHOW_THINKING=true node "$FORMATTER" < "$FIXTURE"
else
    echo "[RALPH_SHOW_THINKING=false (default)]"
    echo ""
    node "$FORMATTER" < "$FIXTURE"
fi

echo ""
echo "========================================"
echo "Run with --thinking to see thinking blocks"
echo "========================================"
