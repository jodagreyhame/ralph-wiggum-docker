/**
 * Tab bar component
 */

import { theme } from '../../theme/theme.js';
import type { TabName } from '../state.js';

export function renderTabs(tabs: readonly TabName[], activeTab: TabName): string {
    const tabItems = tabs.map((tab, index) => {
        const label = tab.charAt(0).toUpperCase() + tab.slice(1);
        const num = `${index + 1}`;

        if (tab === activeTab) {
            return theme.accent(`[${num}] ${label}`);
        }
        return theme.muted(`[${num}] ${label}`);
    });

    return `\n  ${tabItems.join('  |  ')}\n`;
}
