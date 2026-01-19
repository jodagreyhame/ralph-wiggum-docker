#!/bin/bash
# lib/preflight.sh - Pre-flight configuration validation
# Validates CLI, credentials, and required files BEFORE starting the loop

# Source shared environment utilities
source /app/lib/env.sh

# Validate all configuration before starting
# Returns: 0 if valid, exits with 1 if invalid
validate_preflight() {
    local errors=0
    local warnings=0

    log "${DIM}Running pre-flight checks...${NC}"

    # 1. Check prompt file exists
    if [[ ! -f "$PROMPT_FILE" ]]; then
        log "${RED}  ✗ Builder prompt not found: $PROMPT_FILE${NC}"
        errors=$((errors + 1))
    else
        log "${GREEN}  ✓ Builder prompt: $PROMPT_FILE${NC}"
    fi

    # 2. Check reviewer prompt if enabled
    if [[ "$REVIEWER_ENABLED" == "true" ]]; then
        if [[ ! -f "$RALPH_REVIEWER_PROMPT_FILE" ]]; then
            log "${RED}  ✗ Reviewer prompt not found: $RALPH_REVIEWER_PROMPT_FILE${NC}"
            errors=$((errors + 1))
        else
            log "${GREEN}  ✓ Reviewer prompt: $RALPH_REVIEWER_PROMPT_FILE${NC}"
        fi
    fi

    # 3. Check architect prompt if enabled
    if [[ "$ARCHITECT_ENABLED" == "true" ]]; then
        if [[ ! -f "$RALPH_ARCHITECT_PROMPT_FILE" ]]; then
            log "${RED}  ✗ Architect prompt not found: $RALPH_ARCHITECT_PROMPT_FILE${NC}"
            errors=$((errors + 1))
        else
            log "${GREEN}  ✓ Architect prompt: $RALPH_ARCHITECT_PROMPT_FILE${NC}"
        fi
    fi

    # 4. Check CLI backend script exists
    local cli_config="$SCRIPT_DIR/cli/${CLI_TYPE}.sh"
    if [[ ! -f "$cli_config" ]]; then
        log "${RED}  ✗ CLI backend not found: $CLI_TYPE${NC}"
        local available_backends=$(ls -1 "$SCRIPT_DIR/cli/"*.sh 2>/dev/null | xargs -I{} basename {} .sh | tr '\n' ' ' || echo "(none)")
        log "${RED}    Available: $available_backends${NC}"
        errors=$((errors + 1))
    else
        log "${GREEN}  ✓ CLI backend: $CLI_TYPE${NC}"
    fi

    # 5. Check reviewer backend if enabled
    if [[ "$REVIEWER_ENABLED" == "true" ]]; then
        local reviewer_config="$SCRIPT_DIR/cli/${REVIEWER_BACKEND}.sh"
        if [[ ! -f "$reviewer_config" ]]; then
            log "${RED}  ✗ Reviewer backend not found: $REVIEWER_BACKEND${NC}"
            errors=$((errors + 1))
        else
            log "${GREEN}  ✓ Reviewer backend: $REVIEWER_BACKEND${NC}"
        fi
    fi

    # 6. Check architect backend if enabled
    if [[ "$ARCHITECT_ENABLED" == "true" ]]; then
        local architect_config="$SCRIPT_DIR/cli/${ARCHITECT_BACKEND}.sh"
        if [[ ! -f "$architect_config" ]]; then
            log "${RED}  ✗ Architect backend not found: $ARCHITECT_BACKEND${NC}"
            errors=$((errors + 1))
        else
            log "${GREEN}  ✓ Architect backend: $ARCHITECT_BACKEND${NC}"
        fi
    fi

    # 7. Check auth mode credentials (warnings, not errors)
    case "${RALPH_BUILDER_AUTH_MODE:-glm}" in
        anthropic-oauth)
            if [[ ! -d "/root/.claude" ]] && [[ ! -d "$HOME/.claude" ]]; then
                log "${YELLOW}  ⚠ Claude OAuth credentials may not be mounted${NC}"
                warnings=$((warnings + 1))
            fi
            ;;
        gemini-oauth)
            if [[ ! -d "/root/.gemini" ]] && [[ ! -d "$HOME/.gemini" ]]; then
                log "${YELLOW}  ⚠ Gemini OAuth credentials may not be mounted${NC}"
                warnings=$((warnings + 1))
            fi
            ;;
        openai-oauth)
            if [[ ! -d "/root/.codex" ]] && [[ ! -d "$HOME/.codex" ]]; then
                log "${YELLOW}  ⚠ OpenAI/Codex OAuth credentials may not be mounted${NC}"
                warnings=$((warnings + 1))
            fi
            ;;
        opencode-oauth)
            if [[ ! -d "/root/.opencode" ]] && [[ ! -d "$HOME/.opencode" ]]; then
                log "${YELLOW}  ⚠ OpenCode OAuth credentials may not be mounted${NC}"
                warnings=$((warnings + 1))
            fi
            ;;
        glm)
            if [[ -z "${GLM_AUTH_TOKEN:-}" ]] && [[ -z "${ANTHROPIC_AUTH_TOKEN:-}" ]]; then
                log "${YELLOW}  ⚠ GLM auth token not set${NC}"
                warnings=$((warnings + 1))
            fi
            ;;
        anthropic-api)
            if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
                log "${YELLOW}  ⚠ ANTHROPIC_API_KEY not set${NC}"
                warnings=$((warnings + 1))
            fi
            ;;
        gemini-api)
            if [[ -z "${GEMINI_API_KEY:-}" ]]; then
                log "${YELLOW}  ⚠ GEMINI_API_KEY not set${NC}"
                warnings=$((warnings + 1))
            fi
            ;;
        openai-api)
            if [[ -z "${OPENAI_API_KEY:-}" ]]; then
                log "${YELLOW}  ⚠ OPENAI_API_KEY not set${NC}"
                warnings=$((warnings + 1))
            fi
            ;;
    esac

    # 8. Check project state directory
    if [[ ! -d "$PROJECT_STATE_DIR" ]]; then
        mkdir -p "$PROJECT_STATE_DIR/state"
        log "${DIM}  Created state directory: $PROJECT_STATE_DIR${NC}"
    fi

    # 9. Check log directory
    if [[ ! -d "$LOG_DIR" ]]; then
        mkdir -p "$LOG_DIR"
        log "${DIM}  Created log directory: $LOG_DIR${NC}"
    fi

    # Summary
    if [[ $errors -gt 0 ]]; then
        log "${RED}Pre-flight failed: $errors error(s), $warnings warning(s)${NC}"
        exit 1
    elif [[ $warnings -gt 0 ]]; then
        log "${YELLOW}Pre-flight passed with $warnings warning(s)${NC}"
    else
        log "${GREEN}Pre-flight passed${NC}"
    fi
}
