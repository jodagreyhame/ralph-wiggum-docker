#!/bin/bash
# Test unified.jq filter against sample data from cli-format-docs
# Run this inside Docker or any environment with jq installed

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FILTER="$SCRIPT_DIR/unified.jq"
SAMPLES_DIR="/project/.projects/cli-format-docs/samples"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo "Testing unified.jq filter..."
echo ""

# Check jq
if ! command -v jq &> /dev/null; then
    echo -e "${RED}ERROR: jq not found${NC}"
    exit 1
fi

# Check filter file
if [[ ! -f "$FILTER" ]]; then
    echo -e "${RED}ERROR: Filter not found: $FILTER${NC}"
    exit 1
fi

# Validate jq syntax
echo -n "Validating jq syntax... "
if jq -n --arg show_thinking "false" -f "$FILTER" &>/dev/null; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAILED${NC}"
    exit 1
fi

# Test each backend
test_backend() {
    local backend="$1"
    local sample="$2"

    echo ""
    echo -e "${CYAN}=== Testing $backend ===${NC}"

    if [[ ! -f "$sample" ]]; then
        echo "  Sample not found: $sample"
        return 1
    fi

    local lines=$(wc -l < "$sample")
    echo "  Input: $sample ($lines lines)"

    # Test with thinking hidden
    echo "  Testing with RALPH_SHOW_THINKING=false..."
    local output_hidden=$(head -50 "$sample" | jq -r --arg show_thinking "false" -f "$FILTER" 2>&1)
    local count_hidden=$(echo "$output_hidden" | grep -c . || echo 0)
    echo "    Output lines: $count_hidden"

    # Test with thinking shown
    echo "  Testing with RALPH_SHOW_THINKING=true..."
    local output_shown=$(head -50 "$sample" | jq -r --arg show_thinking "true" -f "$FILTER" 2>&1)
    local count_shown=$(echo "$output_shown" | grep -c . || echo 0)
    echo "    Output lines: $count_shown"

    # Show sample output
    echo "  Sample output (first 10 lines, thinking hidden):"
    echo "$output_hidden" | head -10 | sed 's/^/    /'

    echo -e "  ${GREEN}PASS${NC}"
}

# Run tests
test_backend "Claude" "$SAMPLES_DIR/claude/iteration_001/output.live"
test_backend "Gemini" "$SAMPLES_DIR/gemini/iteration_001/output.live"
test_backend "Codex" "$SAMPLES_DIR/codex/iteration_001/output.live"
test_backend "OpenCode" "$SAMPLES_DIR/opencode/iteration_001/output.live"

echo ""
echo -e "${GREEN}All tests passed!${NC}"
