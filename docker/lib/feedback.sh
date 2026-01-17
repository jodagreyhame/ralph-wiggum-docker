#!/bin/bash
# lib/feedback.sh - Feedback injection for failed reviews

# Inject feedback from previous FAIL/REJECT decisions into prompt
# Returns the augmented prompt via stdout
inject_feedback() {
    local base_prompt="$1"
    local augmented="$base_prompt"
    local injected=false

    # Architect feedback (highest priority)
    if [[ -f "$ARCHITECT_DIR/feedback.md" ]]; then
        log "${CYAN}  Injecting architect feedback from previous iteration${NC}"
        augmented="## ARCHITECT FEEDBACK (High Priority)

$(cat "$ARCHITECT_DIR/feedback.md")

---

$augmented"
        rm -f "$ARCHITECT_DIR/feedback.md"
        injected=true
    fi

    # Reviewer feedback
    if [[ -f "$REVIEW_DIR/feedback.md" ]]; then
        log "${CYAN}  Injecting reviewer feedback from previous iteration${NC}"
        augmented="## REVIEWER FEEDBACK (Address First)

$(cat "$REVIEW_DIR/feedback.md")

---

$augmented"
        rm -f "$REVIEW_DIR/feedback.md"
        injected=true
    fi

    echo "$augmented"
}
