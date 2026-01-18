/**
 * LOBSTER_PALETTE - Base terminal color palette from clawdbot
 * Synced from clawdbot/src/terminal/palette.ts - DO NOT MODIFY
 *
 * This base palette is designed to be upstream-pullable from clawdbot.
 * For Ralph-specific extensions, see palette-extended.ts
 */

export const LOBSTER_PALETTE = {
  accent: "#FF5A2D",
  accentBright: "#FF7A3D",
  accentDim: "#D14A22",
  info: "#FF8A5B",
  success: "#2FBF71",
  warn: "#FFB020",
  error: "#E23D2D",
  muted: "#8B7F77",
} as const;

export type LobsterPaletteColor = keyof typeof LOBSTER_PALETTE;
