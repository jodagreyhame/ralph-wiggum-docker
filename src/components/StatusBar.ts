/**
 * StatusBar component - Bottom status bar with project info
 */

import { theme, statusBadge, providerBadge } from "../theme/theme.js";
import { renderMiniProgress } from "./ProgressBar.js";

export interface StatusInfo {
  project: string;
  iteration?: number;
  cli?: string;
  status?: "running" | "complete" | "error" | "idle";
  currentTask?: string;
  totalTasks?: number;
  completedTasks?: number;
}

/**
 * Render the status bar
 */
export function renderStatusBar(
  info: StatusInfo,
  width: number = process.stdout.columns || 80,
): string {
  const parts: string[] = [];

  // Project name
  parts.push(theme.primary(`📁 ${info.project}`));

  // Iteration number
  if (info.iteration !== undefined) {
    parts.push(theme.muted(`#${info.iteration}`));
  }

  // CLI provider
  if (info.cli) {
    parts.push(providerBadge(info.cli));
  }

  // Current task
  if (info.currentTask) {
    parts.push(theme.info(`🎯 ${info.currentTask}`));
  }

  // Progress
  if (info.totalTasks !== undefined && info.completedTasks !== undefined) {
    parts.push(renderMiniProgress(info.completedTasks, info.totalTasks));
  }

  // Status indicator
  if (info.status) {
    parts.push(renderStatusIndicator(info.status));
  }

  // Join parts with separator
  const separator = theme.dimmed(" │ ");
  const content = parts.join(separator);

  // Create full-width bar
  const bgColor = "\x1b[48;2;31;41;55m"; // surface color
  const reset = "\x1b[0m";

  return `${bgColor}${content}${" ".repeat(Math.max(0, width - stripAnsi(content).length))}${reset}`;
}

/**
 * Render status indicator
 */
function renderStatusIndicator(status: StatusInfo["status"]): string {
  switch (status) {
    case "running":
      return theme.warning("⟳ Running");
    case "complete":
      return theme.success("✓ Complete");
    case "error":
      return theme.error("✕ Error");
    case "idle":
    default:
      return theme.muted("◯ Idle");
  }
}

/**
 * Render a compact status line
 */
export function renderCompactStatus(info: StatusInfo): string {
  const parts: string[] = [];

  parts.push(theme.primary(info.project));

  if (info.iteration !== undefined) {
    parts.push(theme.muted(`iter:${info.iteration}`));
  }

  if (info.currentTask) {
    parts.push(theme.info(`task:${info.currentTask}`));
  }

  if (info.totalTasks !== undefined && info.completedTasks !== undefined) {
    const percent = Math.round((info.completedTasks / info.totalTasks) * 100);
    parts.push(theme.success(`${percent}%`));
  }

  return parts.join(" ");
}

/**
 * Strip ANSI codes for length calculation
 */
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}
