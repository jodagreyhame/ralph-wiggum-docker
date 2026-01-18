/**
 * Config Editor Tab Bar Widget (blessed)
 * Horizontal tab navigation for config editor
 */

import blessed from "blessed";
import type { TabName } from "../../state.js";
import { BLESSED_COLORS } from "../theme.js";

export interface ConfigEditorTabBarOptions {
  parent: blessed.Widgets.Screen | blessed.Widgets.BoxElement;
  top?: number | string;
  left?: number | string;
  width?: number | string;
}

/**
 * Tab configuration for config editor
 */
const CONFIG_TABS: { name: TabName; label: string }[] = [
  { name: "project", label: "Project" },
  { name: "builder", label: "Builder" },
  { name: "reviewer", label: "Reviewer" },
  { name: "architect", label: "Architect" },
  { name: "loop", label: "Loop" },
  { name: "summary", label: "Summary" },
];

/**
 * Format tab bar content with active highlighting
 * Format: [1] Project   [2] Builder   [3] Reviewer   [4] Architect   [5] Loop   [6] Summary
 */
function formatConfigTabBarContent(activeTab: TabName): string {
  return CONFIG_TABS.map((tab, i) => {
    const num = i + 1;
    if (tab.name === activeTab) {
      return `{${BLESSED_COLORS.coral}-fg}{bold}[${num}] ${tab.label}{/bold}{/}`;
    }
    return `{${BLESSED_COLORS.muted}-fg}[${num}] ${tab.label}{/}`;
  }).join("   "); // 3 spaces between tabs
}

/**
 * Create the config editor tab bar widget
 */
export function createConfigEditorTabBar(
  options: ConfigEditorTabBarOptions,
  activeTab: TabName,
): blessed.Widgets.BoxElement {
  const tabBar = blessed.box({
    parent: options.parent,
    top: options.top ?? 0,
    left: options.left ?? 0,
    width: options.width ?? "100%",
    height: 1,
    content: formatConfigTabBarContent(activeTab),
    tags: true,
    style: {
      fg: BLESSED_COLORS.cream,
    },
  });

  return tabBar;
}

/**
 * Update the config editor tab bar with new active tab
 */
export function updateConfigEditorTabBar(
  tabBar: blessed.Widgets.BoxElement,
  activeTab: TabName,
): void {
  tabBar.setContent(formatConfigTabBarContent(activeTab));
}

/**
 * Get tab name by index (1-6)
 */
export function getConfigTabByIndex(index: number): TabName | null {
  if (index < 1 || index > CONFIG_TABS.length) {
    return null;
  }
  return CONFIG_TABS[index - 1].name;
}

/**
 * Get next tab (wraps around)
 */
export function getNextConfigTab(currentTab: TabName): TabName {
  const currentIndex = CONFIG_TABS.findIndex((t) => t.name === currentTab);
  const nextIndex = (currentIndex + 1) % CONFIG_TABS.length;
  return CONFIG_TABS[nextIndex].name;
}

/**
 * Get previous tab (wraps around)
 */
export function getPrevConfigTab(currentTab: TabName): TabName {
  const currentIndex = CONFIG_TABS.findIndex((t) => t.name === currentTab);
  const prevIndex = currentIndex === 0 ? CONFIG_TABS.length - 1 : currentIndex - 1;
  return CONFIG_TABS[prevIndex].name;
}
