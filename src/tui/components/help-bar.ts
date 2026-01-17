/**
 * Help bar showing keyboard shortcuts
 */

import { theme } from '../../theme/theme.js';

export function renderHelpBar(): string {
    const shortcuts = [
        ['<-/->', 'Tab'],
        ['Up/Down', 'Navigate'],
        ['Space', 'Toggle'],
        ['Enter', 'Select'],
        ['s', 'Summary'],
        ['q', 'Quit'],
    ];

    const items = shortcuts.map(([key, action]) => {
        return `${theme.accent(key)} ${theme.muted(action)}`;
    });

    return `\n  ${items.join('  |  ')}\n`;
}
