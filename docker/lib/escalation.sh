#!/bin/bash
# lib/escalation.sh - Role escalation logic for 3-tier review system
# Handles failure tracking and role promotion

# Increment consecutive failure count
increment_failure_count() {
    if [[ "$ESCALATION_ENABLED" != "true" ]]; then return; fi
    local count=$(jq -r '.consecutive_failures' "$ESCALATION_FILE" 2>/dev/null || echo "0")
    count=$((count + 1))
    jq ".consecutive_failures = $count" "$ESCALATION_FILE" > "$ESCALATION_FILE.tmp" 2>/dev/null
    mv "$ESCALATION_FILE.tmp" "$ESCALATION_FILE"
    log "${DIM}  Consecutive failures: $count${NC}"
}

# Reset failure count (called on PASS)
reset_failure_count() {
    if [[ "$ESCALATION_ENABLED" != "true" ]]; then return; fi
    jq '.consecutive_failures = 0' "$ESCALATION_FILE" > "$ESCALATION_FILE.tmp" 2>/dev/null
    mv "$ESCALATION_FILE.tmp" "$ESCALATION_FILE"
}

# Check if escalation is needed and perform role promotion
check_escalation() {
    if [[ "$ESCALATION_ENABLED" != "true" ]]; then return; fi

    local count=$(jq -r '.consecutive_failures' "$ESCALATION_FILE" 2>/dev/null || echo "0")
    local escalated=$(jq -r '.escalated' "$ESCALATION_FILE" 2>/dev/null || echo "false")

    if [[ "$count" -ge "$ESCALATION_MAX_FAILURES" && "$escalated" != "true" ]]; then
        log ""
        log "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
        log "${RED}║${NC}  ${BOLD}ESCALATION${NC}: Builder failed $count times"
        log "${RED}║${NC}  Promoting roles..."
        log "${RED}╚════════════════════════════════════════════════════════════╝${NC}"

        # Promote: Reviewer -> Builder, Architect -> Reviewer
        RALPH_BUILDER_BACKEND="$REVIEWER_BACKEND"
        RALPH_BUILDER_SESSION_MODE="$REVIEWER_SESSION_MODE"

        if [[ "$ARCHITECT_ENABLED" == "true" ]]; then
            REVIEWER_BACKEND="$ARCHITECT_BACKEND"
            REVIEWER_SESSION_MODE="$ARCHITECT_SESSION_MODE"
            ARCHITECT_ENABLED="false"
        else
            REVIEWER_ENABLED="false"
        fi

        # Mark as escalated
        jq '.escalated = true | .consecutive_failures = 0' "$ESCALATION_FILE" > "$ESCALATION_FILE.tmp" 2>/dev/null
        mv "$ESCALATION_FILE.tmp" "$ESCALATION_FILE"

        log "${YELLOW}  New Builder: $RALPH_BUILDER_BACKEND${NC}"
        if [[ "$REVIEWER_ENABLED" == "true" ]]; then
            log "${YELLOW}  New Reviewer: $REVIEWER_BACKEND${NC}"
        fi
        log ""

        # Re-source CLI config for new builder
        source "$SCRIPT_DIR/cli/${RALPH_BUILDER_BACKEND}.sh"
    fi
}

# Initialize escalation state file
init_escalation() {
    if [[ "$ESCALATION_ENABLED" == "true" ]]; then
        if [[ ! -f "$ESCALATION_FILE" ]]; then
            echo '{"consecutive_failures": 0, "escalated": false}' > "$ESCALATION_FILE"
        fi
        log "${DIM}Escalation enabled - state in $ESCALATION_FILE${NC}"
    fi
}
