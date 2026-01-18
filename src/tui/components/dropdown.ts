/**
 * Dropdown selector component
 */

import { theme } from "../../theme/theme.js";

export interface DropdownItem {
  id: string;
  label: string;
  description?: string;
}

export function renderDropdown(
  items: DropdownItem[],
  selected: string,
  isOpen: boolean,
  isFocused: boolean,
): string {
  const selectedItem = items.find((item) => item.id === selected);
  const label = selectedItem?.label || selected;

  if (!isOpen) {
    const prefix = isFocused ? theme.accent("> ") : "  ";
    const value = isFocused ? theme.accentBright(label) : label;
    return `${prefix}${value} ${theme.muted("[Enter to expand]")}`;
  }

  const lines: string[] = [];
  for (const item of items) {
    const isSelected = item.id === selected;
    const prefix = isSelected ? theme.accent("> ") : "  ";
    const name = isSelected ? theme.accentBright(item.label) : item.label;
    const desc = item.description ? theme.muted(` - ${item.description}`) : "";
    lines.push(`${prefix}${name}${desc}`);
  }

  return lines.join("\n");
}
