/**
 * Loop screen - iteration and completion settings
 */

import { theme } from '../../theme/theme.js';
import { renderToggle } from '../components/toggle.js';
import { renderInputField } from '../components/input-field.js';
import type { AppState } from '../state.js';

export function renderLoopScreen(state: AppState): string {
    const maxIter = state.config.max_iterations === 0
        ? 'infinite'
        : String(state.config.max_iterations);

    const lines: string[] = [
        '',
        theme.heading('  LOOP SETTINGS'),
        '',
        renderInputField('Max Iterations', maxIter, state.focusedField === 0, '0 = infinite'),
        '',
        renderToggle('Completion Detection', state.config.completion_enabled, state.focusedField === 1),
        '',
        renderToggle('Escalation', state.config.escalation.enabled, state.focusedField === 2),
        '',
    ];

    if (state.config.escalation.enabled) {
        lines.push(
            theme.muted(`  Max failures before escalation: ${state.config.escalation.max_builder_failures}`),
        );
    }

    lines.push('');
    return lines.join('\n');
}
