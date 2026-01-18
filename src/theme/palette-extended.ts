/**
 * RALPH_PALETTE - Extended color palette for Ralph
 *
 * Extends LOBSTER_PALETTE with Ralph-specific colors:
 * - Additional theme colors (cream, midnight, surface, etc.)
 * - Provider colors for different AI backends
 * - Complexity colors for task sizing
 * - Status colors for task states
 */

import { LOBSTER_PALETTE } from "./palette.js";

export const RALPH_PALETTE = {
  // Include all base palette colors
  ...LOBSTER_PALETTE,

  // Additional theme colors
  shell: "#E85D4C", // Lobster red - legacy alias for accent
  coral: "#FF7F6B", // Coral - lighter accent
  cream: "#FFF5E6", // Cream - light text on dark
  midnight: "#1A1A2E", // Dark background
  deep: "#16213E", // Slightly lighter dark
  surface: "#1F2937", // Surface background
  dimmed: "#374151", // Darker gray - borders

  // Provider colors
  providers: {
    glm: "#10B981", // Emerald - GLM
    anthropic: "#F59E0B", // Amber - Anthropic
    gemini: "#3B82F6", // Blue - Gemini
    claude: "#8B5CF6", // Purple - Claude
    codex: "#EC4899", // Pink - Codex
  },

  // Complexity colors
  complexity: {
    S: "#4ADE80", // Green - Small
    M: "#FBBF24", // Amber - Medium
    L: "#EF4444", // Red - Large
  },

  // Status badge colors
  status: {
    pending: "#6B7280",
    in_progress: "#FBBF24",
    completed: "#4ADE80",
    blocked: "#EF4444",
  },
} as const;

export type RalphPaletteColor = keyof typeof RALPH_PALETTE;
export type ProviderColor = keyof typeof RALPH_PALETTE.providers;
export type ComplexityColor = keyof typeof RALPH_PALETTE.complexity;
export type StatusColor = keyof typeof RALPH_PALETTE.status;
