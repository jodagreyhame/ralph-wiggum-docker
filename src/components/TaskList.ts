/**
 * TaskList component - Displays tasks with status badges
 */

import { theme, statusBadge, providerBadge, complexityBadge, createBox } from "../theme/theme.js";

export interface Task {
  id: string;
  name: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "blocked";
  provider: string;
  complexity: "S" | "M" | "L";
  depends_on: string[];
  acceptance_criteria?: string[];
  files_to_create?: string[];
  files_to_modify?: string[];
  blocked_reason?: string;
}

export interface Phase {
  phase: number;
  name: string;
  description: string;
  tasks: Task[];
}

interface TaskListOptions {
  showDescription?: boolean;
  filterStatus?: Task["status"] | "all";
  maxTasks?: number;
}

/**
 * Render a single task as a formatted line
 */
export function renderTaskLine(task: Task, options: TaskListOptions = {}): string {
  const statusIcon = getStatusIcon(task.status);
  const id = theme.muted(`[${task.id}]`);
  const name = task.status === "completed" ? theme.muted(task.name) : theme.text(task.name);
  const provider = providerBadge(task.provider);
  const complexity = complexityBadge(task.complexity);

  let line = `${statusIcon} ${id} ${name} ${provider} ${complexity}`;

  if (task.status === "blocked" && task.blocked_reason) {
    line += `\n   ${theme.error("↳ " + task.blocked_reason)}`;
  }

  if (options.showDescription) {
    line += `\n   ${theme.dimmed(task.description)}`;
  }

  return line;
}

/**
 * Get status icon with color
 */
function getStatusIcon(status: Task["status"]): string {
  switch (status) {
    case "pending":
      return theme.muted("○");
    case "in_progress":
      return theme.warning("◐");
    case "completed":
      return theme.success("●");
    case "blocked":
      return theme.error("✕");
    default:
      return theme.muted("?");
  }
}

/**
 * Render a full task list for a phase
 */
export function renderTaskList(phase: Phase, options: TaskListOptions = {}): string {
  const { filterStatus = "all", maxTasks } = options;

  let tasks = phase.tasks;

  // Filter by status
  if (filterStatus !== "all") {
    tasks = tasks.filter((t) => t.status === filterStatus);
  }

  // Limit number of tasks
  if (maxTasks && tasks.length > maxTasks) {
    tasks = tasks.slice(0, maxTasks);
  }

  const lines = tasks.map((task) => renderTaskLine(task, options));

  // Phase header with progress
  const completed = phase.tasks.filter((t) => t.status === "completed").length;
  const total = phase.tasks.length;
  const progress = `(${completed}/${total})`;

  const header = `Phase ${phase.phase}: ${phase.name} ${theme.muted(progress)}`;

  return `${theme.header(header)}\n${lines.join("\n")}`;
}

/**
 * Render task list in a box
 */
export function renderTaskListBox(phase: Phase, options: TaskListOptions = {}): string {
  const { filterStatus = "all", maxTasks } = options;

  let tasks = phase.tasks;

  if (filterStatus !== "all") {
    tasks = tasks.filter((t) => t.status === filterStatus);
  }

  if (maxTasks && tasks.length > maxTasks) {
    tasks = tasks.slice(0, maxTasks);
  }

  const lines = tasks.map((task) => " " + renderTaskLine(task, { showDescription: false }));

  const completed = phase.tasks.filter((t) => t.status === "completed").length;
  const total = phase.tasks.length;
  const title = `Phase ${phase.phase}: ${phase.name} (${completed}/${total})`;

  return createBox(lines, title, 70);
}

/**
 * Render compact task summary
 */
export function renderTaskSummary(tasks: Task[]): string {
  const pending = tasks.filter((t) => t.status === "pending").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const blocked = tasks.filter((t) => t.status === "blocked").length;

  return [
    theme.muted(`○ ${pending} pending`),
    theme.warning(`◐ ${inProgress} in progress`),
    theme.success(`● ${completed} completed`),
    blocked > 0 ? theme.error(`✕ ${blocked} blocked`) : "",
  ]
    .filter(Boolean)
    .join("  ");
}
