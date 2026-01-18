/**
 * Project Detail Screen
 * Displays project information with 5 tabs: Overview, Tasks, Logs, History, Config
 */

import { theme, progressBar, providerBadge, complexityBadge } from "../../theme/theme.js";
import type { ProjectInfo } from "../../utils/project-status.js";
import { formatRelativeTime } from "../../utils/project-status.js";
import type { AppState, DetailTabName } from "../state.js";
import { DETAIL_TABS } from "../state.js";
import type { Phase, Task } from "../../components/TaskList.js";
import * as fs from "fs";
import * as path from "path";

interface RenderOptions {
  width: number;
  height: number;
}

// Tab bar
const DETAIL_TAB_NAMES: Record<DetailTabName, string> = {
  overview: "Overview",
  tasks: "Tasks",
  logs: "Logs",
  history: "History",
  config: "Config",
};

/**
 * Render tab bar for project detail
 */
function renderTabBar(activeTab: DetailTabName): string {
  const items: string[] = [];
  for (let i = 0; i < DETAIL_TABS.length; i++) {
    const tab = DETAIL_TABS[i];
    const label = DETAIL_TAB_NAMES[tab];
    const num = `${i + 1}`;

    if (tab === activeTab) {
      items.push(theme.accent(`[${num}] ${label}`));
    } else {
      items.push(theme.muted(`[${num}] ${label}`));
    }
  }

  return "\n  " + items.join(" │ ") + "\n";
}

/**
 * Load all phases from project
 */
function loadPhases(projectDir: string): Phase[] {
  const specsDir = path.join(projectDir, ".project", "specs", "tasks");
  const phases: Phase[] = [];

  try {
    const files = fs
      .readdirSync(specsDir)
      .filter((f: string) => f.startsWith("phase-") && f.endsWith(".json"));

    // Sort by phase number
    files.sort((a: string, b: string) => {
      const aNum = parseInt(a.match(/phase-(\d+)/)?.[1] || "0", 10);
      const bNum = parseInt(b.match(/phase-(\d+)/)?.[1] || "0", 10);
      return aNum - bNum;
    });

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(specsDir, file), "utf-8");
        const phase: Phase = JSON.parse(content);
        phases.push(phase);
      } catch {
        // Skip invalid phase files
      }
    }
  } catch {
    // No tasks directory
  }

  return phases;
}

/**
 * Tab 1: Overview
 */
function renderOverview(project: ProjectInfo): string[] {
  const lines: string[] = [];

  lines.push("");

  // Status row
  const statusIcon =
    project.status === "running"
      ? theme.warning("● Running")
      : project.status === "completed"
        ? theme.success("✓ Complete")
        : project.status === "blocked"
          ? theme.error("✕ Blocked")
          : theme.muted("○ Idle");

  lines.push(
    `  ${theme.text("STATUS:").padEnd(14)} ${statusIcon.padEnd(20)} ${theme.text("PROVIDER:").padEnd(14)} ${project.provider ? providerBadge(project.provider) : theme.muted("-")}`,
  );

  // Iteration row
  const iter = project.iteration !== null ? `${project.iteration} of ∞` : "0 of ∞";
  lines.push(
    `  ${theme.text("ITERATION:").padEnd(14)} ${theme.muted(iter).padEnd(20)} ${theme.text("STARTED:").padEnd(14)} ${theme.muted(formatRelativeTime(project.lastActivity))}`,
  );

  lines.push("");
  lines.push(
    `  ${theme.header("PROGRESS ─────────────────────────────────────────────────────────────")}`,
  );

  // Task progress
  if (project.taskProgress && project.taskProgress.total > 0) {
    const { completed, total, currentPhase } = project.taskProgress;
    const bar = progressBar(completed, total, 30);

    lines.push(
      `  ${theme.text("Overall:")} ${bar} ${theme.muted(`(${completed}/${total} tasks)`)}`,
    );
    lines.push("");
    lines.push(`  ${theme.text("Current Phase:")} ${theme.info(currentPhase)}`);
  } else {
    lines.push(`  ${theme.muted("No task progress data available")}`);
  }

  lines.push("");
  lines.push(
    `  ${theme.header("PHASES ────────────────────────────────────────────────────────────────")}`,
  );

  // Load phases for detailed progress
  const phases = loadPhases(project.path);
  for (const phase of phases) {
    const completed = phase.tasks.filter((t) => t.status === "completed").length;
    const total = phase.tasks.length;
    const bar = progressBar(completed, total, 25);

    const isCurrent = project.taskProgress?.currentPhase === phase.name;
    const currentMark = isCurrent ? theme.warning(" ◄ current") : "";

    lines.push(
      `  ${theme.text(`Phase ${phase.phase}:`)} ${bar} ${theme.muted(`(${completed}/${total})`)} ${currentMark}`,
    );
  }

  lines.push("");
  lines.push(
    `  ${theme.header("CURRENT TASK ──────────────────────────────────────────────────────────")}`,
  );

  // Find current task from phases
  let currentTask: Task | undefined;
  for (const phase of phases) {
    const active = phase.tasks.find((t) => t.status === "in_progress");
    if (active) {
      currentTask = active;
      break;
    }
  }

  if (currentTask) {
    lines.push(`  ${theme.text(`Task ${currentTask.id}:`)} ${theme.info(currentTask.name)}`);
    lines.push(
      `  ${theme.text("Provider:")} ${providerBadge(currentTask.provider)}  ${theme.text("Complexity:")} ${complexityBadge(currentTask.complexity)}  ${theme.text("Status:")} ${theme.warning("in_progress")}`,
    );
  } else {
    lines.push(`  ${theme.muted("No active task")}`);
  }

  return lines;
}

/**
 * Tab 2: Tasks
 */
function renderTasks(project: ProjectInfo, state: AppState): string[] {
  const lines: string[] = [];

  // Filter bar
  const filter = state.taskFilter || { status: "all", phase: "all", provider: "all" };
  lines.push("");
  lines.push(
    `  Filter: [${theme.text(filter.status.toUpperCase())}▼]  Phase: [${theme.text(filter.phase.toUpperCase())}▼]  Provider: [${theme.text(filter.provider.toUpperCase())}▼]`,
  );
  lines.push("");

  const phases = loadPhases(project.path);
  let totalShown = 0;

  for (const phase of phases) {
    let tasks = phase.tasks;

    // Apply filters
    if (filter.status !== "all") {
      tasks = tasks.filter((t) => t.status === filter.status);
    }
    if (filter.provider !== "all") {
      tasks = tasks.filter((t) => t.provider === filter.provider);
    }

    if (tasks.length === 0) continue;

    totalShown += tasks.length;

    const completed = phase.tasks.filter((t) => t.status === "completed").length;
    const total = phase.tasks.length;
    const bar = progressBar(completed, total, 8);

    lines.push(
      `  ${theme.header(`PHASE ${phase.phase}: ${phase.name.toUpperCase()}`)} ${bar} ${theme.muted(`${completed}/${total}`)}`,
    );
    lines.push(`  ${theme.dimmed("─".repeat(70))}`);

    for (const task of tasks) {
      const statusIcon =
        task.status === "completed"
          ? theme.success("●")
          : task.status === "in_progress"
            ? theme.warning("◐")
            : task.status === "blocked"
              ? theme.error("✕")
              : theme.muted("○");

      const isSelected =
        state.selectedTaskIndex !== undefined &&
        state.selectedTaskIndex === phase.tasks.indexOf(task);

      const prefix = isSelected ? theme.primary("▶") : " ";

      lines.push(
        `  ${prefix} ${statusIcon} ${theme.muted(`[${task.id}]`)} ${theme.text(task.name)} ${providerBadge(task.provider)} ${complexityBadge(task.complexity)}`,
      );
    }

    lines.push("");
  }

  if (totalShown === 0) {
    lines.push(`  ${theme.muted("No tasks match the current filter.")}`);
    lines.push("");
  }

  return lines;
}

/**
 * Tab 3: Logs
 */
function renderLogs(project: ProjectInfo, state: AppState): string[] {
  const lines: string[] = [];

  const logBuffer = state.logBuffer || [];

  if (logBuffer.length === 0) {
    lines.push("");
    lines.push(`  ${theme.muted("(waiting for logs...)")}`);
    lines.push("");
    lines.push(`  ${theme.muted("Logs will appear here when the project is running.")}`);
    lines.push("");
    return lines;
  }

  // Show last N lines
  const maxLines = 30;
  const start = Math.max(0, logBuffer.length - maxLines);
  const visibleLines = logBuffer.slice(start);

  lines.push("");
  for (const line of visibleLines) {
    lines.push(`  ${line}`);
  }
  lines.push("");

  return lines;
}

/**
 * Tab 4: History
 */
function renderHistory(project: ProjectInfo, state: AppState): string[] {
  const lines: string[] = [];

  // Get iterations
  const logsDir = path.join(project.path, "logs");
  const iterations: Array<{ number: number; duration?: number; exitCode?: number }> = [];

  try {
    const entries = fs.readdirSync(logsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const match = entry.name.match(/^iteration_(\d+)$/);
      if (!match) continue;

      const number = parseInt(match[1], 10);
      const iterationDir = path.join(logsDir, entry.name);

      let duration: number | undefined;
      const durationPath = path.join(iterationDir, "duration.json");
      if (fs.existsSync(durationPath)) {
        try {
          const content = fs.readFileSync(durationPath, "utf-8");
          duration = JSON.parse(content).seconds;
        } catch {
          // Ignore
        }
      }

      let exitCode: number | undefined;
      const exitCodePath = path.join(iterationDir, "exit_code");
      if (fs.existsSync(exitCodePath)) {
        try {
          const content = fs.readFileSync(exitCodePath, "utf-8");
          exitCode = parseInt(content.trim(), 10);
        } catch {
          // Ignore
        }
      }

      iterations.push({ number, duration, exitCode });
    }
  } catch {
    // No logs directory
  }

  // Sort by iteration number descending
  iterations.sort((a, b) => b.number - a.number);

  lines.push("");
  lines.push(
    `  ${theme.muted("#".padStart(4))}  ${theme.text("STATUS").padEnd(12)} ${theme.text("DURATION").padEnd(12)} ${theme.text("STARTED")}`,
  );
  lines.push(`  ${theme.dimmed("─".repeat(60))}`);

  if (iterations.length === 0) {
    lines.push(`  ${theme.muted("No iterations yet.")}`);
    lines.push("");
    return lines;
  }

  for (let i = 0; i < iterations.length; i++) {
    const iter = iterations[i];
    const isSelected = i === (state.selectedIterationIndex || 0);
    const prefix = isSelected ? theme.primary("▶") : " ";

    let status: string;
    let statusColor: typeof theme.warning;
    if (iter.number === project.iteration && project.status === "running") {
      status = "Running";
      statusColor = theme.warning;
    } else if (iter.exitCode === 0) {
      status = "Pass";
      statusColor = theme.success;
    } else if (iter.exitCode === undefined) {
      status = "Unknown";
      statusColor = theme.muted;
    } else {
      status = "Fail";
      statusColor = theme.error;
    }

    const duration =
      iter.duration !== undefined
        ? `${Math.floor(iter.duration / 60)}m ${Math.round(iter.duration % 60)}s`
        : "-";

    lines.push(
      ` ${prefix} ${theme.muted(String(iter.number).padStart(3))}  ${statusColor(status.padEnd(10))} ${theme.muted(duration.padEnd(12))} ${theme.muted(formatRelativeTime(project.lastActivity))}`,
    );
  }

  lines.push("");
  lines.push(`  ${theme.header("ITERATION DETAILS")}`);
  lines.push(`  ${theme.dimmed("─".repeat(60))}`);

  const selectedIter = iterations[state.selectedIterationIndex || 0];
  if (selectedIter) {
    lines.push(`  ${theme.text("Iteration:")} ${theme.primary(String(selectedIter.number))}`);
    lines.push(
      `  ${theme.text("Duration:")} ${theme.muted(selectedIter.duration ? `${selectedIter.duration}s` : "Unknown")}`,
    );
    lines.push(
      `  ${theme.text("Exit Code:")} ${selectedIter.exitCode !== undefined ? (selectedIter.exitCode === 0 ? theme.success("0") : theme.error(String(selectedIter.exitCode))) : theme.muted("-")}`,
    );
  }

  return lines;
}

/**
 * Tab 5: Config (read-only)
 */
function renderConfig(project: ProjectInfo): string[] {
  const lines: string[] = [];

  // Load config
  let config: any = null;
  const configPath = path.join(project.path, "config.json");
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, "utf-8");
      config = JSON.parse(content);
    } catch {
      // Invalid config
    }
  }

  if (!config) {
    lines.push("");
    lines.push(`  ${theme.error("Unable to load project configuration.")}`);
    lines.push("");
    return lines;
  }

  lines.push("");
  lines.push(`  ${theme.header("PROJECT")}`);
  lines.push(`  ${theme.text("Name:")} ${theme.primary(config.name || project.name)}`);
  lines.push(
    `  ${theme.text("Description:")} ${theme.muted(config.description || project.description)}`,
  );
  lines.push("");

  lines.push(`  ${theme.header("BUILDER")}`);
  lines.push(
    `  ${theme.text("Backend:")} ${theme.info(config.builder?.backend || project.provider || "-")}`,
  );
  lines.push(`  ${theme.text("Auth Mode:")} ${theme.muted(config.builder?.auth_mode || "-")}`);
  lines.push(
    `  ${theme.text("Model:")} ${theme.muted(config.builder?.model || project.model || "-")}`,
  );
  lines.push(`  ${theme.text("Session:")} ${theme.muted(config.builder?.session_mode || "-")}`);
  lines.push("");

  lines.push(`  ${theme.header("REVIEWER")}`);
  if (config.reviewer?.enabled) {
    lines.push(`  ${theme.text("Enabled:")} ${theme.success("Yes")}`);
    lines.push(`  ${theme.text("Backend:")} ${theme.info(config.reviewer.backend || "-")}`);
    lines.push(`  ${theme.text("Model:")} ${theme.muted(config.reviewer.model || "-")}`);
  } else {
    lines.push(`  ${theme.text("Enabled:")} ${theme.muted("No")}`);
  }
  lines.push("");

  lines.push(`  ${theme.header("LOOP SETTINGS")}`);
  lines.push(
    `  ${theme.text("Max Iterations:")} ${theme.muted(config.max_iterations === 0 ? "∞ (unlimited)" : String(config.max_iterations))}`,
  );
  lines.push(
    `  ${theme.text("Completion Detection:")} ${config.completion_enabled ? theme.success("Yes") : theme.muted("No")}`,
  );
  lines.push(
    `  ${theme.text("Escalation:")} ${config.escalation?.enabled ? theme.success("Yes") : theme.muted("No")}`,
  );
  lines.push("");

  lines.push(`  ${theme.info("Press Enter or 'e' to edit config")}`);
  lines.push("");

  return lines;
}

/**
 * Render the project detail screen
 */
export function renderProjectDetailScreen(state: AppState, options: RenderOptions): string[] {
  const project = state.selectedProject;

  if (!project) {
    return [
      "",
      `  ${theme.error("No project selected")}`,
      "",
      "  Press Esc to return to projects list",
      "",
    ];
  }

  const activeTab = state.detailTab || "overview";
  const lines: string[] = [];

  // Tab bar
  lines.push(renderTabBar(activeTab));

  // Content based on active tab
  switch (activeTab) {
    case "overview":
      lines.push(...renderOverview(project));
      break;
    case "tasks":
      lines.push(...renderTasks(project, state));
      break;
    case "logs":
      lines.push(...renderLogs(project, state));
      break;
    case "history":
      lines.push(...renderHistory(project, state));
      break;
    case "config":
      lines.push(...renderConfig(project));
      break;
  }

  return lines;
}

/**
 * Get footer info line for project detail
 */
export function getProjectDetailFooterInfo(state: AppState): string {
  const project = state.selectedProject;
  if (!project) {
    return theme.muted("No project selected");
  }

  const parts: string[] = [];

  // Status indicator
  if (project.status === "running") {
    parts.push(theme.warning("● Running"));
  } else if (project.status === "completed") {
    parts.push(theme.success("✓ Complete"));
  } else if (project.status === "blocked") {
    parts.push(theme.error("✕ Blocked"));
  } else {
    parts.push(theme.muted("○ Idle"));
  }

  // Iteration
  if (project.iteration !== null) {
    parts.push(theme.muted(`Iter ${project.iteration}/∞`));
  }

  // Task progress
  if (project.taskProgress) {
    const { completed, total } = project.taskProgress;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    parts.push(theme.muted(`${completed}/${total} tasks`));
  }

  // Last update
  parts.push(theme.muted(`Updated: ${formatRelativeTime(project.lastActivity)}`));

  return parts.join(theme.dimmed(" │ "));
}

/**
 * Get footer keyboard shortcuts for project detail
 */
export function getProjectDetailFooterKeys(activeTab: DetailTabName): string {
  const baseKeys = "1-5 Tabs │ ←→ Tab │ Esc Back │ ?";

  switch (activeTab) {
    case "overview":
      return theme.muted(`${baseKeys} │ r Refresh`);
    case "tasks":
      return theme.muted(`${baseKeys} │ ↑↓ Navigate │ f Filter │ Enter Details`);
    case "logs":
      return theme.muted(`${baseKeys} │ ↑↓ Scroll │ a Auto-scroll`);
    case "history":
      return theme.muted(`${baseKeys} │ ↑↓ Select │ Enter Logs`);
    case "config":
      return theme.muted(`${baseKeys} │ Enter/e Edit`);
    default:
      return theme.muted(baseKeys);
  }
}

/**
 * Find selected task from state
 */
function findSelectedTask(project: ProjectInfo, state: AppState): Task | null {
  if (state.selectedTaskIndex === undefined) {
    return null;
  }

  const phases = loadPhases(project.path);
  let currentIndex = 0;

  for (const phase of phases) {
    for (const task of phase.tasks) {
      if (currentIndex === state.selectedTaskIndex) {
        return task;
      }
      currentIndex++;
    }
  }

  return null;
}

/**
 * Render task detail modal
 */
export function renderTaskDetailModal(project: ProjectInfo, state: AppState): string[] {
  const lines: string[] = [];

  const task = findSelectedTask(project, state);

  if (!task) {
    lines.push("");
    lines.push(`  ${theme.error("No task selected")}`);
    lines.push("");
    return lines;
  }

  lines.push("");
  lines.push(
    `  ${theme.dimmed("╔═══════════════════════════════════════════════════════════════════════════╗")}`,
  );
  lines.push(
    `  ${theme.dimmed("║")} ${theme.header(`TASK ${task.id}: ${task.name}`).padEnd(73)} ${theme.dimmed("║")}`,
  );
  lines.push(
    `  ${theme.dimmed("╠═══════════════════════════════════════════════════════════════════════════╣")}`,
  );

  // Status and metadata
  const statusColor =
    task.status === "completed"
      ? theme.success
      : task.status === "in_progress"
        ? theme.warning
        : task.status === "blocked"
          ? theme.error
          : theme.muted;

  lines.push(
    `  ${theme.dimmed("║")} ${theme.text("Status:").padEnd(20)} ${statusColor(task.status.toUpperCase()).padEnd(53)} ${theme.dimmed("║")}`,
  );
  lines.push(
    `  ${theme.dimmed("║")} ${theme.text("Provider:").padEnd(20)} ${providerBadge(task.provider).padEnd(53)} ${theme.dimmed("║")}`,
  );
  lines.push(
    `  ${theme.dimmed("║")} ${theme.text("Complexity:").padEnd(20)} ${complexityBadge(task.complexity).padEnd(53)} ${theme.dimmed("║")}`,
  );
  lines.push(
    `  ${theme.dimmed("╠───────────────────────────────────────────────────────────────────────────╣")}`,
  );

  // Description
  const descLines = task.description.split("\n");
  for (const descLine of descLines) {
    lines.push(`  ${theme.dimmed("║")} ${theme.text(descLine).padEnd(73)} ${theme.dimmed("║")}`);
  }

  lines.push(
    `  ${theme.dimmed("╠───────────────────────────────────────────────────────────────────────────╣")}`,
  );

  // Additional info
  lines.push(
    `  ${theme.dimmed("║")} ${theme.text("Dependencies:").padEnd(20)} ${theme.muted(task.depends_on.length > 0 ? task.depends_on.join(", ") : "None").padEnd(53)} ${theme.dimmed("║")}`,
  );

  if (task.acceptance_criteria && task.acceptance_criteria.length > 0) {
    lines.push(
      `  ${theme.dimmed("╠───────────────────────────────────────────────────────────────────────────╣")}`,
    );
    lines.push(
      `  ${theme.dimmed("║")} ${theme.header("Acceptance Criteria:").padEnd(73)} ${theme.dimmed("║")}`,
    );
    for (const criteria of task.acceptance_criteria) {
      lines.push(
        `  ${theme.dimmed("║")}   ${theme.muted("•").padEnd(3)} ${theme.text(criteria).padEnd(68)} ${theme.dimmed("║")}`,
      );
    }
  }

  if (task.files_to_create && task.files_to_create.length > 0) {
    lines.push(
      `  ${theme.dimmed("╠───────────────────────────────────────────────────────────────────────────╣")}`,
    );
    lines.push(
      `  ${theme.dimmed("║")} ${theme.header("Files to Create:").padEnd(73)} ${theme.dimmed("║")}`,
    );
    for (const file of task.files_to_create) {
      lines.push(
        `  ${theme.dimmed("║")}   ${theme.muted("•").padEnd(3)} ${theme.info(file).padEnd(68)} ${theme.dimmed("║")}`,
      );
    }
  }

  if (task.files_to_modify && task.files_to_modify.length > 0) {
    lines.push(
      `  ${theme.dimmed("╠───────────────────────────────────────────────────────────────────────────╣")}`,
    );
    lines.push(
      `  ${theme.dimmed("║")} ${theme.header("Files to Modify:").padEnd(73)} ${theme.dimmed("║")}`,
    );
    for (const file of task.files_to_modify) {
      lines.push(
        `  ${theme.dimmed("║")}   ${theme.muted("•").padEnd(3)} ${theme.warning(file).padEnd(68)} ${theme.dimmed("║")}`,
      );
    }
  }

  lines.push(
    `  ${theme.dimmed("╠───────────────────────────────────────────────────────────────────────────╣")}`,
  );
  lines.push(
    `  ${theme.dimmed("║")} ${theme.muted("Press Enter or Esc to close").padEnd(73)} ${theme.dimmed("║")}`,
  );
  lines.push(
    `  ${theme.dimmed("╚═══════════════════════════════════════════════════════════════════════════╝")}`,
  );
  lines.push("");

  return lines;
}
