/**
 * Status Bar Widget (blessed)
 * Footer status bar with context info and key hints
 */

import blessed from "blessed";
import type { AppState, DetailTabName } from "../../state.js";
import { BLESSED_COLORS } from "../theme.js";

export interface StatusBarOptions {
  parent: blessed.Widgets.Screen | blessed.Widgets.BoxElement;
}

/**
 * Get key hints for project detail tabs
 */
function getDetailTabKeys(tab: DetailTabName): string {
  switch (tab) {
    case "overview":
      return "1-5 Tabs │ ←→ Switch │ r Refresh │ Esc Back │ ?";
    case "tasks":
      return "↑↓ Navigate │ Enter Detail │ f Filter │ r Refresh │ Esc Back │ ?";
    case "logs":
      return "↑↓ Scroll │ s Toggle Auto-scroll │ r Refresh │ Esc Back │ ?";
    case "history":
      return "↑↓ Navigate │ Enter View Diff │ r Refresh │ Esc Back │ ?";
    case "config":
      return "Enter/e Edit Config │ r Refresh │ Esc Back │ ?";
    default:
      return "Esc Back │ ?";
  }
}

/**
 * Create status bar for project list screen
 */
export function createProjectListStatusBar(
  options: StatusBarOptions,
  state: AppState,
): blessed.Widgets.BoxElement {
  const projects = state.projects || [];
  const selected = projects[state.selectedProjectIndex || 0];

  let infoLine = `{${BLESSED_COLORS.muted}-fg}No projects{/}`;

  if (selected) {
    const statusIcon =
      selected.status === "running"
        ? `{${BLESSED_COLORS.warning}-fg}●{/}`
        : selected.status === "completed"
          ? `{${BLESSED_COLORS.success}-fg}✓{/}`
          : selected.status === "blocked"
            ? `{${BLESSED_COLORS.error}-fg}✕{/}`
            : `{${BLESSED_COLORS.muted}-fg}○{/}`;

    const parts = [
      `{${BLESSED_COLORS.shell}-fg}${selected.name}{/}`,
      `${statusIcon} ${selected.status}`,
    ];

    if (selected.iteration !== null) {
      parts.push(`{${BLESSED_COLORS.muted}-fg}Iter ${selected.iteration}/∞{/}`);
    }

    infoLine = parts.join(` {${BLESSED_COLORS.dimmed}-fg}│{/} `);
  }

  const keysLine = `{${BLESSED_COLORS.muted}-fg}↑↓ Navigate │ Enter Open │ Space Expand │ n New │ d Delete │ r Refresh │ ?{/}`;

  return blessed.box({
    parent: options.parent,
    bottom: 0,
    left: 0,
    width: "100%",
    height: 2,
    content: `${infoLine}\n${keysLine}`,
    tags: true,
    style: {
      fg: BLESSED_COLORS.cream,
    },
  });
}

/**
 * Update project list status bar
 */
export function updateProjectListStatusBar(
  statusBar: blessed.Widgets.BoxElement,
  state: AppState,
): void {
  const projects = state.projects || [];
  const selected = projects[state.selectedProjectIndex || 0];

  let infoLine = `{${BLESSED_COLORS.muted}-fg}No projects{/}`;

  if (selected) {
    const statusIcon =
      selected.status === "running"
        ? `{${BLESSED_COLORS.warning}-fg}●{/}`
        : selected.status === "completed"
          ? `{${BLESSED_COLORS.success}-fg}✓{/}`
          : selected.status === "blocked"
            ? `{${BLESSED_COLORS.error}-fg}✕{/}`
            : `{${BLESSED_COLORS.muted}-fg}○{/}`;

    const parts = [
      `{${BLESSED_COLORS.shell}-fg}${selected.name}{/}`,
      `${statusIcon} ${selected.status}`,
    ];

    if (selected.iteration !== null) {
      parts.push(`{${BLESSED_COLORS.muted}-fg}Iter ${selected.iteration}/∞{/}`);
    }

    infoLine = parts.join(` {${BLESSED_COLORS.dimmed}-fg}│{/} `);
  }

  const keysLine = `{${BLESSED_COLORS.muted}-fg}↑↓ Navigate │ Enter Open │ Space Expand │ n New │ d Delete │ r Refresh │ ?{/}`;

  statusBar.setContent(`${infoLine}\n${keysLine}`);
}

/**
 * Create status bar for project detail screen
 */
export function createProjectDetailStatusBar(
  options: StatusBarOptions,
  state: AppState,
): blessed.Widgets.BoxElement {
  const project = state.selectedProject;
  const tab = state.detailTab || "overview";

  let infoLine = `{${BLESSED_COLORS.muted}-fg}No project selected{/}`;

  if (project) {
    const statusIcon =
      project.status === "running"
        ? `{${BLESSED_COLORS.warning}-fg}●{/}`
        : project.status === "completed"
          ? `{${BLESSED_COLORS.success}-fg}✓{/}`
          : project.status === "blocked"
            ? `{${BLESSED_COLORS.error}-fg}✕{/}`
            : `{${BLESSED_COLORS.muted}-fg}○{/}`;

    const parts = [`{${BLESSED_COLORS.shell}-fg}${project.name}{/}`, `${statusIcon} ${project.status}`];

    if (project.iteration !== null) {
      parts.push(`{${BLESSED_COLORS.muted}-fg}Iter ${project.iteration}/∞{/}`);
    }

    if (project.taskProgress) {
      const percent = Math.round(
        (project.taskProgress.completed / project.taskProgress.total) * 100,
      );
      parts.push(`{${BLESSED_COLORS.success}-fg}${percent}% complete{/}`);
    }

    infoLine = parts.join(` {${BLESSED_COLORS.dimmed}-fg}│{/} `);
  }

  const keysLine = `{${BLESSED_COLORS.muted}-fg}${getDetailTabKeys(tab)}{/}`;

  return blessed.box({
    parent: options.parent,
    bottom: 0,
    left: 0,
    width: "100%",
    height: 2,
    content: `${infoLine}\n${keysLine}`,
    tags: true,
    style: {
      fg: BLESSED_COLORS.cream,
    },
  });
}

/**
 * Update project detail status bar
 */
export function updateProjectDetailStatusBar(
  statusBar: blessed.Widgets.BoxElement,
  state: AppState,
): void {
  const project = state.selectedProject;
  const tab = state.detailTab || "overview";

  let infoLine = `{${BLESSED_COLORS.muted}-fg}No project selected{/}`;

  if (project) {
    const statusIcon =
      project.status === "running"
        ? `{${BLESSED_COLORS.warning}-fg}●{/}`
        : project.status === "completed"
          ? `{${BLESSED_COLORS.success}-fg}✓{/}`
          : project.status === "blocked"
            ? `{${BLESSED_COLORS.error}-fg}✕{/}`
            : `{${BLESSED_COLORS.muted}-fg}○{/}`;

    const parts = [`{${BLESSED_COLORS.shell}-fg}${project.name}{/}`, `${statusIcon} ${project.status}`];

    if (project.iteration !== null) {
      parts.push(`{${BLESSED_COLORS.muted}-fg}Iter ${project.iteration}/∞{/}`);
    }

    if (project.taskProgress) {
      const percent = Math.round(
        (project.taskProgress.completed / project.taskProgress.total) * 100,
      );
      parts.push(`{${BLESSED_COLORS.success}-fg}${percent}% complete{/}`);
    }

    infoLine = parts.join(` {${BLESSED_COLORS.dimmed}-fg}│{/} `);
  }

  const keysLine = `{${BLESSED_COLORS.muted}-fg}${getDetailTabKeys(tab)}{/}`;

  statusBar.setContent(`${infoLine}\n${keysLine}`);
}
