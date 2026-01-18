#!/bin/bash
# lib/env.sh - Shared environment utility functions

# Clear GLM environment pollution
# GLM backend sets several env vars that can interfere with other providers
clear_glm_env() {
    unset ANTHROPIC_AUTH_TOKEN
    unset ANTHROPIC_BASE_URL
    unset ANTHROPIC_DEFAULT_SONNET_MODEL
    unset ANTHROPIC_DEFAULT_OPUS_MODEL
    unset ANTHROPIC_DEFAULT_HAIKU_MODEL
}

# Apply model override for any backend
# Args: $1 = backend (claude, gemini, codex, opencode)
#       $2 = model (model name or empty)
apply_model() {
    local backend="$1"
    local model="$2"

    [[ -z "$model" ]] && return

    case "$backend" in
        claude)
            export ANTHROPIC_MODEL="$model"
            ;;
        gemini)
            export GEMINI_MODEL="$model"
            ;;
        codex)
            export OPENAI_MODEL="$model"
            ;;
        opencode)
            export OPENCODE_MODEL="$model"
            ;;
    esac
}
