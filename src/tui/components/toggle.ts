/**
 * Toggle switch component
 */

import { theme } from '../../theme/theme.js';

export function renderToggle(
    label: string,
    enabled: boolean,
    isFocused: boolean
): string {
    const prefix = isFocused ? theme.accent('> ') : '  ';
    const toggle = enabled
        ? theme.success('[ON]')
        : theme.muted('[OFF]');

    return `${prefix}${label}: ${toggle}`;
}
