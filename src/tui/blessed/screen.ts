/**
 * Blessed Screen Setup and Lifecycle
 * Central screen management for the TUI dashboard
 */

import blessed from "blessed";
import { BLESSED_COLORS } from "./theme.js";

export interface ScreenOptions {
  title?: string;
  smartCSR?: boolean;
}

/**
 * Create and configure the blessed screen
 */
export function createScreen(options: ScreenOptions = {}): blessed.Widgets.Screen {
  const screen = blessed.screen({
    smartCSR: options.smartCSR ?? true,
    title: options.title ?? "Ralph Dashboard",
    fullUnicode: true,
    cursor: {
      artificial: true,
      shape: "line",
      blink: true,
      color: BLESSED_COLORS.shell,
    },
    dockBorders: true,
    autoPadding: true,
  });

  // Global quit on Ctrl+C
  screen.key(["C-c"], () => {
    destroyScreen(screen);
    process.exit(0);
  });

  return screen;
}

/**
 * Destroy the screen and cleanup
 */
export function destroyScreen(screen: blessed.Widgets.Screen): void {
  screen.destroy();
}

/**
 * Render the screen (call after widget updates)
 */
export function renderScreen(screen: blessed.Widgets.Screen): void {
  screen.render();
}

/**
 * Clear all children from screen
 */
export function clearScreen(screen: blessed.Widgets.Screen): void {
  screen.children.slice().forEach((child) => child.detach());
}

/**
 * Create header bar
 */
export function createHeader(
  screen: blessed.Widgets.Screen,
  title: string,
): blessed.Widgets.BoxElement {
  return blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: "100%",
    height: 3,
    content: `{center}═══ ${title.toUpperCase()} ═══{/center}`,
    tags: true,
    style: {
      fg: BLESSED_COLORS.coral,
      bold: true,
    },
  });
}

/**
 * Create footer bar with key hints
 */
export function createFooter(
  screen: blessed.Widgets.Screen,
  content: string,
): blessed.Widgets.BoxElement {
  return blessed.box({
    parent: screen,
    bottom: 0,
    left: 0,
    width: "100%",
    height: 1,
    content,
    tags: true,
    style: {
      fg: BLESSED_COLORS.muted,
    },
  });
}

/**
 * Create main content area (between header and footer)
 */
export function createContentArea(screen: blessed.Widgets.Screen): blessed.Widgets.BoxElement {
  return blessed.box({
    parent: screen,
    top: 3,
    left: 0,
    width: "100%",
    height: "100%-4", // Reserve 3 top (header), 1 bottom (footer)
  });
}
