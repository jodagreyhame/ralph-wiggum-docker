/**
 * Blessed TUI Components
 * Barrel export for blessed-based TUI widgets
 */

// Screen lifecycle
export {
  createScreen,
  destroyScreen,
  renderScreen,
  clearScreen,
  createHeader,
  createFooter,
  createContentArea,
} from "./screen.js";
export type { ScreenOptions } from "./screen.js";

// Theme and colors
export {
  BLESSED_COLORS,
  PROVIDER_COLORS,
  COMPLEXITY_COLORS,
  STATUS_COLORS,
  blessedStyles,
  formatProviderBadge,
  formatComplexityBadge,
  formatStatusBadge,
  formatProgressBar,
  getStatusIcon,
  getStatusColor,
} from "./theme.js";
