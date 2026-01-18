/**
 * Theme utilities using chalk with RALPH_PALETTE
 */

import chalk from "chalk";
import { RALPH_PALETTE } from "./palette-extended.js";

// Re-export palettes for convenience
export { LOBSTER_PALETTE } from "./palette.js";
export { RALPH_PALETTE } from "./palette-extended.js";

// Create chalk instances for common styles
export const theme = {
  // Primary styles
  primary: chalk.hex(RALPH_PALETTE.shell),
  accent: chalk.hex(RALPH_PALETTE.coral),
  accentBright: chalk.hex(RALPH_PALETTE.accentBright),
  accentDim: chalk.hex(RALPH_PALETTE.accentDim),
  text: chalk.hex(RALPH_PALETTE.cream),
  muted: chalk.hex(RALPH_PALETTE.muted),
  dimmed: chalk.hex(RALPH_PALETTE.dimmed),

  // Status styles
  success: chalk.hex(RALPH_PALETTE.success),
  warning: chalk.hex(RALPH_PALETTE.warn),
  error: chalk.hex(RALPH_PALETTE.error),
  info: chalk.hex(RALPH_PALETTE.info),

  // Bold variants
  boldPrimary: chalk.hex(RALPH_PALETTE.shell).bold,
  boldSuccess: chalk.hex(RALPH_PALETTE.success).bold,
  boldWarning: chalk.hex(RALPH_PALETTE.warn).bold,
  boldError: chalk.hex(RALPH_PALETTE.error).bold,

  // Background styles
  bgPrimary: chalk.bgHex(RALPH_PALETTE.shell).hex(RALPH_PALETTE.cream),
  bgSuccess: chalk.bgHex(RALPH_PALETTE.success).hex(RALPH_PALETTE.midnight),
  bgWarning: chalk.bgHex(RALPH_PALETTE.warn).hex(RALPH_PALETTE.midnight),
  bgError: chalk.bgHex(RALPH_PALETTE.error).hex(RALPH_PALETTE.cream),
  bgInfo: chalk.bgHex(RALPH_PALETTE.info).hex(RALPH_PALETTE.midnight),

  // Header styles
  header: chalk.hex(RALPH_PALETTE.coral).bold,
  heading: chalk.hex(RALPH_PALETTE.coral).bold, // Alias for header
  subheader: chalk.hex(RALPH_PALETTE.cream).dim,

  // Box drawing
  border: chalk.hex(RALPH_PALETTE.dimmed),
  borderAccent: chalk.hex(RALPH_PALETTE.shell),
};

// Provider badge styling
export function providerBadge(provider: string): string {
  const colors = RALPH_PALETTE.providers;
  const color = colors[provider as keyof typeof colors] || RALPH_PALETTE.muted;
  return chalk.bgHex(color).hex(RALPH_PALETTE.midnight).bold(` ${provider.toUpperCase()} `);
}

// Complexity badge styling
export function complexityBadge(complexity: string): string {
  const colors = RALPH_PALETTE.complexity;
  const color = colors[complexity as keyof typeof colors] || RALPH_PALETTE.muted;
  return chalk.bgHex(color).hex(RALPH_PALETTE.midnight).bold(` ${complexity} `);
}

// Status badge styling
export function statusBadge(status: string): string {
  const colors = RALPH_PALETTE.status;
  const normalizedStatus = status.replace("-", "_") as keyof typeof colors;
  const color = colors[normalizedStatus] || RALPH_PALETTE.muted;
  const displayStatus = status.replace("_", " ").toUpperCase();
  return chalk.bgHex(color).hex(RALPH_PALETTE.midnight).bold(` ${displayStatus} `);
}

// Progress bar rendering
export function progressBar(current: number, total: number, width: number = 20): string {
  const percentage = total > 0 ? current / total : 0;
  const filled = Math.round(width * percentage);
  const empty = width - filled;

  const filledBar = theme.success("█".repeat(filled));
  const emptyBar = theme.dimmed("░".repeat(empty));
  const percent = theme.text(`${Math.round(percentage * 100)}%`);

  return `${filledBar}${emptyBar} ${percent}`;
}

// Box drawing characters
export const box = {
  topLeft: "╭",
  topRight: "╮",
  bottomLeft: "╰",
  bottomRight: "╯",
  horizontal: "─",
  vertical: "│",
  teeRight: "├",
  teeLeft: "┤",
  teeDown: "┬",
  teeUp: "┴",
  cross: "┼",
};

// Create a bordered box
export function createBox(content: string[], title?: string, width: number = 60): string {
  const innerWidth = width - 2;
  const lines: string[] = [];

  // Top border with optional title
  if (title) {
    const titleLen = title.length + 2;
    const padLeft = Math.floor((innerWidth - titleLen) / 2);
    const padRight = innerWidth - titleLen - padLeft;
    lines.push(
      theme.borderAccent(box.topLeft) +
        theme.border(box.horizontal.repeat(padLeft)) +
        theme.header(` ${title} `) +
        theme.border(box.horizontal.repeat(padRight)) +
        theme.borderAccent(box.topRight),
    );
  } else {
    lines.push(
      theme.borderAccent(box.topLeft) +
        theme.border(box.horizontal.repeat(innerWidth)) +
        theme.borderAccent(box.topRight),
    );
  }

  // Content lines
  for (const line of content) {
    const visibleLength = stripAnsi(line).length;
    const padding = Math.max(0, innerWidth - visibleLength);
    lines.push(
      theme.border(box.vertical) + line + " ".repeat(padding) + theme.border(box.vertical),
    );
  }

  // Bottom border
  lines.push(
    theme.borderAccent(box.bottomLeft) +
      theme.border(box.horizontal.repeat(innerWidth)) +
      theme.borderAccent(box.bottomRight),
  );

  return lines.join("\n");
}

// Strip ANSI codes for length calculation
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}
