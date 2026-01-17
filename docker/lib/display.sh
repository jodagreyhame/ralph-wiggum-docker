#!/bin/bash
# lib/display.sh - Logging and banner display functions
# Requires: colors.sh to be sourced first

# Log function - outputs to console and session log
log() {
    echo -e "$1" | tee -a "$SESSION_LOG"
}

# Print startup banner
print_startup_banner() {
    log ""
    log "${CLI_COLOR}╔════════════════════════════════════════════════════════════╗${NC}"
    log "${CLI_COLOR}║${NC}  ${BOLD}${MAGENTA}RALPH WIGGUM DOCKER LOOP${NC}                                ${CLI_COLOR}║${NC}"
    log "${CLI_COLOR}║${NC}  ${DIM}$PROJECT_NAME - $CLI_NAME Backend${NC}"
    log "${CLI_COLOR}╚════════════════════════════════════════════════════════════╝${NC}"
    log ""
    log "  ${DIM}Goal:${NC}       $RALPH_GOAL_FILE"
    log "  ${DIM}Prompt:${NC}     $RALPH_PROMPT_FILE"
    log "  ${DIM}Iterations:${NC} $MAX_ITERATIONS"
    log "  ${DIM}CLI:${NC}        $CLI_NAME"
    if [[ "$CHECK_COMPLETION" == "true" ]]; then
        log "  ${DIM}Completion:${NC} ${GREEN}Enabled${NC} (file: .project/state/completion.txt)"
    else
        log "  ${DIM}Completion:${NC} ${YELLOW}Disabled${NC}"
    fi
    log "  ${DIM}Logs:${NC}       $LOG_DIR/iteration_XXX/"
    log "  ${DIM}Live (raw):${NC} $LOG_DIR/current.log"
    log "  ${DIM}Live (fmt):${NC} $LOG_DIR/current.readable"
    if [[ "$READABLE_OUTPUT" == "true" ]]; then
        log "  ${DIM}Console:${NC}    ${GREEN}Human-readable${NC} (RALPH_READABLE_OUTPUT=false for raw)"
    else
        log "  ${DIM}Console:${NC}    ${YELLOW}Raw JSON${NC} (RALPH_READABLE_OUTPUT=true for readable)"
    fi
    if [[ "$SHOW_THINKING" == "true" ]]; then
        log "  ${DIM}Thinking:${NC}   ${CYAN}Visible${NC} (RALPH_SHOW_THINKING=false to hide)"
    else
        log "  ${DIM}Thinking:${NC}   ${DIM}Hidden${NC} (RALPH_SHOW_THINKING=true to show)"
    fi
    local builder_session="${RALPH_BUILDER_SESSION_MODE:-fresh}"
    if [[ "$builder_session" == "resume" ]]; then
        log "  ${DIM}Builder:${NC}    ${CYAN}Resume${NC} (accumulating context)"
    else
        log "  ${DIM}Builder:${NC}    ${DIM}Fresh${NC} (clean slate each iteration)"
    fi
    if [[ "$REVIEWER_ENABLED" == "true" ]]; then
        log "  ${DIM}Reviewer:${NC}   ${GREEN}Enabled${NC} (backend: $REVIEWER_BACKEND, session: $REVIEWER_SESSION_MODE)"
    else
        log "  ${DIM}Reviewer:${NC}   ${DIM}Disabled${NC}"
    fi
    if [[ "$ARCHITECT_ENABLED" == "true" ]]; then
        log "  ${DIM}Architect:${NC}  ${GREEN}Enabled${NC} (backend: $ARCHITECT_BACKEND, session: $ARCHITECT_SESSION_MODE)"
    else
        log "  ${DIM}Architect:${NC}  ${DIM}Disabled${NC}"
    fi
    if [[ "$ESCALATION_ENABLED" == "true" ]]; then
        log "  ${DIM}Escalation:${NC} ${YELLOW}Enabled${NC} (after $ESCALATION_MAX_FAILURES failures)"
    else
        log "  ${DIM}Escalation:${NC} ${DIM}Disabled${NC}"
    fi
    log ""
    log "${DIM}────────────────────────────────────────────────────────────────${NC}"
}

# Print iteration header
print_iteration_header() {
    local iteration="$1"
    local max="$2"
    log ""
    log "${CLI_COLOR}┌──────────────────────────────────────────────────────────────┐${NC}"
    log "${CLI_COLOR}│${NC} ${BOLD}$PROJECT_NAME${NC} ${DIM}iteration${NC} ${CLI_COLOR}$iteration${NC}${DIM}/${max}${NC}"
    log "${CLI_COLOR}└──────────────────────────────────────────────────────────────┘${NC}"
    log ""
}

# Print completion banner
print_completion_banner() {
    local iterations="$1"
    local duration="$2"
    local approved_by="${3:-promise}"

    log ""
    log "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    if [[ "$approved_by" == "builder" ]]; then
        log "${GREEN}║${NC}  ${BOLD}$PROJECT_NAME${NC} ${GREEN}COMPLETE (builder signaled)${NC}"
    else
        log "${GREEN}║${NC}  ${BOLD}$PROJECT_NAME${NC} ${GREEN}COMPLETE ($approved_by approved)${NC}"
    fi
    log "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    log ""
    log "  ${DIM}Iterations:${NC} $iterations"
    log "  ${DIM}Duration:${NC}   ${duration}s"
    log "  ${DIM}CLI:${NC}        $CLI_NAME"
    log ""
}

# Print cancelled banner
print_cancelled_banner() {
    echo ""
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║${NC}  ${BOLD}$PROJECT_NAME${NC} ${YELLOW}CANCELLED${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  Iteration: ${CYAN}${i:-0}${NC}"
    echo -e "  CLI:       ${CLI_NAME}"
    echo ""
}

# Print blocked banner
print_blocked_banner() {
    log ""
    log "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    log "${RED}║${NC}  ${BOLD}$PROJECT_NAME${NC} ${RED}BLOCKED${NC}"
    log "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    log ""
    log "${RED}Worker signaled BLOCKED:${NC}"
    cat "BLOCKED.md" | tee -a "$SESSION_LOG"
    log ""
}

# Print max iterations banner
print_max_iterations_banner() {
    local iterations="$1"
    local duration="$2"

    log ""
    log "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    log "${YELLOW}║${NC}  ${BOLD}$PROJECT_NAME${NC} ${YELLOW}MAX ITERATIONS${NC}"
    log "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    log ""
    log "  ${DIM}Iterations:${NC} $iterations"
    log "  ${DIM}Duration:${NC}   ${duration}s"
    log "  ${DIM}CLI:${NC}        $CLI_NAME"
    log ""
}
