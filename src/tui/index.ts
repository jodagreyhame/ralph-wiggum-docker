/**
 * TUI Entry Point (chalk + readline, no React/Ink)
 * Clawdbot-compatible
 */

import type { ProjectConfig } from "../config/schema.js";
import type { ScreenType } from "./state.js";
import { TUIApp, type TUIAppOptions } from "./app.js";

/**
 * Launch the interactive TUI
 */
export async function launchTUI(initialConfig?: ProjectConfig): Promise<void> {
  const app = new TUIApp({ initialConfig });
  await app.run();
}

/**
 * Launch TUI with specific options
 */
export async function launchTUIWithOptions(options: TUIAppOptions): Promise<void> {
  const app = new TUIApp(options);
  await app.run();
}
