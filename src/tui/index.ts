/**
 * TUI Entry Point (chalk + readline, no React/Ink)
 * Clawdbot-compatible
 */

import type { ProjectConfig } from '../config/schema.js';
import { TUIApp } from './app.js';

/**
 * Launch the interactive TUI
 */
export async function launchTUI(initialConfig?: ProjectConfig): Promise<void> {
    const app = new TUIApp(initialConfig);
    await app.run();
}
