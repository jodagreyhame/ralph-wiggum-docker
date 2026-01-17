/**
 * Architect screen - optional architect configuration
 */

import { theme } from '../../theme/theme.js';
import { renderToggle } from '../components/toggle.js';
import { renderProviderCard } from '../components/provider-card.js';
import { renderDropdown, type DropdownItem } from '../components/dropdown.js';
import { BACKENDS } from '../../config/schema.js';
import type { AppState } from '../state.js';

export function renderArchitectScreen(state: AppState): string {
    const enabled = state.config.architect.enabled;
    const backend = BACKENDS.find(b => b.id === state.config.architect.backend);
    const authModes: DropdownItem[] = backend?.authModes.map(am => ({
        id: am,
        label: am,
    })) || [];

    const lines: string[] = [
        '',
        theme.heading('  ARCHITECT CONFIGURATION'),
        '',
        renderToggle('Enable Architect', enabled, state.focusedField === 0),
        '',
    ];

    if (enabled) {
        lines.push(
            theme.muted('  Backend (press 1-5 to select):'),
            renderProviderCard(state.config.architect.backend, state.focusedField === 1),
            '',
            theme.muted('  Auth Mode:'),
            renderDropdown(
                authModes,
                state.config.architect.auth_mode,
                state.dropdownOpen && state.focusedField === 2,
                state.focusedField === 2
            ),
        );
    } else {
        lines.push(theme.muted('  Architect is disabled. Toggle to enable.'));
    }

    lines.push('');
    return lines.join('\n');
}
