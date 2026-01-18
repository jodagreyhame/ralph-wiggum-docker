/**
 * Builder screen - backend and auth configuration
 */

import { theme } from "../../theme/theme.js";
import { renderProviderCard } from "../components/provider-card.js";
import { renderDropdown, type DropdownItem } from "../components/dropdown.js";
import { BACKENDS } from "../../config/schema.js";
import type { AppState } from "../state.js";

export function renderBuilderScreen(state: AppState): string {
  const backend = BACKENDS.find((b) => b.id === state.config.builder.backend);
  const authModes: DropdownItem[] =
    backend?.authModes.map((am) => ({
      id: am,
      label: am,
    })) || [];

  const lines: string[] = [
    "",
    theme.heading("  BUILDER CONFIGURATION"),
    "",
    theme.muted("  Backend (press 1-5 to select):"),
    renderProviderCard(state.config.builder.backend, state.focusedField === 0),
    "",
    theme.muted("  Auth Mode:"),
    renderDropdown(
      authModes,
      state.config.builder.auth_mode,
      state.dropdownOpen && state.focusedField === 1,
      state.focusedField === 1,
    ),
    "",
  ];

  return lines.join("\n");
}
