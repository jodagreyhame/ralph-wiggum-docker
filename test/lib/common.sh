#!/bin/bash
# test/lib/common.sh - Shared test utilities
# Sourced by test-all.sh and other test scripts

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
GRAY='\033[0;90m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
SKIPPED=0

# Recommendations array
declare -a RECOMMENDATIONS

# ══════════════════════════════════════════════════════════
# OUTPUT FUNCTIONS
# ══════════════════════════════════════════════════════════

print_header() {
    echo ""
    echo -e "${BLUE}+----------------------------------------------------------+${NC}"
    echo -e "${BLUE}|              RALPH LOOP DOCKER TEST SUITE                |${NC}"
    echo -e "${BLUE}+----------------------------------------------------------+${NC}"
}

print_footer() {
    echo -e "${BLUE}+----------------------------------------------------------+${NC}"
    printf "${BLUE}| SUMMARY: ${GREEN}%d passed${NC}, ${RED}%d failed${NC}, ${YELLOW}%d skipped${NC}              ${BLUE}|${NC}\n" "$PASSED" "$FAILED" "$SKIPPED"

    if [ ${#RECOMMENDATIONS[@]} -gt 0 ]; then
        echo -e "${BLUE}+----------------------------------------------------------+${NC}"
        echo -e "${BLUE}| RECOMMENDATIONS:                                          |${NC}"
        for rec in "${RECOMMENDATIONS[@]}"; do
            printf "${BLUE}|${NC} ${YELLOW}- %-55s${NC}${BLUE}|${NC}\n" "$rec"
        done
    fi

    echo -e "${BLUE}+----------------------------------------------------------+${NC}"
    echo ""
}

pass() {
    echo -e "${BLUE}|${NC} ${GREEN}[PASS]${NC} $1"
    ((PASSED++))
}

fail() {
    echo -e "${BLUE}|${NC} ${RED}[FAIL]${NC} $1"
    ((FAILED++))
    if [ -n "${2:-}" ]; then
        RECOMMENDATIONS+=("$2")
    fi
}

skip() {
    echo -e "${BLUE}|${NC} ${YELLOW}[SKIP]${NC} $1"
    ((SKIPPED++))
    if [ -n "${2:-}" ]; then
        RECOMMENDATIONS+=("$2")
    fi
}

info() {
    echo -e "${BLUE}|${NC}        ${GRAY}$1${NC}"
}

section() {
    echo -e "${BLUE}|${NC}"
    info "$1"
    echo -e "${BLUE}|${NC}"
}

# ══════════════════════════════════════════════════════════
# INFRASTRUCTURE TESTS
# ══════════════════════════════════════════════════════════

test_docker_available() {
    if command -v docker &> /dev/null && docker info &> /dev/null; then
        pass "Docker available"
        return 0
    else
        fail "Docker not available" "Install Docker and ensure daemon is running"
        return 1
    fi
}

test_docker_compose() {
    if docker compose version &> /dev/null; then
        pass "Docker Compose available"
        return 0
    else
        fail "Docker Compose not available" "Install Docker Compose v2"
        return 1
    fi
}

test_image_build() {
    local skip_build="${SKIP_BUILD:-false}"

    if [ "$skip_build" = "true" ]; then
        skip "Image build (skipped)" ""
        return 0
    fi

    info "Building image (this may take a minute)..."
    if docker compose build 2>&1 | grep -qE "(Successfully|exporting to image)" || docker compose build --quiet 2>/dev/null; then
        pass "Image build successful"
        return 0
    else
        fail "Image build failed" "Check docker/Dockerfile for errors"
        return 1
    fi
}

test_template_exists() {
    if [ -d "template" ] && [ -f "template/.project/prompts/BUILDER.md" ]; then
        pass "Template directory exists"
        return 0
    else
        fail "Template missing" "Ensure template/ directory with .project/prompts/BUILDER.md exists"
        return 1
    fi
}
