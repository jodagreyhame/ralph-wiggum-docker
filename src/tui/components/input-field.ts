/**
 * Text input field component
 */

import { theme } from '../../theme/theme.js';

export function renderInputField(
    label: string,
    value: string,
    isFocused: boolean,
    placeholder?: string
): string {
    const prefix = isFocused ? theme.accent('> ') : '  ';
    const displayValue = value || (placeholder ? theme.muted(placeholder) : '');
    const cursor = isFocused ? theme.accent('_') : '';

    return `${prefix}${theme.muted(label + ':')} ${displayValue}${cursor}`;
}
