/**
 * Provider selection card
 */

import { theme } from '../../theme/theme.js';
import { BACKENDS, type Backend } from '../../config/schema.js';

export function renderProviderCard(
    selected: Backend,
    isFocused: boolean
): string {
    const lines: string[] = [];

    for (let i = 0; i < BACKENDS.length; i++) {
        const backend = BACKENDS[i];
        const isSelected = backend.id === selected;
        const num = `[${i + 1}]`;

        let line: string;
        if (isSelected) {
            line = theme.accent(`  ${num} ${backend.name} `) + theme.success('*');
        } else if (isFocused) {
            line = theme.muted(`  ${num} `) + backend.name;
        } else {
            line = theme.muted(`  ${num} ${backend.name}`);
        }
        lines.push(line);
    }

    return lines.join('\n');
}
