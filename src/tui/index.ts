/**
 * TUI Entry Point
 * Provides both chalk-based (legacy) and blessed-based (new) TUI options
 */

import type { ProjectConfig } from "../config/schema.js";
import type { ScreenType } from "./state.js";
import { TUIApp, type TUIAppOptions } from "./app.js";
import { BlessedTUIApp, type BlessedTUIAppOptions, launchBlessedTUI } from "./blessed-app.js";

/**
 * Launch the interactive TUI (blessed-based, recommended)
 */
export async function launchTUI(initialConfig?: ProjectConfig): Promise<void> {
  const app = new BlessedTUIApp({ initialConfig });
  await app.run();
}

/**
 * Launch TUI with specific options (blessed-based, recommended)
 */
export async function launchTUIWithOptions(options: BlessedTUIAppOptions): Promise<void> {
  const app = new BlessedTUIApp(options);
  await app.run();
}

/**
 * Launch the legacy chalk-based TUI (for compatibility)
 */
export async function launchLegacyTUI(initialConfig?: ProjectConfig): Promise<void> {
  const app = new TUIApp({ initialConfig });
  await app.run();
}

/**
 * Launch legacy TUI with specific options
 */
export async function launchLegacyTUIWithOptions(options: TUIAppOptions): Promise<void> {
  const app = new TUIApp(options);
  await app.run();
}

// Re-export types and classes
export { BlessedTUIApp, launchBlessedTUI };
export type { BlessedTUIAppOptions };
export { TUIApp };
export type { TUIAppOptions };
