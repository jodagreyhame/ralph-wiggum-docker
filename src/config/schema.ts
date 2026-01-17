/**
 * Config Schema Type Definitions
 * Matches reference/config-schema.json structure
 */

export type Backend = 'claude' | 'gemini' | 'codex' | 'opencode' | 'zai';

export type AuthMode =
    | 'glm'
    | 'anthropic-oauth'
    | 'anthropic-api'
    | 'gemini-oauth'
    | 'gemini-api'
    | 'openai-oauth'
    | 'openai-api'
    | 'opencode-oauth'
    | 'opencode-api';

export type SessionMode = 'fresh' | 'resume';

export interface PromptsConfig {
    dir: string;
    goal: string;
    builder: string;
    reviewer: string;
    architect: string;
}

export interface RoleConfig {
    backend: Backend;
    auth_mode: AuthMode;
    model?: string | null;
    session_mode: SessionMode;
    api_key?: string;
    api_base_url?: string;
}

export interface BuilderConfig extends RoleConfig { }

export interface ReviewerConfig extends RoleConfig {
    enabled: boolean;
}

export interface ArchitectConfig extends RoleConfig {
    enabled: boolean;
}

export interface EscalationConfig {
    enabled: boolean;
    max_builder_failures: number;
}

export interface ProviderFallbackEntry {
    name: string;
    backend: Backend;
    auth_mode: AuthMode;
    model?: string;
}

export interface ProviderFallbackConfig {
    enabled: boolean;
    failure_threshold: number;
    sequence: ProviderFallbackEntry[];
}

export interface TaskModeConfig {
    enabled: boolean;
    specs_dir: string;
    steering_file: string;
}

export interface ProjectConfig {
    name: string;
    description: string;
    version: string;
    prompts: PromptsConfig;
    builder: BuilderConfig;
    reviewer: ReviewerConfig;
    architect: ArchitectConfig;
    escalation: EscalationConfig;
    provider_fallback?: ProviderFallbackConfig;
    max_iterations: number;
    completion_enabled: boolean;
    knowledge_dir: string;
    task_mode?: TaskModeConfig;
}

// Backend metadata for display
export interface BackendInfo {
    id: Backend;
    name: string;
    provider: string;
    authModes: AuthMode[];
}

export const BACKENDS: BackendInfo[] = [
    {
        id: 'claude',
        name: 'Claude',
        provider: 'Anthropic',
        authModes: ['anthropic-oauth', 'anthropic-api', 'glm'],
    },
    {
        id: 'gemini',
        name: 'Gemini',
        provider: 'Google',
        authModes: ['gemini-oauth', 'gemini-api'],
    },
    {
        id: 'codex',
        name: 'Codex',
        provider: 'OpenAI',
        authModes: ['openai-oauth', 'openai-api'],
    },
    {
        id: 'opencode',
        name: 'OpenCode',
        provider: 'OpenCode',
        authModes: ['opencode-oauth', 'opencode-api'],
    },
    {
        id: 'zai',
        name: 'Z.AI/GLM',
        provider: 'Proxy',
        authModes: ['glm'],
    },
];

export interface AuthModeInfo {
    id: AuthMode;
    name: string;
    description: string;
}

export const AUTH_MODES: Record<AuthMode, AuthModeInfo> = {
    glm: {
        id: 'glm',
        name: 'GLM Proxy',
        description: 'Use z.ai API proxy',
    },
    'anthropic-oauth': {
        id: 'anthropic-oauth',
        name: 'Anthropic OAuth',
        description: 'Use host ~/.claude credentials',
    },
    'anthropic-api': {
        id: 'anthropic-api',
        name: 'Anthropic API Key',
        description: 'Direct API key authentication',
    },
    'gemini-oauth': {
        id: 'gemini-oauth',
        name: 'Gemini OAuth',
        description: 'Use host ~/.gemini credentials',
    },
    'gemini-api': {
        id: 'gemini-api',
        name: 'Gemini API Key',
        description: 'Direct API key authentication',
    },
    'openai-oauth': {
        id: 'openai-oauth',
        name: 'OpenAI OAuth',
        description: 'Use host ~/.codex credentials',
    },
    'openai-api': {
        id: 'openai-api',
        name: 'OpenAI API Key',
        description: 'Direct API key authentication',
    },
    'opencode-oauth': {
        id: 'opencode-oauth',
        name: 'OpenCode OAuth',
        description: 'Use host credentials',
    },
    'opencode-api': {
        id: 'opencode-api',
        name: 'OpenCode API Key',
        description: 'Direct API key authentication',
    },
};

export function getBackendInfo(id: Backend): BackendInfo | undefined {
    return BACKENDS.find((b) => b.id === id);
}

export function getAuthModesForBackend(backend: Backend): AuthModeInfo[] {
    const info = getBackendInfo(backend);
    if (!info) return [];
    return info.authModes.map((am) => AUTH_MODES[am]);
}
