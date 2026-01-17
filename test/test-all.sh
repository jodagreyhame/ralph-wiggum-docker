#!/bin/bash
# Ralph Loop Docker Test Suite
# Modular test runner - mirrors docker/cli/*.sh pattern
# Tests all auth modes by actually running agents and monitoring output

set -e

# ══════════════════════════════════════════════════════════
# SETUP
# ══════════════════════════════════════════════════════════

# Configuration
TIMEOUT=${1:-60}  # seconds to wait for agent response
SKIP_BUILD=${SKIP_BUILD:-false}
VERBOSE=${VERBOSE:-false}

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Test project prefix
TEST_PREFIX="_test-$(date +%s)"
export TEST_PREFIX
export PROJECT_ROOT

# Load .env file if it exists
if [ -f ".env" ]; then
    set -a
    source .env
    set +a
fi

# Source libraries
source "$SCRIPT_DIR/lib/common.sh"
source "$SCRIPT_DIR/lib/project.sh"

# ══════════════════════════════════════════════════════════
# CLEANUP
# ══════════════════════════════════════════════════════════

cleanup() {
    info "Cleaning up test projects..."
    remove_test_projects
}

trap cleanup EXIT

# ══════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════

main() {
    print_header
    info "Timeout: ${TIMEOUT}s per agent test"
    echo -e "${BLUE}|${NC}"

    # Prerequisites
    test_docker_available || { print_footer; exit 1; }
    test_docker_compose || { print_footer; exit 1; }

    # Build
    test_image_build || { print_footer; exit 1; }

    # Template
    test_template_exists || true

    echo -e "${BLUE}|${NC}"
    section "Running agent connection tests..."

    # Run tests for each auth mode
    for auth_config in "$SCRIPT_DIR"/auth/*.sh; do
        # Skip if no auth configs found
        [[ -f "$auth_config" ]] || continue

        # Reset variables before sourcing
        AUTH_NAME=""
        AUTH_ID=""
        AUTH_BACKEND=""
        PREREQ_MESSAGE=""

        # Source auth config
        source "$auth_config"

        # Verify required variables
        if [[ -z "$AUTH_NAME" ]] || [[ -z "$AUTH_ID" ]]; then
            info "Skipping invalid auth config: $auth_config"
            continue
        fi

        # Check auth prerequisites
        if ! auth_prereqs; then
            skip "$AUTH_NAME" "${PREREQ_MESSAGE:-Check auth configuration}"
            continue
        fi

        # Determine backend (use AUTH_BACKEND from auth config, or default to claude)
        local backend="${AUTH_BACKEND:-claude}"
        local backend_config="$SCRIPT_DIR/backends/${backend}.sh"

        # Source backend config if exists
        if [[ -f "$backend_config" ]]; then
            source "$backend_config"

            # Check backend prerequisites
            if ! backend_prereqs; then
                skip "$AUTH_NAME - $BACKEND_NAME backend unavailable" "Check $backend installation"
                continue
            fi
        fi

        # Run the actual test
        test_agent_connection "$AUTH_NAME" "$backend" "$AUTH_ID"
    done

    print_footer

    # Exit with failure if any tests failed
    [ $FAILED -eq 0 ]
}

main "$@"
