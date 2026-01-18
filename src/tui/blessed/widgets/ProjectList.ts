/**
 * Project List Widget (blessed)
 * Scrollable list of projects with compact/expanded modes
 */

import blessed from "blessed";
import type { ProjectInfo } from "../../../utils/project-status.js";
import { formatRelativeTime } from "../../../utils/project-status.js";
import type { AppState, ListViewMode } from "../../state.js";
import {
  BLESSED_COLORS,
  formatProgressBar,
  formatProviderBadge,
  getStatusIcon,
} from "../theme.js";

export interface ProjectListOptions {
  parent: blessed.Widgets.Screen | blessed.Widgets.BoxElement;
  top?: number | string;
  left?: number | string;
  width?: number | string;
  height?: number | string;
}

/**
 * Create the stats bar showing project counts
 */
export function createStatsBar(
  parent: blessed.Widgets.Screen | blessed.Widgets.BoxElement,
  projects: ProjectInfo[],
  viewMode: ListViewMode,
): blessed.Widgets.BoxElement {
  const total = projects.length;
  const running = projects.filter((p) => p.status === "running").length;
  const completed = projects.filter((p) => p.status === "completed").length;
  const idle = projects.filter((p) => p.status === "idle").length;
  const blocked = projects.filter((p) => p.status === "blocked").length;

  const parts: string[] = [`{${BLESSED_COLORS.shell}-fg}${total} Projects{/}`];

  if (running > 0) {
    parts.push(`{${BLESSED_COLORS.warning}-fg}● ${running} Running{/}`);
  }
  if (completed > 0) {
    parts.push(`{${BLESSED_COLORS.success}-fg}✓ ${completed} Complete{/}`);
  }
  if (idle > 0) {
    parts.push(`{${BLESSED_COLORS.muted}-fg}○ ${idle} Idle{/}`);
  }
  if (blocked > 0) {
    parts.push(`{${BLESSED_COLORS.error}-fg}✕ ${blocked} Blocked{/}`);
  }

  if (viewMode === "expanded") {
    parts.push(`{${BLESSED_COLORS.info}-fg}[Expanded]{/}`);
  }

  return blessed.box({
    parent,
    top: 0,
    left: 0,
    width: "100%",
    height: 1,
    content: parts.join(` {${BLESSED_COLORS.dimmed}-fg}│{/} `),
    tags: true,
    style: {
      fg: BLESSED_COLORS.cream,
    },
  });
}

/**
 * Format a single project row for the table
 */
function formatProjectRow(
  project: ProjectInfo,
  index: number,
  isSelected: boolean,
  viewMode: ListViewMode,
): string[] {
  const prefix = isSelected ? "▶" : " ";
  const num = String(index + 1).padStart(3);

  if (viewMode === "compact") {
    // Compact: # | NAME | STATUS | ITER | PROGRESS | UPDATED
    const name = project.name.length > 20 ? project.name.substring(0, 17) + "..." : project.name;
    const statusIcon = getStatusIcon(project.status);
    const statusText = project.status.charAt(0).toUpperCase() + project.status.slice(1);
    const iter = project.iteration !== null ? `${project.iteration}/∞` : "0/∞";

    let progress = "    -    ";
    if (project.taskProgress && project.taskProgress.total > 0) {
      progress = formatProgressBar(
        project.taskProgress.completed,
        project.taskProgress.total,
        8,
      );
    }

    const updated = formatRelativeTime(project.lastActivity);

    return [
      `${prefix} ${num}`,
      name.padEnd(20),
      `${statusIcon} ${statusText.padEnd(8)}`,
      iter.padEnd(6),
      progress,
      updated.padEnd(8),
    ];
  } else {
    // Expanded: # | NAME | DESCRIPTION | STATUS | ITER | PROVIDER
    const name = project.name.length > 16 ? project.name.substring(0, 13) + "..." : project.name;
    const desc =
      project.description.length > 24
        ? project.description.substring(0, 21) + "..."
        : project.description;
    const statusIcon = getStatusIcon(project.status);
    const statusText = project.status.charAt(0).toUpperCase() + project.status.slice(1);
    const iter = project.iteration !== null ? `${project.iteration}/∞` : "0/∞";
    const provider = project.provider ? formatProviderBadge(project.provider) : "-";

    return [
      `${prefix} ${num}`,
      name.padEnd(16),
      desc.padEnd(24),
      `${statusIcon} ${statusText.padEnd(8)}`,
      iter.padEnd(6),
      provider,
    ];
  }
}

/**
 * Create the project list table widget
 */
export function createProjectListTable(
  options: ProjectListOptions,
  state: AppState,
): blessed.Widgets.ListTableElement {
  const projects = state.projects || [];
  const selectedIndex = state.selectedProjectIndex || 0;
  const viewMode = state.listViewMode || "compact";

  // Headers based on view mode
  const headers =
    viewMode === "compact"
      ? ["  #", "PROJECT", "STATUS", "ITER", "PROGRESS", "UPDATED"]
      : ["  #", "PROJECT", "DESCRIPTION", "STATUS", "ITER", "PROVIDER"];

  // Format rows
  const rows = projects.map((p, i) => formatProjectRow(p, i, i === selectedIndex, viewMode));

  const table = blessed.listtable({
    parent: options.parent,
    top: options.top ?? 2,
    left: options.left ?? 0,
    width: options.width ?? "100%",
    height: options.height ?? "100%-5",
    tags: true,
    keys: false,
    vi: false,
    mouse: false,
    data: [headers, ...rows],
    border: "line",
    align: "left",
    style: {
      fg: BLESSED_COLORS.cream,
      border: { fg: BLESSED_COLORS.dimmed },
      header: { fg: BLESSED_COLORS.coral, bold: true },
      cell: { fg: BLESSED_COLORS.cream },
      selected: { bg: BLESSED_COLORS.shell, fg: BLESSED_COLORS.midnight },
    },
    scrollbar: {
      ch: "█",
      track: { bg: BLESSED_COLORS.dimmed },
      style: { inverse: true },
    },
  });

  return table;
}

/**
 * Update the project list table with new data
 */
export function updateProjectListTable(
  table: blessed.Widgets.ListTableElement,
  state: AppState,
): void {
  const projects = state.projects || [];
  const selectedIndex = state.selectedProjectIndex || 0;
  const viewMode = state.listViewMode || "compact";

  // Headers based on view mode
  const headers =
    viewMode === "compact"
      ? ["  #", "PROJECT", "STATUS", "ITER", "PROGRESS", "UPDATED"]
      : ["  #", "PROJECT", "DESCRIPTION", "STATUS", "ITER", "PROVIDER"];

  // Format rows
  const rows = projects.map((p, i) => formatProjectRow(p, i, i === selectedIndex, viewMode));

  table.setData([headers, ...rows]);
}

/**
 * Create empty state message
 */
export function createEmptyState(
  parent: blessed.Widgets.Screen | blessed.Widgets.BoxElement,
): blessed.Widgets.BoxElement {
  return blessed.box({
    parent,
    top: "center",
    left: "center",
    width: 40,
    height: 5,
    content: `{center}{${BLESSED_COLORS.muted}-fg}No projects found

Press 'n' to create your first project{/}{/center}`,
    tags: true,
    border: "line",
    style: {
      border: { fg: BLESSED_COLORS.dimmed },
    },
  });
}

/**
 * Create the footer info bar
 */
export function createProjectListFooter(
  parent: blessed.Widgets.Screen | blessed.Widgets.BoxElement,
  state: AppState,
): blessed.Widgets.BoxElement {
  const projects = state.projects || [];
  const selected = projects[state.selectedProjectIndex || 0];

  let infoContent = `{${BLESSED_COLORS.muted}-fg}No projects{/}`;

  if (selected) {
    const parts: string[] = [`{${BLESSED_COLORS.shell}-fg}Selected: ${selected.name}{/}`];

    if (selected.status === "running") {
      parts.push(`{${BLESSED_COLORS.warning}-fg}● Running{/}`);
    } else if (selected.status === "completed") {
      parts.push(`{${BLESSED_COLORS.success}-fg}✓ Complete{/}`);
    } else if (selected.status === "blocked") {
      parts.push(`{${BLESSED_COLORS.error}-fg}✕ Blocked{/}`);
    } else {
      parts.push(`{${BLESSED_COLORS.muted}-fg}○ Idle{/}`);
    }

    if (selected.iteration !== null) {
      parts.push(`{${BLESSED_COLORS.muted}-fg}Iter ${selected.iteration}/∞{/}`);
    }

    infoContent = parts.join(` {${BLESSED_COLORS.dimmed}-fg}│{/} `);
  }

  const keysContent = `{${BLESSED_COLORS.muted}-fg}↑↓ Navigate │ Enter Open │ Space Expand │ n New │ d Delete │ r Refresh │ ?{/}`;

  return blessed.box({
    parent,
    bottom: 0,
    left: 0,
    width: "100%",
    height: 2,
    content: `${infoContent}\n${keysContent}`,
    tags: true,
  });
}

/**
 * Update the footer with new selection
 */
export function updateProjectListFooter(
  footer: blessed.Widgets.BoxElement,
  state: AppState,
): void {
  const projects = state.projects || [];
  const selected = projects[state.selectedProjectIndex || 0];

  let infoContent = `{${BLESSED_COLORS.muted}-fg}No projects{/}`;

  if (selected) {
    const parts: string[] = [`{${BLESSED_COLORS.shell}-fg}Selected: ${selected.name}{/}`];

    if (selected.status === "running") {
      parts.push(`{${BLESSED_COLORS.warning}-fg}● Running{/}`);
    } else if (selected.status === "completed") {
      parts.push(`{${BLESSED_COLORS.success}-fg}✓ Complete{/}`);
    } else if (selected.status === "blocked") {
      parts.push(`{${BLESSED_COLORS.error}-fg}✕ Blocked{/}`);
    } else {
      parts.push(`{${BLESSED_COLORS.muted}-fg}○ Idle{/}`);
    }

    if (selected.iteration !== null) {
      parts.push(`{${BLESSED_COLORS.muted}-fg}Iter ${selected.iteration}/∞{/}`);
    }

    infoContent = parts.join(` {${BLESSED_COLORS.dimmed}-fg}│{/} `);
  }

  const keysContent = `{${BLESSED_COLORS.muted}-fg}↑↓ Navigate │ Enter Open │ Space Expand │ n New │ d Delete │ r Refresh │ ?{/}`;

  footer.setContent(`${infoContent}\n${keysContent}`);
}
