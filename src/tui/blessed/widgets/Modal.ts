/**
 * Modal Widget (blessed)
 * Overlay dialogs for help, confirmations, and detail views
 */

import blessed from "blessed";
import { BLESSED_COLORS } from "../theme.js";

export interface ModalOptions {
  title?: string;
  content: string;
  width?: number | string;
  height?: number | string;
  onClose?: () => void;
}

/**
 * Create a modal overlay
 */
export function createModal(
  screen: blessed.Widgets.Screen,
  options: ModalOptions,
): blessed.Widgets.BoxElement {
  const modal = blessed.box({
    parent: screen,
    top: "center",
    left: "center",
    width: options.width || "80%",
    height: options.height || "80%",
    content: options.content,
    tags: true,
    border: "line",
    label: options.title ? ` ${options.title} ` : undefined,
    scrollable: true,
    scrollbar: {
      ch: "█",
      track: { bg: BLESSED_COLORS.dimmed },
      style: { inverse: true },
    },
    keys: true,
    vi: true,
    mouse: true,
    style: {
      fg: BLESSED_COLORS.cream,
      border: { fg: BLESSED_COLORS.coral },
      label: { fg: BLESSED_COLORS.coral, bold: true },
    },
  });

  // Close on Escape or q
  modal.key(["escape", "q", "enter"], () => {
    modal.detach();
    screen.render();
    if (options.onClose) {
      options.onClose();
    }
  });

  // Focus the modal
  modal.focus();
  screen.render();

  return modal;
}

/**
 * Create the help modal
 */
export function createHelpModal(
  screen: blessed.Widgets.Screen,
  screenType: "projects-list" | "project-detail",
  onClose?: () => void,
): blessed.Widgets.BoxElement {
  const content =
    screenType === "projects-list"
      ? `{${BLESSED_COLORS.coral}-fg}PROJECT LIST HELP{/}

{${BLESSED_COLORS.shell}-fg}Navigation{/}
  {${BLESSED_COLORS.cream}-fg}↑/k{/}      Move up
  {${BLESSED_COLORS.cream}-fg}↓/j{/}      Move down
  {${BLESSED_COLORS.cream}-fg}Enter{/}    Open project detail
  {${BLESSED_COLORS.cream}-fg}Esc{/}      Go back / Close modal

{${BLESSED_COLORS.shell}-fg}Actions{/}
  {${BLESSED_COLORS.cream}-fg}n{/}        Create new project
  {${BLESSED_COLORS.cream}-fg}d{/}        Delete selected project
  {${BLESSED_COLORS.cream}-fg}r{/}        Refresh project list
  {${BLESSED_COLORS.cream}-fg}Space{/}    Toggle compact/expanded view

{${BLESSED_COLORS.shell}-fg}General{/}
  {${BLESSED_COLORS.cream}-fg}?{/}        Show this help
  {${BLESSED_COLORS.cream}-fg}q{/}        Quit application

{${BLESSED_COLORS.muted}-fg}Press Esc, q, or Enter to close{/}`
      : `{${BLESSED_COLORS.coral}-fg}PROJECT DETAIL HELP{/}

{${BLESSED_COLORS.shell}-fg}Tab Navigation{/}
  {${BLESSED_COLORS.cream}-fg}1-5{/}      Jump to tab (Overview, Tasks, Logs, History, Config)
  {${BLESSED_COLORS.cream}-fg}←/h{/}      Previous tab
  {${BLESSED_COLORS.cream}-fg}→/l{/}      Next tab
  {${BLESSED_COLORS.cream}-fg}Esc{/}      Go back to project list

{${BLESSED_COLORS.shell}-fg}Tab Actions{/}
  {${BLESSED_COLORS.cream}-fg}↑/k{/}      Navigate up in lists
  {${BLESSED_COLORS.cream}-fg}↓/j{/}      Navigate down in lists
  {${BLESSED_COLORS.cream}-fg}Enter{/}    Open detail (Tasks), Edit config (Config)
  {${BLESSED_COLORS.cream}-fg}f{/}        Toggle filter (Tasks tab)
  {${BLESSED_COLORS.cream}-fg}r{/}        Refresh data

{${BLESSED_COLORS.shell}-fg}General{/}
  {${BLESSED_COLORS.cream}-fg}?{/}        Show this help
  {${BLESSED_COLORS.cream}-fg}q{/}        Quit application

{${BLESSED_COLORS.muted}-fg}Press Esc, q, or Enter to close{/}`;

  return createModal(screen, {
    title: "HELP",
    content,
    width: "60%",
    height: "70%",
    onClose,
  });
}

/**
 * Create a confirmation dialog
 */
export function createConfirmModal(
  screen: blessed.Widgets.Screen,
  options: {
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  },
): blessed.Widgets.BoxElement {
  const modal = blessed.box({
    parent: screen,
    top: "center",
    left: "center",
    width: 50,
    height: 9,
    tags: true,
    border: "line",
    label: ` ${options.title} `,
    style: {
      fg: BLESSED_COLORS.cream,
      border: { fg: BLESSED_COLORS.error },
      label: { fg: BLESSED_COLORS.error, bold: true },
    },
  });

  // Message
  blessed.text({
    parent: modal,
    top: 1,
    left: "center",
    content: options.message,
    tags: true,
    style: { fg: BLESSED_COLORS.cream },
  });

  // Buttons container
  const buttonsBox = blessed.box({
    parent: modal,
    top: 4,
    left: "center",
    width: 30,
    height: 1,
  });

  // Confirm button
  const confirmBtn = blessed.button({
    parent: buttonsBox,
    left: 0,
    width: 12,
    height: 1,
    content: "  Delete  ",
    tags: true,
    style: {
      fg: BLESSED_COLORS.cream,
      bg: BLESSED_COLORS.error,
      focus: { fg: BLESSED_COLORS.midnight, bg: BLESSED_COLORS.error },
    },
    mouse: true,
    keys: true,
  });

  // Cancel button
  const cancelBtn = blessed.button({
    parent: buttonsBox,
    left: 16,
    width: 12,
    height: 1,
    content: "  Cancel  ",
    tags: true,
    style: {
      fg: BLESSED_COLORS.cream,
      bg: BLESSED_COLORS.dimmed,
      focus: { fg: BLESSED_COLORS.midnight, bg: BLESSED_COLORS.dimmed },
    },
    mouse: true,
    keys: true,
  });

  // Key bindings
  confirmBtn.on("press", () => {
    modal.detach();
    screen.render();
    options.onConfirm();
  });

  cancelBtn.on("press", () => {
    modal.detach();
    screen.render();
    options.onCancel();
  });

  modal.key(["escape", "n"], () => {
    modal.detach();
    screen.render();
    options.onCancel();
  });

  modal.key(["y"], () => {
    modal.detach();
    screen.render();
    options.onConfirm();
  });

  // Tab between buttons - track focus via screen.focused
  modal.key(["tab"], () => {
    if (screen.focused === confirmBtn) {
      cancelBtn.focus();
    } else {
      confirmBtn.focus();
    }
  });

  // Focus confirm button initially
  confirmBtn.focus();
  screen.render();

  return modal;
}

/**
 * Create delete confirmation modal
 */
export function createDeleteConfirmModal(
  screen: blessed.Widgets.Screen,
  projectName: string,
  onConfirm: () => void,
  onCancel: () => void,
): blessed.Widgets.BoxElement {
  return createConfirmModal(screen, {
    title: "DELETE PROJECT",
    message: `{${BLESSED_COLORS.warning}-fg}Are you sure you want to delete "${projectName}"?{/}

{${BLESSED_COLORS.muted}-fg}This cannot be undone.{/}`,
    onConfirm,
    onCancel,
  });
}
