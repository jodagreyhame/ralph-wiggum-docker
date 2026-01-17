#!/bin/bash
# generate-summary.sh - Regenerate summary.json from phase-*.json files
# Usage: ./scripts/generate-summary.sh [specs_dir]
# Defaults to .project/specs/tasks if no argument provided

set -euo pipefail

# Get specs directory
SPECS_DIR="${1:-.project/specs/tasks}"

if [[ ! -d "$SPECS_DIR" ]]; then
    echo "ERROR: Specs directory not found: $SPECS_DIR" >&2
    exit 1
fi

# Check for jq
if ! command -v jq &> /dev/null; then
    echo "ERROR: jq is required but not installed" >&2
    exit 1
fi

# Find phase files
PHASE_FILES=$(ls "$SPECS_DIR"/phase-*.json 2>/dev/null || true)
if [[ -z "$PHASE_FILES" ]]; then
    echo "ERROR: No phase-*.json files found in $SPECS_DIR" >&2
    exit 1
fi

# Extract project name from directory
PROJECT_NAME=$(basename "$(dirname "$(dirname "$(dirname "$SPECS_DIR")")")")

# Initialize counters
TOTAL_TASKS=0
COMPLETED_TASKS=0
CURRENT_PHASE=""
CURRENT_TASK=""

# Build phases array and count tasks
PHASES_JSON="[]"
BY_PROVIDER='{}'
BY_COMPLEXITY='{}'

for phase_file in $PHASE_FILES; do
    # Extract phase info
    PHASE_ID=$(basename "$phase_file" .json)
    PHASE_NAME=$(jq -r '.name' "$phase_file")
    PHASE_TASKS=$(jq '.tasks | length' "$phase_file")
    PHASE_COMPLETED=$(jq '[.tasks[] | select(.status == "completed")] | length' "$phase_file")
    
    # Add to totals
    TOTAL_TASKS=$((TOTAL_TASKS + PHASE_TASKS))
    COMPLETED_TASKS=$((COMPLETED_TASKS + PHASE_COMPLETED))
    
    # Add to phases array
    PHASES_JSON=$(echo "$PHASES_JSON" | jq --arg id "$PHASE_ID" --arg name "$PHASE_NAME" \
        --argjson tasks "$PHASE_TASKS" --argjson completed "$PHASE_COMPLETED" \
        '. + [{"id": $id, "name": $name, "tasks": $tasks, "completed": $completed}]')
    
    # Find current phase and task (first non-completed phase with pending/in_progress task)
    if [[ -z "$CURRENT_PHASE" ]]; then
        FIRST_PENDING=$(jq -r '.tasks[] | select(.status == "pending" or .status == "in_progress") | .id' "$phase_file" | head -1)
        if [[ -n "$FIRST_PENDING" ]]; then
            CURRENT_PHASE="$PHASE_ID"
            CURRENT_TASK="$FIRST_PENDING"
        fi
    fi
    
    # Count by provider
    BY_PROVIDER=$(jq -s '.[0] as $base | .[1].tasks | group_by(.provider) | 
        map({key: .[0].provider, value: length}) | from_entries | 
        $base + .' <(echo "$BY_PROVIDER") "$phase_file")
    
    # Count by complexity
    BY_COMPLEXITY=$(jq -s '.[0] as $base | .[1].tasks | group_by(.complexity) | 
        map({key: .[0].complexity, value: length}) | from_entries | 
        $base + .' <(echo "$BY_COMPLEXITY") "$phase_file")
done

# Build summary JSON
SUMMARY=$(jq -n \
    --arg project "$PROJECT_NAME" \
    --argjson total "$TOTAL_TASKS" \
    --argjson completed "$COMPLETED_TASKS" \
    --arg current_phase "${CURRENT_PHASE:-}" \
    --arg current_task "${CURRENT_TASK:-}" \
    --argjson phases "$PHASES_JSON" \
    --argjson by_provider "$BY_PROVIDER" \
    --argjson by_complexity "$BY_COMPLEXITY" \
    '{
        project: $project,
        total_tasks: $total,
        completed_tasks: $completed,
        current_phase: $current_phase,
        current_task: $current_task,
        phases: $phases,
        by_provider: $by_provider,
        by_complexity: $by_complexity
    }')

# Write summary (atomic write)
SUMMARY_FILE="$SPECS_DIR/summary.json"
TEMP_FILE=$(mktemp)
echo "$SUMMARY" > "$TEMP_FILE"
mv "$TEMP_FILE" "$SUMMARY_FILE"

echo "Generated: $SUMMARY_FILE"
echo "  Total tasks: $TOTAL_TASKS"
echo "  Completed: $COMPLETED_TASKS"
echo "  Current: $CURRENT_TASK in $CURRENT_PHASE"
