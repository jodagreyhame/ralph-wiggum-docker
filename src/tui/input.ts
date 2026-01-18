/**
 * Input handling for TUI using readline
 * Clawdbot-compatible (no React/Ink)
 */

import * as readline from "readline";

export interface KeyEvent {
  name: string;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  sequence: string;
}

export type KeyHandler = (key: KeyEvent) => void;

let keyHandler: KeyHandler | null = null;
let isRawMode = false;

/**
 * Enable raw mode and start listening for keypress events
 */
export function startInput(handler: KeyHandler): void {
  keyHandler = handler;

  if (process.stdin.isTTY && !isRawMode) {
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    isRawMode = true;
  }

  process.stdin.on("keypress", onKeypress);
  process.stdin.resume();
}

/**
 * Stop listening for keypress events and restore terminal
 */
export function stopInput(): void {
  keyHandler = null;
  process.stdin.removeListener("keypress", onKeypress);

  if (isRawMode) {
    process.stdin.setRawMode(false);
    isRawMode = false;
  }

  process.stdin.pause();
}

function onKeypress(_char: string | undefined, key: readline.Key | undefined): void {
  if (!key || !keyHandler) return;

  const event: KeyEvent = {
    name: key.name || "",
    ctrl: key.ctrl || false,
    meta: key.meta || false,
    shift: key.shift || false,
    sequence: key.sequence || "",
  };

  // Handle Ctrl+C
  if (event.ctrl && event.name === "c") {
    stopInput();
    process.exit(0);
  }

  keyHandler(event);
}

/**
 * Prompt for text input (blocking)
 */
export async function promptText(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    // Temporarily disable raw mode for readline question
    if (isRawMode) {
      process.stdin.setRawMode(false);
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(prompt, (answer) => {
      rl.close();

      // Restore raw mode
      if (isRawMode) {
        process.stdin.setRawMode(true);
      }

      resolve(answer);
    });
  });
}

/**
 * Clear terminal screen
 */
export function clearScreen(): void {
  process.stdout.write("\x1B[2J\x1B[0f");
}

/**
 * Move cursor to position
 */
export function moveCursor(row: number, col: number): void {
  process.stdout.write(`\x1B[${row};${col}H`);
}

/**
 * Hide cursor
 */
export function hideCursor(): void {
  process.stdout.write("\x1B[?25l");
}

/**
 * Show cursor
 */
export function showCursor(): void {
  process.stdout.write("\x1B[?25h");
}
