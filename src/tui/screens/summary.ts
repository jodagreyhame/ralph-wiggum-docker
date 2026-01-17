/**
 * Summary screen - review and create
 */

import { theme } from '../../theme/theme.js';
import type { AppState } from '../state.js';

export function renderSummaryScreen(state: AppState): string {
    const cfg = state.config;
    const action = state.isEditing ? 'Update' : 'Create';

    const lines: string[] = [
        '',
        theme.heading('  CONFIGURATION SUMMARY'),
        '',
        `  ${theme.muted('Name:')} ${cfg.name}`,
        `  ${theme.muted('Description:')} ${cfg.description}`,
        '',
        theme.muted('  Builder:'),
        `    Backend: ${theme.accent(cfg.builder.backend)}`,
        `    Auth: ${cfg.builder.auth_mode}`,
        '',
    ];

    if (cfg.reviewer.enabled) {
        lines.push(
            theme.muted('  Reviewer:'),
            `    Backend: ${theme.accent(cfg.reviewer.backend)}`,
            `    Auth: ${cfg.reviewer.auth_mode}`,
            '',
        );
    }

    if (cfg.architect.enabled) {
        lines.push(
            theme.muted('  Architect:'),
            `    Backend: ${theme.accent(cfg.architect.backend)}`,
            `    Auth: ${cfg.architect.auth_mode}`,
            '',
        );
    }

    const maxIter = cfg.max_iterations === 0 ? 'infinite' : String(cfg.max_iterations);
    lines.push(
        theme.muted('  Loop:'),
        `    Max iterations: ${maxIter}`,
        `    Completion: ${cfg.completion_enabled ? theme.success('enabled') : theme.muted('disabled')}`,
        `    Escalation: ${cfg.escalation.enabled ? theme.success('enabled') : theme.muted('disabled')}`,
        '',
    );

    // Action buttons
    const createBtn = state.summaryButton === 0
        ? theme.accent(`[ ${action} Project ]`)
        : theme.muted(`[ ${action} Project ]`);
    const cancelBtn = state.summaryButton === 1
        ? theme.accent('[ Cancel ]')
        : theme.muted('[ Cancel ]');

    lines.push(
        '',
        `  ${createBtn}    ${cancelBtn}`,
        '',
    );

    return lines.join('\n');
}
