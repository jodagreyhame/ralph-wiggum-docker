/**
 * Project screen - name and description
 */

import { theme } from '../../theme/theme.js';
import { renderInputField } from '../components/input-field.js';
import type { AppState } from '../state.js';

export function renderProjectScreen(state: AppState): string {
    const lines: string[] = [
        '',
        theme.heading('  PROJECT DETAILS'),
        '',
        renderInputField('Name', state.config.name, state.focusedField === 0, 'my-project'),
        '',
        renderInputField('Description', state.config.description, state.focusedField === 1, 'Project description'),
        '',
    ];

    return lines.join('\n');
}
