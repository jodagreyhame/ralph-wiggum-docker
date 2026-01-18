/**
 * Tab Bar Widget (blessed)
 * Horizontal tab navigation for project detail view
 */

import blessed from "blessed";
import type { DetailTabName } from "../../state.js";
import { BLESSED_COLORS } from "../theme.js";

export interface TabBarOptions {
  parent: blessed.Widgets.Screen | blessed.Widgets.BoxElement;
  top?: number | string;
  left?: number | string;
  width?: number | string;
}

/**
 * Tab configuration
 */
const TABS: { name: DetailTabName; label: string }[] = [
  { name: "overview", label: "Overview" },
  { name: "tasks", label: "Tasks" },
  { name: "logs", label: "Logs" },
  { name: "history", label: "History" },
  { name: "config", label: "Config" },
];

/**
 * Format tab bar content with active highlighting
 * Format: [1] Overview   [2] Tasks   [3] Logs   [4] History   [5] Config
 */
function formatTabBarContent(activeTab: DetailTabName): string {
  return TABS.map((tab, i) => {
    const num = i + 1;
    if (tab.name === activeTab) {
      return `{${BLESSED_COLORS.coral}-fg}{bold}[${num}] ${tab.label}{/bold}{/}`;
    }
    return `{${BLESSED_COLORS.muted}-fg}[${num}] ${tab.label}{/}`;
  }).join("    "); // 4 spaces between tabs
}

/**
 * Create the tab bar widget
 */
export function createTabBar(
  options: TabBarOptions,
  activeTab: DetailTabName,
): blessed.Widgets.BoxElement {
  const tabBar = blessed.box({
    parent: options.parent,
    top: options.top ?? 0,
    left: options.left ?? 0,
    width: options.width ?? "100%",
    height: 1,
    content: formatTabBarContent(activeTab),
    tags: true,
    style: {
      fg: BLESSED_COLORS.cream,
    },
  });

  return tabBar;
}

/**
 * Update the tab bar with new active tab
 */
export function updateTabBar(tabBar: blessed.Widgets.BoxElement, activeTab: DetailTabName): void {
  tabBar.setContent(formatTabBarContent(activeTab));
}

/**
 * Get tab name by index (1-5)
 */
export function getTabByIndex(index: number): DetailTabName | null {
  if (index < 1 || index > TABS.length) {
    return null;
  }
  return TABS[index - 1].name;
}

/**
 * Get next tab (wraps around)
 */
export function getNextTab(currentTab: DetailTabName): DetailTabName {
  const currentIndex = TABS.findIndex((t) => t.name === currentTab);
  const nextIndex = (currentIndex + 1) % TABS.length;
  return TABS[nextIndex].name;
}

/**
 * Get previous tab (wraps around)
 */
export function getPrevTab(currentTab: DetailTabName): DetailTabName {
  const currentIndex = TABS.findIndex((t) => t.name === currentTab);
  const prevIndex = currentIndex === 0 ? TABS.length - 1 : currentIndex - 1;
  return TABS[prevIndex].name;
}
