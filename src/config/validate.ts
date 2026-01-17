/**
 * Config Validation
 */

import type { ProjectConfig, Backend, AuthMode } from './schema.js';
import { BACKENDS, getBackendInfo } from './schema.js';

export interface ValidationError {
    path: string;
    message: string;
}

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
}

function isValidBackend(backend: string): backend is Backend {
    return BACKENDS.some((b) => b.id === backend);
}

function isValidAuthMode(authMode: string, backend: Backend): boolean {
    const info = getBackendInfo(backend);
    return info ? info.authModes.includes(authMode as AuthMode) : false;
}

export function validateConfig(config: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (!config || typeof config !== 'object') {
        return { valid: false, errors: [{ path: '', message: 'Config must be an object' }] };
    }

    const cfg = config as Record<string, unknown>;

    // Required fields
    if (typeof cfg.name !== 'string' || !cfg.name.trim()) {
        errors.push({ path: 'name', message: 'Project name is required' });
    }

    // Builder validation
    if (!cfg.builder || typeof cfg.builder !== 'object') {
        errors.push({ path: 'builder', message: 'Builder configuration is required' });
    } else {
        const builder = cfg.builder as Record<string, unknown>;
        if (!isValidBackend(builder.backend as string)) {
            errors.push({ path: 'builder.backend', message: `Invalid backend: ${builder.backend}` });
        } else if (!isValidAuthMode(builder.auth_mode as string, builder.backend as Backend)) {
            errors.push({
                path: 'builder.auth_mode',
                message: `Invalid auth mode for ${builder.backend}: ${builder.auth_mode}`,
            });
        }
    }

    // Reviewer validation (if enabled)
    if (cfg.reviewer && typeof cfg.reviewer === 'object') {
        const reviewer = cfg.reviewer as Record<string, unknown>;
        if (reviewer.enabled) {
            if (!isValidBackend(reviewer.backend as string)) {
                errors.push({ path: 'reviewer.backend', message: `Invalid backend: ${reviewer.backend}` });
            } else if (!isValidAuthMode(reviewer.auth_mode as string, reviewer.backend as Backend)) {
                errors.push({
                    path: 'reviewer.auth_mode',
                    message: `Invalid auth mode for ${reviewer.backend}: ${reviewer.auth_mode}`,
                });
            }
        }
    }

    // Architect validation (if enabled)
    if (cfg.architect && typeof cfg.architect === 'object') {
        const architect = cfg.architect as Record<string, unknown>;
        if (architect.enabled) {
            if (!isValidBackend(architect.backend as string)) {
                errors.push({ path: 'architect.backend', message: `Invalid backend: ${architect.backend}` });
            } else if (!isValidAuthMode(architect.auth_mode as string, architect.backend as Backend)) {
                errors.push({
                    path: 'architect.auth_mode',
                    message: `Invalid auth mode for ${architect.backend}: ${architect.auth_mode}`,
                });
            }
        }
    }

    // Max iterations validation
    if (cfg.max_iterations !== undefined) {
        const maxIter = cfg.max_iterations as number;
        if (typeof maxIter !== 'number' || maxIter < 0 || !Number.isInteger(maxIter)) {
            errors.push({ path: 'max_iterations', message: 'max_iterations must be a non-negative integer' });
        }
    }

    return { valid: errors.length === 0, errors };
}

export function validateConfigFile(configPath: string): Promise<ValidationResult> {
    return import('fs').then((fs) => {
        return new Promise((resolve) => {
            try {
                const content = fs.readFileSync(configPath, 'utf-8');
                const config = JSON.parse(content);
                resolve(validateConfig(config));
            } catch (err) {
                resolve({
                    valid: false,
                    errors: [{ path: '', message: `Failed to read config: ${(err as Error).message}` }],
                });
            }
        });
    });
}
