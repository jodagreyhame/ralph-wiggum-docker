/**
 * Blessed Theme - Color mappings from RALPH_PALETTE
 * Converts chalk-based theme to blessed-compatible colors
 */

import { RALPH_PALETTE } from "../../theme/palette-extended.js";

/**
 * Blessed-compatible colors (hex strings)
 * Blessed supports hex colors directly in style objects
 */
export const BLESSED_COLORS = {
  // Primary
  shell: RALPH_PALETTE.shell, // '#E85D4C'
  coral: RALPH_PALETTE.coral, // '#FF7F6B'
  cream: RALPH_PALETTE.cream, // '#FFF5E6'
  midnight: RALPH_PALETTE.midnight, // '#1A1A2E'
  deep: RALPH_PALETTE.deep, // '#16213E'
  surface: RALPH_PALETTE.surface, // '#1F2937'

  // Status
  success: RALPH_PALETTE.success, // '#2FBF71'
  warning: RALPH_PALETTE.warn, // '#FFB020'
  error: RALPH_PALETTE.error, // '#E23D2D'
  info: RALPH_PALETTE.info, // '#FF8A5B'

  // Text
  muted: RALPH_PALETTE.muted, // '#8B7F77'
  dimmed: RALPH_PALETTE.dimmed, // '#374151'

  // Accent
  accent: RALPH_PALETTE.accent, // '#FF5A2D'
  accentBright: RALPH_PALETTE.accentBright, // '#FF7A3D'
  accentDim: RALPH_PALETTE.accentDim, // '#D14A22'
} as const;

/**
 * Provider colors for badges
 */
export const PROVIDER_COLORS = RALPH_PALETTE.providers;

/**
 * Complexity colors for task badges
 */
export const COMPLEXITY_COLORS = RALPH_PALETTE.complexity;

/**
 * Status colors for task states
 */
export const STATUS_COLORS = RALPH_PALETTE.status;

/**
 * Blessed style presets for common use cases
 */
export const blessedStyles = {
  // Text styles
  primary: { fg: BLESSED_COLORS.shell },
  accent: { fg: BLESSED_COLORS.coral },
  text: { fg: BLESSED_COLORS.cream },
  muted: { fg: BLESSED_COLORS.muted },
  dimmed: { fg: BLESSED_COLORS.dimmed },

  // Status styles
  success: { fg: BLESSED_COLORS.success },
  warning: { fg: BLESSED_COLORS.warning },
  error: { fg: BLESSED_COLORS.error },
  info: { fg: BLESSED_COLORS.info },

  // Selection styles
  selected: { bg: BLESSED_COLORS.shell, fg: BLESSED_COLORS.midnight },
  focused: { border: { fg: BLESSED_COLORS.coral } },

  // Border styles
  border: { fg: BLESSED_COLORS.dimmed },
  borderAccent: { fg: BLESSED_COLORS.shell },

  // Header styles
  header: { fg: BLESSED_COLORS.coral, bold: true },
};

/**
 * Format provider badge for blessed tags
 */
export function formatProviderBadge(provider: string): string {
  const normalized = provider.toLowerCase();
  const color = PROVIDER_COLORS[normalized as keyof typeof PROVIDER_COLORS] || BLESSED_COLORS.muted;
  return `{${color}-bg}{${BLESSED_COLORS.midnight}-fg} ${provider.toUpperCase()} {/}`;
}

/**
 * Format complexity badge for blessed tags
 */
export function formatComplexityBadge(complexity: string): string {
  const normalized = complexity.toUpperCase();
  const color =
    COMPLEXITY_COLORS[normalized as keyof typeof COMPLEXITY_COLORS] || BLESSED_COLORS.muted;
  return `{${color}-bg}{${BLESSED_COLORS.midnight}-fg} ${complexity.toUpperCase()} {/}`;
}

/**
 * Format status badge for blessed tags
 */
export function formatStatusBadge(status: string): string {
  const normalizedStatus = status.toLowerCase().replace("-", "_") as keyof typeof STATUS_COLORS;
  const color = STATUS_COLORS[normalizedStatus] || BLESSED_COLORS.muted;
  const displayStatus = status.replace("_", " ").toUpperCase();
  return `{${color}-bg}{${BLESSED_COLORS.midnight}-fg} ${displayStatus} {/}`;
}

/**
 * Format section header with decorative line
 * e.g., "PROGRESS ─────────────────────────────────"
 */
export function formatSectionHeader(label: string, width: number = 70): string {
  const labelPart = `{${BLESSED_COLORS.coral}-fg}${label}{/}`;
  const lineLength = Math.max(0, width - label.length - 1);
  const linePart = `{${BLESSED_COLORS.dimmed}-fg}${"─".repeat(lineLength)}{/}`;
  return `${labelPart} ${linePart}`;
}

/**
 * Format decorative header with title
 * e.g., "══ PROJECT-NAME ══"
 */
export function formatDecorativeHeader(title: string, subtitle?: string): string[] {
  const lines: string[] = [];
  const border = `{${BLESSED_COLORS.coral}-fg}══{/}`;
  const titleText = `{${BLESSED_COLORS.warning}-fg}{bold}${title}{/bold}{/}`;
  lines.push(`${border} ${titleText} ${border}`);
  if (subtitle) {
    lines.push(`{${BLESSED_COLORS.muted}-fg}${subtitle}{/}`);
  }
  return lines;
}

/**
 * Format progress bar for blessed tags
 */
export function formatProgressBar(current: number, total: number, width: number = 20): string {
  const percentage = total > 0 ? current / total : 0;
  const filled = Math.round(width * percentage);
  const empty = width - filled;
  const percent = Math.round(percentage * 100);

  const filledBar = `{${BLESSED_COLORS.success}-fg}${"█".repeat(filled)}{/}`;
  const emptyBar = `{${BLESSED_COLORS.dimmed}-fg}${"░".repeat(empty)}{/}`;

  return `${filledBar}${emptyBar} ${percent}%`;
}

/**
 * Get status icon for project/task status
 */
export function getStatusIcon(status: string): string {
  switch (status) {
    case "running":
    case "in_progress":
      return `{${BLESSED_COLORS.warning}-fg}●{/}`;
    case "completed":
    case "complete":
      return `{${BLESSED_COLORS.success}-fg}✓{/}`;
    case "blocked":
    case "error":
      return `{${BLESSED_COLORS.error}-fg}✕{/}`;
    case "idle":
    case "pending":
    default:
      return `{${BLESSED_COLORS.muted}-fg}○{/}`;
  }
}

/**
 * Get status color for direct style use
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case "running":
    case "in_progress":
      return BLESSED_COLORS.warning;
    case "completed":
    case "complete":
      return BLESSED_COLORS.success;
    case "blocked":
    case "error":
      return BLESSED_COLORS.error;
    case "idle":
    case "pending":
    default:
      return BLESSED_COLORS.muted;
  }
}
