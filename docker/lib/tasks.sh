#!/bin/bash
# lib/tasks.sh - Task spec loading, injection, and status management
# Reads from .project/specs/tasks/phase-*.json
# Uses jq for JSON manipulation

# ═══════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════

TASK_SPECS_DIR="${RALPH_TASK_SPECS_DIR:-.project/specs/tasks}"
TASK_SUMMARY_FILE="$TASK_SPECS_DIR/summary.json"

# ═══════════════════════════════════════════════════════════
# TASK LOADING
# ═══════════════════════════════════════════════════════════

# Check if task specs exist
has_task_specs() {
    [[ -d "$TASK_SPECS_DIR" ]] && ls "$TASK_SPECS_DIR"/phase-*.json &>/dev/null
}

# Get current task ID from summary.json
get_current_task() {
    if [[ -f "$TASK_SUMMARY_FILE" ]]; then
        jq -r '.current_task // empty' "$TASK_SUMMARY_FILE"
    fi
}

# Get current phase ID from summary.json
get_current_phase() {
    if [[ -f "$TASK_SUMMARY_FILE" ]]; then
        jq -r '.current_phase // empty' "$TASK_SUMMARY_FILE"
    fi
}

# Get task details by ID
# Usage: get_task_by_id "1.2"
get_task_by_id() {
    local task_id="$1"
    local phase_num="${task_id%%.*}"
    
    for phase_file in "$TASK_SPECS_DIR"/phase-*.json; do
        [[ -f "$phase_file" ]] || continue
        local result=$(jq --arg id "$task_id" '.tasks[] | select(.id == $id)' "$phase_file" 2>/dev/null)
        if [[ -n "$result" ]]; then
            echo "$result"
            return 0
        fi
    done
    return 1
}

# Get next pending task respecting dependencies
get_next_pending_task() {
    for phase_file in "$TASK_SPECS_DIR"/phase-*.json; do
        [[ -f "$phase_file" ]] || continue
        
        # Get all pending tasks
        local pending_tasks=$(jq -r '.tasks[] | select(.status == "pending") | .id' "$phase_file")
        
        for task_id in $pending_tasks; do
            # Check if all dependencies are complete
            local deps=$(jq -r --arg id "$task_id" '.tasks[] | select(.id == $id) | .depends_on[]?' "$phase_file")
            local all_deps_complete=true
            
            for dep in $deps; do
                local dep_status=$(get_task_status "$dep")
                if [[ "$dep_status" != "completed" ]]; then
                    all_deps_complete=false
                    break
                fi
            done
            
            if [[ "$all_deps_complete" == "true" ]]; then
                echo "$task_id"
                return 0
            fi
        done
    done
    return 1
}

# Get task status by ID
get_task_status() {
    local task_id="$1"
    for phase_file in "$TASK_SPECS_DIR"/phase-*.json; do
        [[ -f "$phase_file" ]] || continue
        local status=$(jq -r --arg id "$task_id" '.tasks[] | select(.id == $id) | .status' "$phase_file" 2>/dev/null)
        if [[ -n "$status" && "$status" != "null" ]]; then
            echo "$status"
            return 0
        fi
    done
    return 1
}

# ═══════════════════════════════════════════════════════════
# TASK CONTEXT INJECTION
# ═══════════════════════════════════════════════════════════

# Build task context markdown for prompt injection
# Usage: build_task_context "1.2"
build_task_context() {
    local task_id="$1"
    local task_json=$(get_task_by_id "$task_id")
    
    if [[ -z "$task_json" ]]; then
        return 1
    fi
    
    local name=$(echo "$task_json" | jq -r '.name')
    local description=$(echo "$task_json" | jq -r '.description')
    local complexity=$(echo "$task_json" | jq -r '.complexity')
    local provider=$(echo "$task_json" | jq -r '.provider')
    
    # Build acceptance criteria list
    local criteria=$(echo "$task_json" | jq -r '.acceptance_criteria[]?' 2>/dev/null | sed 's/^/- /')
    
    # Build files to create/modify lists
    local files_create=$(echo "$task_json" | jq -r '.files_to_create[]?' 2>/dev/null | sed 's/^/- /')
    local files_modify=$(echo "$task_json" | jq -r '.files_to_modify[]?' 2>/dev/null | sed 's/^/- /')
    
    cat <<EOF
## CURRENT TASK [$task_id] - $name

**Complexity**: $complexity | **Provider**: $provider

### Description
$description

EOF

    if [[ -n "$criteria" ]]; then
        cat <<EOF
### Acceptance Criteria
$criteria

EOF
    fi

    if [[ -n "$files_create" ]]; then
        cat <<EOF
### Files to Create
$files_create

EOF
    fi

    if [[ -n "$files_modify" ]]; then
        cat <<EOF
### Files to Modify
$files_modify

EOF
    fi

    echo "---"
}

# Inject task context into prompt
# Usage: inject_task_context "$AUGMENTED_PROMPT" "1.2"
inject_task_context() {
    local base_prompt="$1"
    local task_id="$2"
    
    if [[ -z "$task_id" ]]; then
        echo "$base_prompt"
        return
    fi
    
    local task_context=$(build_task_context "$task_id")
    
    if [[ -n "$task_context" ]]; then
        log "${CYAN}  Injecting task context for task $task_id${NC}"
        echo "$task_context

$base_prompt"
    else
        echo "$base_prompt"
    fi
}

# ═══════════════════════════════════════════════════════════
# TASK STATUS MANAGEMENT
# ═══════════════════════════════════════════════════════════

# Update task status in phase file (atomic write)
# Usage: update_task_status "1.2" "in_progress"
update_task_status() {
    local task_id="$1"
    local new_status="$2"
    local reason="${3:-}"
    
    for phase_file in "$TASK_SPECS_DIR"/phase-*.json; do
        [[ -f "$phase_file" ]] || continue
        
        # Check if task exists in this file
        local exists=$(jq --arg id "$task_id" '.tasks[] | select(.id == $id) | .id' "$phase_file" 2>/dev/null)
        if [[ -n "$exists" ]]; then
            local temp_file=$(mktemp)
            
            if [[ -n "$reason" && "$new_status" == "blocked" ]]; then
                jq --arg id "$task_id" --arg status "$new_status" --arg reason "$reason" \
                    '.tasks = [.tasks[] | if .id == $id then .status = $status | .blocked_reason = $reason else . end]' \
                    "$phase_file" > "$temp_file"
            else
                jq --arg id "$task_id" --arg status "$new_status" \
                    '.tasks = [.tasks[] | if .id == $id then .status = $status else . end]' \
                    "$phase_file" > "$temp_file"
            fi
            
            mv "$temp_file" "$phase_file"
            return 0
        fi
    done
    return 1
}

# Mark task as in_progress
mark_task_in_progress() {
    local task_id="$1"
    update_task_status "$task_id" "in_progress"
    log "${DIM}    Task $task_id marked in_progress${NC}"
}

# Mark task as completed and regenerate summary
mark_task_complete() {
    local task_id="$1"
    update_task_status "$task_id" "completed"
    log "${GREEN}  ✓ Task $task_id completed${NC}"
    regenerate_summary
}

# Mark task as blocked with reason
mark_task_blocked() {
    local task_id="$1"
    local reason="$2"
    update_task_status "$task_id" "blocked" "$reason"
    log "${YELLOW}  ⚠ Task $task_id blocked: $reason${NC}"
}

# Regenerate summary.json from phase files
regenerate_summary() {
    if [[ -x "$(command -v generate-summary.sh)" ]]; then
        generate-summary.sh "$TASK_SPECS_DIR" >/dev/null 2>&1
    else
        # Inline summary generation
        local total=0
        local completed=0
        local current_phase=""
        local current_task=""
        local phases="[]"
        
        for phase_file in "$TASK_SPECS_DIR"/phase-*.json; do
            [[ -f "$phase_file" ]] || continue
            
            local phase_id=$(basename "$phase_file" .json)
            local phase_name=$(jq -r '.name' "$phase_file")
            local phase_tasks=$(jq '.tasks | length' "$phase_file")
            local phase_completed=$(jq '[.tasks[] | select(.status == "completed")] | length' "$phase_file")
            
            total=$((total + phase_tasks))
            completed=$((completed + phase_completed))
            
            phases=$(echo "$phases" | jq --arg id "$phase_id" --arg name "$phase_name" \
                --argjson tasks "$phase_tasks" --argjson comp "$phase_completed" \
                '. + [{"id": $id, "name": $name, "tasks": $tasks, "completed": $comp}]')
            
            if [[ -z "$current_phase" ]]; then
                local first_pending=$(jq -r '.tasks[] | select(.status == "pending" or .status == "in_progress") | .id' "$phase_file" | head -1)
                if [[ -n "$first_pending" ]]; then
                    current_phase="$phase_id"
                    current_task="$first_pending"
                fi
            fi
        done
        
        local project=$(basename "$(dirname "$(dirname "$(dirname "$TASK_SPECS_DIR")")")")
        
        jq -n \
            --arg project "$project" \
            --argjson total "$total" \
            --argjson completed "$completed" \
            --arg current_phase "$current_phase" \
            --arg current_task "$current_task" \
            --argjson phases "$phases" \
            '{project: $project, total_tasks: $total, completed_tasks: $completed, 
              current_phase: $current_phase, current_task: $current_task, phases: $phases}' \
            > "$TASK_SUMMARY_FILE"
    fi
}

# ═══════════════════════════════════════════════════════════
# DEPENDENCY VALIDATION
# ═══════════════════════════════════════════════════════════

# Validate all task dependencies are satisfiable
validate_task_dependencies() {
    local all_ids=""
    local errors=0
    
    # Collect all task IDs
    for phase_file in "$TASK_SPECS_DIR"/phase-*.json; do
        [[ -f "$phase_file" ]] || continue
        all_ids="$all_ids $(jq -r '.tasks[].id' "$phase_file")"
    done
    
    # Check each dependency exists
    for phase_file in "$TASK_SPECS_DIR"/phase-*.json; do
        [[ -f "$phase_file" ]] || continue
        
        local deps=$(jq -r '.tasks[] | "\(.id):\(.depends_on[]?)"' "$phase_file" 2>/dev/null)
        for dep_pair in $deps; do
            local task_id="${dep_pair%%:*}"
            local dep_id="${dep_pair#*:}"
            
            if [[ -n "$dep_id" ]] && ! echo "$all_ids" | grep -qw "$dep_id"; then
                log "${RED}  ERROR: Task $task_id depends on non-existent task $dep_id${NC}"
                ((errors++))
            fi
        done
    done
    
    return $errors
}
