/**
 * Reviewer screen - optional reviewer configuration
 */

import { theme } from '../../theme/theme.js';
import { renderToggle } from '../components/toggle.js';
import { renderProviderCard } from '../components/provider-card.js';
import { renderDropdown, type DropdownItem } from '../components/dropdown.js';
import { BACKENDS } from '../../config/schema.js';
import type { AppState } from '../state.js';

export function renderReviewerScreen(state: AppState): string {
    const enabled = state.config.reviewer.enabled;
    const backend = BACKENDS.find(b => b.id === state.config.reviewer.backend);
    const authModes: DropdownItem[] = backend?.authModes.map(am => ({
        id: am,
        label: am,
    })) || [];

    const lines: string[] = [
        '',
        theme.heading('  REVIEWER CONFIGURATION'),
        '',
        renderToggle('Enable Reviewer', enabled, state.focusedField === 0),
        '',
    ];

    if (enabled) {
        lines.push(
            theme.muted('  Backend (press 1-5 to select):'),
            renderProviderCard(state.config.reviewer.backend, state.focusedField === 1),
            '',
            theme.muted('  Auth Mode:'),
            renderDropdown(
                authModes,
                state.config.reviewer.auth_mode,
                state.dropdownOpen && state.focusedField === 2,
                state.focusedField === 2
            ),
        );
    } else {
        lines.push(theme.muted('  Reviewer is disabled. Toggle to enable.'));
    }

    lines.push('');
    return lines.join('\n');
}
