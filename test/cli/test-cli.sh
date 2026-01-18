#!/bin/bash
# test/cli/test-cli.sh - CLI command test suite
# Tests all ralph CLI commands

# Don't exit on error - we want to continue testing
# set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source common utilities
source "$SCRIPT_DIR/../lib/common.sh"

# CLI path
CLI="node $ROOT_DIR/dist/cli/index.js"

# Test project name
TEST_PROJECT="cli-test-$$"

# ══════════════════════════════════════════════════════════
# SETUP/TEARDOWN
# ══════════════════════════════════════════════════════════

setup() {
    cd "$ROOT_DIR"

    # Ensure dist exists
    if [[ ! -f "$ROOT_DIR/dist/cli/index.js" ]]; then
        info "Building CLI..."
        bun run build 2>/dev/null || {
            fail "CLI build failed" "Run 'bun install && bun run build'"
            exit 1
        }
    fi
}

cleanup() {
    # Remove test project if it exists
    if [[ -d "$ROOT_DIR/.projects/$TEST_PROJECT" ]]; then
        rm -rf "$ROOT_DIR/.projects/$TEST_PROJECT"
    fi
}

# ══════════════════════════════════════════════════════════
# CLI TESTS
# ══════════════════════════════════════════════════════════

test_cli_version() {
    local output
    output=$($CLI --version 2>&1)
    if [[ "$output" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        pass "ralph --version"
        info "Version: $output"
    else
        fail "ralph --version" "Expected semver, got: $output"
    fi
}

test_cli_help() {
    local output
    output=$($CLI --help 2>&1)
    if [[ "$output" =~ "Usage:" ]] && [[ "$output" =~ "Commands:" ]]; then
        pass "ralph --help"
    else
        fail "ralph --help" "Help output missing expected sections"
    fi
}

test_cli_list() {
    local output
    output=$($CLI list 2>&1)
    # Should either show projects or "No projects found"
    if [[ "$output" =~ "Projects:" ]] || [[ "$output" =~ "No projects found" ]]; then
        pass "ralph list"
    else
        fail "ralph list" "Unexpected output: $output"
    fi
}

test_cli_list_alias() {
    local output
    output=$($CLI ls 2>&1)
    if [[ "$output" =~ "Projects:" ]] || [[ "$output" =~ "No projects found" ]]; then
        pass "ralph ls (alias)"
    else
        fail "ralph ls" "Alias not working"
    fi
}

test_cli_validate_valid() {
    local output
    output=$($CLI validate "$ROOT_DIR/template/config.json" 2>&1)
    if [[ "$output" =~ "valid" ]]; then
        pass "ralph validate (valid config)"
    else
        fail "ralph validate" "Expected valid, got: $output"
    fi
}

test_cli_validate_invalid_path() {
    local output
    local exit_code=0
    output=$($CLI validate "/nonexistent/path.json" 2>&1) || exit_code=$?
    if [[ $exit_code -ne 0 ]] && [[ "$output" =~ "not found" ]]; then
        pass "ralph validate (invalid path)"
    else
        fail "ralph validate" "Should fail for missing file"
    fi
}

test_cli_show_invalid() {
    local output
    local exit_code=0
    output=$($CLI show "nonexistent-project-xyz" 2>&1) || exit_code=$?
    if [[ $exit_code -ne 0 ]] && [[ "$output" =~ "not found" ]]; then
        pass "ralph show (invalid project)"
    else
        fail "ralph show" "Should fail for missing project"
    fi
}

test_cli_new_project() {
    local output
    output=$($CLI new "$TEST_PROJECT" --preset=minimal --description="Test project" 2>&1)
    if [[ "$output" =~ "Template files copied" ]] && [[ -d "$ROOT_DIR/.projects/$TEST_PROJECT" ]]; then
        pass "ralph new $TEST_PROJECT"
    else
        fail "ralph new" "Project creation failed: $output"
    fi
}

test_cli_new_duplicate() {
    local output
    local exit_code=0
    output=$($CLI new "$TEST_PROJECT" 2>&1) || exit_code=$?
    if [[ $exit_code -ne 0 ]] && [[ "$output" =~ "already exists" ]]; then
        pass "ralph new (duplicate detection)"
    else
        fail "ralph new" "Should reject duplicate project name"
    fi
}

test_cli_show_valid() {
    local output
    output=$($CLI show "$TEST_PROJECT" 2>&1)
    if [[ "$output" =~ "Project:" ]] && [[ "$output" =~ "$TEST_PROJECT" ]]; then
        pass "ralph show $TEST_PROJECT"
    else
        fail "ralph show" "Failed to show project: $output"
    fi
}

test_cli_delete_project() {
    local output
    output=$($CLI delete "$TEST_PROJECT" --force 2>&1)
    if [[ "$output" =~ "Deleted" ]] && [[ ! -d "$ROOT_DIR/.projects/$TEST_PROJECT" ]]; then
        pass "ralph delete $TEST_PROJECT"
    else
        fail "ralph delete" "Project deletion failed: $output"
    fi
}

test_cli_delete_invalid() {
    local output
    local exit_code=0
    output=$($CLI delete "nonexistent-project-xyz" --force 2>&1) || exit_code=$?
    if [[ $exit_code -ne 0 ]] && [[ "$output" =~ "not found" ]]; then
        pass "ralph delete (invalid project)"
    else
        fail "ralph delete" "Should fail for missing project"
    fi
}

# ══════════════════════════════════════════════════════════
# DISPLAY MODE TESTS
# ══════════════════════════════════════════════════════════

test_display_dashboard() {
    # Find a project with actual task phase files (not just the directory)
    local test_dir=""
    for dir in "$ROOT_DIR/.projects"/*/; do
        if [[ -d "${dir}.project/specs/tasks" ]]; then
            # Check for actual phase-*.json files
            if compgen -G "${dir}.project/specs/tasks/phase-*.json" > /dev/null 2>&1; then
                test_dir="$dir"
                break
            fi
        fi
    done

    if [[ -z "$test_dir" ]]; then
        skip "ralph -p <path> -s dashboard" "No project with task specs found"
        return
    fi

    local output
    output=$($CLI -p "$test_dir" -s dashboard 2>&1)
    if [[ "$output" =~ "RALPH TERMINAL" ]] || [[ "$output" =~ "Progress" ]]; then
        pass "ralph -p <path> -s dashboard"
    else
        fail "ralph -p -s dashboard" "Dashboard not rendering: $output"
    fi
}

test_display_tasks() {
    local test_dir=""
    for dir in "$ROOT_DIR/.projects"/*/; do
        if [[ -d "${dir}.project/specs/tasks" ]]; then
            if compgen -G "${dir}.project/specs/tasks/phase-*.json" > /dev/null 2>&1; then
                test_dir="$dir"
                break
            fi
        fi
    done

    if [[ -z "$test_dir" ]]; then
        skip "ralph -p <path> -s tasks" "No project with task specs found"
        return
    fi

    local output
    output=$($CLI -p "$test_dir" -s tasks 2>&1)
    if [[ "$output" =~ "TASKS" ]] || [[ "$output" =~ "Phase" ]]; then
        pass "ralph -p <path> -s tasks"
    else
        fail "ralph -p -s tasks" "Tasks not rendering: $output"
    fi
}

test_display_progress() {
    local test_dir=""
    for dir in "$ROOT_DIR/.projects"/*/; do
        if [[ -d "${dir}.project/specs/tasks" ]]; then
            if compgen -G "${dir}.project/specs/tasks/phase-*.json" > /dev/null 2>&1; then
                test_dir="$dir"
                break
            fi
        fi
    done

    if [[ -z "$test_dir" ]]; then
        skip "ralph -p <path> -s progress" "No project with task specs found"
        return
    fi

    local output
    output=$($CLI -p "$test_dir" -s progress 2>&1)
    if [[ "$output" =~ "PROGRESS" ]] || [[ "$output" =~ "Overall" ]]; then
        pass "ralph -p <path> -s progress"
    else
        fail "ralph -p -s progress" "Progress not rendering: $output"
    fi
}

test_display_task_detail() {
    local test_dir=""
    for dir in "$ROOT_DIR/.projects"/*/; do
        if [[ -d "${dir}.project/specs/tasks" ]]; then
            if compgen -G "${dir}.project/specs/tasks/phase-*.json" > /dev/null 2>&1; then
                test_dir="$dir"
                break
            fi
        fi
    done

    if [[ -z "$test_dir" ]]; then
        skip "ralph -p <path> -t <id>" "No project with task specs found"
        return
    fi

    local output
    output=$($CLI -p "$test_dir" -t "0.1" 2>&1)
    if [[ "$output" =~ "Task 0.1" ]] || [[ "$output" =~ "Description" ]]; then
        pass "ralph -p <path> -t 0.1"
    else
        fail "ralph -p -t" "Task detail not rendering: $output"
    fi
}

test_display_invalid_project() {
    local output
    local exit_code=0
    output=$($CLI -p "/nonexistent/path" -s dashboard 2>&1) || exit_code=$?
    if [[ $exit_code -ne 0 ]] && [[ "$output" =~ "not found" ]]; then
        pass "ralph -p (invalid path)"
    else
        fail "ralph -p" "Should fail for invalid project path"
    fi
}

# ══════════════════════════════════════════════════════════
# NEW COMMAND OPTIONS TESTS
# ══════════════════════════════════════════════════════════

test_new_with_preset() {
    local test_name="cli-preset-test-$$"
    local output

    output=$($CLI new "$test_name" --preset=three-tier 2>&1)
    if [[ "$output" =~ "three-tier" ]] && [[ -d "$ROOT_DIR/.projects/$test_name" ]]; then
        pass "ralph new --preset=three-tier"
        # Cleanup
        rm -rf "$ROOT_DIR/.projects/$test_name"
    else
        fail "ralph new --preset" "Preset not applied: $output"
    fi
}

test_new_with_builder_options() {
    local test_name="cli-builder-test-$$"
    local output

    output=$($CLI new "$test_name" --builder-backend=gemini --builder-auth=gemini-oauth 2>&1)
    if [[ "$output" =~ "gemini" ]] && [[ -d "$ROOT_DIR/.projects/$test_name" ]]; then
        # Verify config
        local config_backend
        config_backend=$(cat "$ROOT_DIR/.projects/$test_name/config.json" | grep -o '"backend":\s*"gemini"' || true)
        if [[ -n "$config_backend" ]]; then
            pass "ralph new --builder-backend"
            rm -rf "$ROOT_DIR/.projects/$test_name"
        else
            fail "ralph new --builder-backend" "Backend not set in config"
            rm -rf "$ROOT_DIR/.projects/$test_name"
        fi
    else
        fail "ralph new --builder-backend" "Builder options failed: $output"
    fi
}

test_new_with_max_iterations() {
    local test_name="cli-iter-test-$$"
    local output

    output=$($CLI new "$test_name" --max-iterations 50 2>&1)
    if [[ -d "$ROOT_DIR/.projects/$test_name" ]]; then
        local config_iter
        config_iter=$(cat "$ROOT_DIR/.projects/$test_name/config.json" | grep -o '"max_iterations":\s*50' || true)
        if [[ -n "$config_iter" ]]; then
            pass "ralph new --max-iterations"
        else
            fail "ralph new --max-iterations" "max_iterations not set in config"
        fi
        rm -rf "$ROOT_DIR/.projects/$test_name"
    else
        fail "ralph new --max-iterations" "Project creation failed: $output"
    fi
}

# ══════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════

main() {
    print_header
    echo -e "${BLUE}|${NC}        ${CYAN}CLI Command Test Suite${NC}"
    echo -e "${BLUE}|${NC}"

    setup

    # Ensure cleanup on exit
    trap cleanup EXIT

    section "Basic Commands"
    test_cli_version
    test_cli_help
    test_cli_list
    test_cli_list_alias

    section "Validation"
    test_cli_validate_valid
    test_cli_validate_invalid_path

    section "Project Management"
    test_cli_show_invalid
    test_cli_new_project
    test_cli_new_duplicate
    test_cli_show_valid
    test_cli_delete_project
    test_cli_delete_invalid

    section "Display Modes"
    test_display_dashboard
    test_display_tasks
    test_display_progress
    test_display_task_detail
    test_display_invalid_project

    section "New Command Options"
    test_new_with_preset
    test_new_with_builder_options
    test_new_with_max_iterations

    print_footer

    # Exit with failure if any tests failed
    if [[ $FAILED -gt 0 ]]; then
        exit 1
    fi
}

main "$@"
