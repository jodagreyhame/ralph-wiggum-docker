/**
 * Projects List Screen
 * Displays all projects in compact or expanded mode
 */

import { theme, progressBar, providerBadge } from "../../theme/theme.js";
import type { ProjectInfo } from "../../utils/project-status.js";
import { formatRelativeTime } from "../../utils/project-status.js";
import type { AppState, ListViewMode } from "../state.js";

interface RenderOptions {
  width: number;
  height: number;
}

/**
 * Get status icon and color
 */
function getStatusIcon(status: ProjectInfo["status"]): string {
  switch (status) {
    case "running":
      return theme.warning("●");
    case "completed":
      return theme.success("✓");
    case "blocked":
      return theme.error("✕");
    case "idle":
    default:
      return theme.muted("○");
  }
}

/**
 * Render compact project list (one line per project)
 */
function renderCompactMode(
  projects: ProjectInfo[],
  selectedIndex: number,
  options: RenderOptions,
): string[] {
  const lines: string[] = [];

  // Header
  lines.push("");
  lines.push(
    theme.header("   #   PROJECT                STATUS      ITER    PROGRESS    UPDATED        "),
  );
  lines.push(theme.dimmed("   " + "─".repeat(74)));

  // Projects
  if (projects.length === 0) {
    lines.push("");
    lines.push(theme.muted("               No projects found"));
    lines.push("");
    lines.push(theme.muted("         Press 'n' to create your first project"));
    lines.push("");
    return lines;
  }

  for (let i = 0; i < projects.length; i++) {
    const p = projects[i];
    const isSelected = i === selectedIndex;
    const prefix = isSelected ? theme.primary("▶") : " ";
    const num = theme.muted(String(i + 1).padStart(3));

    // Truncate name to fit
    const name = p.name.length > 20 ? p.name.substring(0, 17) + "..." : p.name;
    const nameCol = isSelected ? theme.primary(name.padEnd(20)) : name.padEnd(20);

    const statusIcon = getStatusIcon(p.status);
    const statusText = p.status.charAt(0).toUpperCase() + p.status.slice(1);
    const statusCol = statusIcon + " " + theme.text(statusText.padEnd(8));

    const iter = p.iteration !== null ? `${p.iteration}/∞` : "0/∞";
    const iterCol = theme.muted(iter.padEnd(6));

    // Progress bar
    let progressCol = "    -    ";
    if (p.taskProgress) {
      const percent =
        p.taskProgress.total > 0
          ? Math.round((p.taskProgress.completed / p.taskProgress.total) * 100)
          : 0;
      const barWidth = 8;
      const filled = Math.round(barWidth * (percent / 100));
      const bar = theme.success("█".repeat(filled)) + theme.dimmed("░".repeat(barWidth - filled));
      progressCol = `${bar} ${percent}%`.padEnd(11);
    }

    const timeCol = theme.muted(formatRelativeTime(p.lastActivity).padEnd(8));

    lines.push(` ${prefix} ${num}   ${nameCol} ${statusCol} ${iterCol} ${progressCol} ${timeCol}`);
  }

  return lines;
}

/**
 * Render expanded project list (two lines per project)
 */
function renderExpandedMode(
  projects: ProjectInfo[],
  selectedIndex: number,
  options: RenderOptions,
): string[] {
  const lines: string[] = [];

  // Header
  lines.push("");
  lines.push(
    theme.header("   #   PROJECT           DESCRIPTION              STATUS     ITER   PROVIDER   "),
  );
  lines.push(theme.dimmed("   " + "─".repeat(78)));

  if (projects.length === 0) {
    lines.push("");
    lines.push(theme.muted("               No projects found"));
    lines.push("");
    lines.push(theme.muted("         Press 'n' to create your first project"));
    lines.push("");
    return lines;
  }

  for (let i = 0; i < projects.length; i++) {
    const p = projects[i];
    const isSelected = i === selectedIndex;
    const prefix = isSelected ? theme.primary("▶") : " ";
    const num = theme.muted(String(i + 1).padStart(3));

    // Truncate name and description
    const name = p.name.length > 16 ? p.name.substring(0, 13) + "..." : p.name;
    const nameCol = isSelected ? theme.primary(name.padEnd(16)) : name.padEnd(16);

    const desc = p.description.length > 24 ? p.description.substring(0, 21) + "..." : p.description;
    const descCol = theme.muted(desc.padEnd(24));

    const statusIcon = getStatusIcon(p.status);
    const statusText = p.status.charAt(0).toUpperCase() + p.status.slice(1);
    const statusCol = statusIcon + " " + theme.text(statusText.padEnd(8));

    const iter = p.iteration !== null ? `${p.iteration}/∞` : "0/∞";
    const iterCol = theme.muted(iter.padEnd(6));

    const providerCol = p.provider ? providerBadge(p.provider) : theme.muted("-");

    // First line
    lines.push(` ${prefix} ${num}   ${nameCol} ${descCol} ${statusCol} ${iterCol} ${providerCol}`);

    // Second line with task progress
    if (p.taskProgress && p.taskProgress.total > 0) {
      const percent = Math.round((p.taskProgress.completed / p.taskProgress.total) * 100);
      const barWidth = 10;
      const filled = Math.round(barWidth * (percent / 100));
      const bar = theme.success("█".repeat(filled)) + theme.dimmed("░".repeat(barWidth - filled));
      const tasksStr = `Tasks: ${p.taskProgress.completed}/${p.taskProgress.total} (${percent}%)`;
      const phaseStr = `Phase: ${p.taskProgress.currentPhase}`;
      lines.push(
        `       ${theme.dimmed("│")}   ${bar} ${theme.text(tasksStr)}  │  ${theme.muted(phaseStr)}`,
      );
    } else {
      lines.push(`       ${theme.dimmed("│")}   ${theme.muted("No task progress data")}`);
    }

    if (i < projects.length - 1) {
      lines.push(theme.dimmed("   " + "─".repeat(78)));
    }
  }

  return lines;
}

/**
 * Render stats bar for header
 */
function renderStatsBar(projects: ProjectInfo[], viewMode: ListViewMode): string {
  const total = projects.length;
  const running = projects.filter((p) => p.status === "running").length;
  const completed = projects.filter((p) => p.status === "completed").length;
  const idle = projects.filter((p) => p.status === "idle").length;
  const blocked = projects.filter((p) => p.status === "blocked").length;

  const parts: string[] = [theme.primary(`${total} Projects`)];

  if (running > 0) {
    parts.push(theme.warning(`● ${running} Running`));
  }
  if (completed > 0) {
    parts.push(theme.success(`✓ ${completed} Complete`));
  }
  if (idle > 0) {
    parts.push(theme.muted(`○ ${idle} Idle`));
  }
  if (blocked > 0) {
    parts.push(theme.error(`✕ ${blocked} Blocked`));
  }

  if (viewMode === "expanded") {
    parts.push(theme.info("[Expanded]"));
  }

  return parts.join(theme.dimmed(" │ "));
}

/**
 * Render the projects list screen
 */
export function renderProjectListScreen(state: AppState, options: RenderOptions): string[] {
  const projects = state.projects || [];
  const selectedIndex = state.selectedProjectIndex || 0;
  const viewMode = state.listViewMode || "compact";

  const lines: string[] = [];

  // Stats bar
  lines.push(renderStatsBar(projects, viewMode));

  // Content based on view mode
  if (viewMode === "compact") {
    lines.push(...renderCompactMode(projects, selectedIndex, options));
  } else {
    lines.push(...renderExpandedMode(projects, selectedIndex, options));
  }

  return lines;
}

/**
 * Get footer info line for projects list
 */
export function getProjectListFooterInfo(state: AppState): string {
  const projects = state.projects || [];
  const selected = projects[state.selectedProjectIndex || 0];

  if (!selected) {
    return theme.muted("No projects");
  }

  const parts: string[] = [theme.primary(`Selected: ${selected.name}`)];

  if (selected.status === "running") {
    parts.push(theme.warning("● Running"));
  } else if (selected.status === "completed") {
    parts.push(theme.success("✓ Complete"));
  } else if (selected.status === "blocked") {
    parts.push(theme.error("✕ Blocked"));
  } else {
    parts.push(theme.muted("○ Idle"));
  }

  if (selected.iteration !== null) {
    parts.push(theme.muted(`Iter ${selected.iteration}/∞`));
  }

  return parts.join(theme.dimmed(" │ "));
}

/**
 * Get footer keyboard shortcuts for projects list
 */
export function getProjectListFooterKeys(): string {
  return theme.muted("↑↓ Navigate │ Enter Open │ Space Expand │ n New │ d Delete │ r Refresh │ ?");
}
