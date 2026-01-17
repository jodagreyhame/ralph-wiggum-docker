/**
 * Default Configuration Values
 */

import type { ProjectConfig, PromptsConfig, BuilderConfig, ReviewerConfig, ArchitectConfig, EscalationConfig } from './schema.js';

export const DEFAULT_PROMPTS: PromptsConfig = {
    dir: '.project/prompts',
    goal: 'GOAL.md',
    builder: 'BUILDER.md',
    reviewer: 'REVIEWER.md',
    architect: 'ARCHITECT.md',
};

export const DEFAULT_BUILDER: BuilderConfig = {
    backend: 'claude',
    auth_mode: 'anthropic-oauth',
    model: null,
    session_mode: 'fresh',
};

export const DEFAULT_REVIEWER: ReviewerConfig = {
    enabled: false,
    backend: 'claude',
    auth_mode: 'anthropic-oauth',
    model: null,
    session_mode: 'fresh',
};

export const DEFAULT_ARCHITECT: ArchitectConfig = {
    enabled: false,
    backend: 'gemini',
    auth_mode: 'gemini-oauth',
    model: null,
    session_mode: 'resume',
};

export const DEFAULT_ESCALATION: EscalationConfig = {
    enabled: false,
    max_builder_failures: 3,
};

export function createDefaultConfig(name: string): ProjectConfig {
    return {
        name,
        description: '',
        version: '0.1.0',
        prompts: { ...DEFAULT_PROMPTS },
        builder: { ...DEFAULT_BUILDER },
        reviewer: { ...DEFAULT_REVIEWER },
        architect: { ...DEFAULT_ARCHITECT },
        escalation: { ...DEFAULT_ESCALATION },
        max_iterations: 0,
        completion_enabled: true,
        knowledge_dir: '.project',
    };
}
