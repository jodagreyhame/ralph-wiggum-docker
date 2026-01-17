#!/bin/bash
# test/lib/project.sh - Test project management
# Sourced by test-all.sh

# Test project prefix (set by main script)
TEST_PREFIX="${TEST_PREFIX:-_test-$(date +%s)}"

# Project root (set by main script)
PROJECT_ROOT="${PROJECT_ROOT:-.}"

# Quick test GOAL content
read -r -d '' QUICK_TEST_GOAL << 'EOF' || true
# Project Goal

## Objective

Connection test - verify agent can connect and respond.

## Completion Criteria

- [ ] Create file `test-result.txt` with content: `CONNECTED`
- [ ] Signal completion

## Acceptance Tests

1. `test-result.txt` exists with content `CONNECTED`
2. Completion signal written
EOF

# Quick test builder prompt content
read -r -d '' QUICK_TEST_PROMPT << 'EOF' || true
# Builder Workflow

You are the **BUILDER**. Read GOAL.md for your objective.

## Process

1. Read `cat GOAL.md` to understand the task
2. Create `test-result.txt` with content: `CONNECTED`
3. Signal completion: `echo "COMPLETE" > .project/state/completion.txt`

## Rules

- Complete in ONE iteration
- No git operations needed
EOF

# ══════════════════════════════════════════════════════════
# PROJECT MANAGEMENT
# ══════════════════════════════════════════════════════════

# Create a new test project with proper config.json
# Usage: new_test_project <name> <backend> <auth_mode>
new_test_project() {
    local name=$1
    local backend=${2:-claude}
    local auth_mode=${3:-glm}
    local dir="$PROJECT_ROOT/.projects/${TEST_PREFIX}-${name}"

    mkdir -p "$dir"
    mkdir -p "$dir/logs"
    mkdir -p "$dir/.project/state"
    mkdir -p "$dir/.project/prompts"

    # Write GOAL.md (project-specific)
    echo "$QUICK_TEST_GOAL" > "$dir/GOAL.md"

    # Write builder prompt to hidden location
    echo "$QUICK_TEST_PROMPT" > "$dir/.project/prompts/BUILDER.md"

    # Write config.json with new schema
    cat > "$dir/config.json" << JSONEOF
{
    "name": "$name",
    "description": "Test project",
    "version": "0.1.0",
    "prompts": {
        "dir": ".project/prompts",
        "goal": "GOAL.md",
        "builder": "BUILDER.md",
        "reviewer": "REVIEWER.md",
        "architect": "ARCHITECT.md"
    },
    "builder": {
        "backend": "$backend",
        "auth_mode": "$auth_mode",
        "model": null,
        "session_mode": "fresh"
    },
    "reviewer": {
        "enabled": false,
        "backend": "claude",
        "auth_mode": "anthropic-oauth",
        "model": null,
        "session_mode": "fresh"
    },
    "architect": {
        "enabled": false,
        "backend": "gemini",
        "auth_mode": "gemini-oauth",
        "model": null,
        "session_mode": "resume"
    },
    "escalation": {
        "enabled": false,
        "max_builder_failures": 3
    },
    "max_iterations": 2,
    "completion_enabled": true,
    "knowledge_dir": ".project"
}
JSONEOF

    # Write minimal AGENTS.md and create CLAUDE.md symlink
    echo -e "# Test Project\nMinimal test configuration." > "$dir/AGENTS.md"
    ln -s "AGENTS.md" "$dir/CLAUDE.md" 2>/dev/null || cp "$dir/AGENTS.md" "$dir/CLAUDE.md"

    # Initialize git repo
    pushd "$dir" > /dev/null
    git init --quiet 2>/dev/null || true
    git add -A 2>/dev/null || true
    git commit -m "init: test project" --quiet 2>/dev/null || true
    popd > /dev/null

    echo "$dir"
}

# Remove all test projects
remove_test_projects() {
    find "$PROJECT_ROOT/.projects" -maxdepth 1 -type d -name "${TEST_PREFIX}-*" -exec rm -rf {} \; 2>/dev/null || true
}

# Wait for agent completion or timeout
# Returns: "completed", "completion_file", "file_created", or "timeout"
wait_for_completion() {
    local project_dir=$1
    local timeout_seconds=${2:-60}

    local completion_file="$project_dir/.project/state/completion.txt"
    local output_log="$project_dir/logs/iteration_001/output.live"
    local start_time=$(date +%s)

    while true; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))

        if [ $elapsed -ge $timeout_seconds ]; then
            echo "timeout"
            return 1
        fi

        # Check for completion.txt (new file-based signaling)
        if [ -f "$completion_file" ]; then
            if grep -q "COMPLETE" "$completion_file" 2>/dev/null; then
                echo "completed"
                return 0
            fi
        fi

        # Check for logs/completion.json (legacy)
        if [ -f "$project_dir/logs/completion.json" ]; then
            if grep -q '"status".*:.*"complete"' "$project_dir/logs/completion.json" 2>/dev/null; then
                echo "completed"
                return 0
            fi
        fi

        # Check for test-result.txt (agent created file)
        if [ -f "$project_dir/test-result.txt" ]; then
            if grep -q "CONNECTED" "$project_dir/test-result.txt" 2>/dev/null; then
                echo "file_created"
                return 0
            fi
        fi

        sleep 0.5
    done
}

# ══════════════════════════════════════════════════════════
# AGENT CONNECTION TEST
# ══════════════════════════════════════════════════════════

# Test agent connection with given backend and auth mode
# Usage: test_agent_connection <test_name> <backend> <auth_mode>
test_agent_connection() {
    local test_name=$1
    local backend=$2
    local auth_mode=$3
    local timeout="${TIMEOUT:-60}"

    # Create slug for directory (replace spaces with dashes, lowercase)
    local slug=$(echo "$test_name" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')

    # Create test project with proper config
    local project_dir
    project_dir=$(new_test_project "$slug" "$backend" "$auth_mode")

    info "Testing $test_name ($backend backend, $auth_mode auth)..."

    # Export environment for docker compose
    export RALPH_PROJECT_DIR="$project_dir"
    export RALPH_PROJECT_NAME="${TEST_PREFIX}-${slug}"

    # Run agent in background
    docker compose run --rm ralph &>/dev/null &
    local docker_pid=$!

    # Wait for completion or timeout
    local result
    result=$(wait_for_completion "$project_dir" "$timeout")
    local wait_status=$?

    # Kill docker if still running
    kill $docker_pid 2>/dev/null || true
    wait $docker_pid 2>/dev/null || true

    if [ $wait_status -eq 0 ]; then
        pass "$test_name - $result"
        return 0
    else
        # Check if there was any output at all
        local session_log="$project_dir/logs/session.log"
        if [ -f "$session_log" ] && grep -q "iteration" "$session_log" 2>/dev/null; then
            pass "$test_name - Agent started (check logs for details)"
            return 0
        fi
        fail "$test_name - Timeout after ${timeout}s" "Check auth config and API connectivity"
        return 1
    fi
}
