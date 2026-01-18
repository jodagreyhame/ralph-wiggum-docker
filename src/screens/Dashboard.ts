/**
 * Dashboard screen - Project overview with status and progress
 */

import * as fs from "fs";
import * as path from "path";
import { theme, createBox } from "../theme/theme.js";
import { renderAllPhasesProgress, type PhaseProgress } from "../components/ProgressBar.js";
import { renderStatusBar, type StatusInfo } from "../components/StatusBar.js";
import { renderTaskSummary, type Task, type Phase } from "../components/TaskList.js";

export interface SummaryData {
  project: string;
  total_tasks: number;
  completed_tasks: number;
  current_phase: string;
  current_task: string;
  phases: PhaseProgress[];
  by_provider?: Record<string, number>;
  by_complexity?: Record<string, number>;
}

export interface StatusData {
  iteration: number;
  status: string;
  started?: string;
  project: string;
  cli: string;
  exit_code?: number;
  seconds?: number;
}

/**
 * Load summary.json from project
 */
export function loadSummary(projectDir: string): SummaryData | null {
  const summaryPath = path.join(projectDir, ".project", "specs", "tasks", "summary.json");
  try {
    const content = fs.readFileSync(summaryPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Load status.json from project logs
 */
export function loadStatus(projectDir: string): StatusData | null {
  const statusPath = path.join(projectDir, "logs", "status.json");
  try {
    const content = fs.readFileSync(statusPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Load all tasks from phase files
 */
export function loadAllTasks(projectDir: string): Task[] {
  const specsDir = path.join(projectDir, ".project", "specs", "tasks");
  const tasks: Task[] = [];

  try {
    const files = fs
      .readdirSync(specsDir)
      .filter((f: string) => f.startsWith("phase-") && f.endsWith(".json"));
    for (const file of files) {
      const content = fs.readFileSync(path.join(specsDir, file), "utf-8");
      const phase: Phase = JSON.parse(content);
      tasks.push(...phase.tasks);
    }
  } catch {
    // No tasks found
  }

  return tasks;
}

/**
 * Render the dashboard screen
 */
export function renderDashboard(projectDir: string): string {
  const summary = loadSummary(projectDir);
  const status = loadStatus(projectDir);
  const tasks = loadAllTasks(projectDir);

  const lines: string[] = [];

  // Header
  lines.push("");
  lines.push(theme.header("═══════════════════════════════════════════════════════════"));
  lines.push(theme.header("                    RALPH TERMINAL                         "));
  lines.push(theme.header("═══════════════════════════════════════════════════════════"));
  lines.push("");

  if (!summary) {
    lines.push(theme.warning("  No task specs found in project."));
    lines.push(
      theme.muted("  Create .project/specs/tasks/phase-*.json files to enable task tracking."),
    );
    lines.push("");
  } else {
    // Project info box
    const projectInfo = [
      `  ${theme.text("Project:")} ${theme.primary(summary.project)}`,
      `  ${theme.text("Current Phase:")} ${theme.info(summary.current_phase)}`,
      `  ${theme.text("Current Task:")} ${theme.warning(summary.current_task)}`,
    ];
    lines.push(createBox(projectInfo, "Project", 60));
    lines.push("");

    // Progress section
    lines.push(renderAllPhasesProgress(summary.phases));
    lines.push("");

    // Task summary
    if (tasks.length > 0) {
      lines.push(theme.header("Task Summary"));
      lines.push("  " + renderTaskSummary(tasks));
      lines.push("");
    }

    // Provider breakdown
    if (summary.by_provider) {
      const providerLines = Object.entries(summary.by_provider)
        .map(([provider, count]) => `  ${theme.text(provider)}: ${count}`)
        .join("  ");
      lines.push(theme.subheader("By Provider: ") + providerLines);
    }

    // Complexity breakdown
    if (summary.by_complexity) {
      const complexityLines = Object.entries(summary.by_complexity)
        .map(([complexity, count]) => `  ${theme.text(complexity)}: ${count}`)
        .join("  ");
      lines.push(theme.subheader("By Complexity: ") + complexityLines);
    }
    lines.push("");
  }

  // Status bar at bottom
  if (status || summary) {
    const statusInfo: StatusInfo = {
      project: status?.project || summary?.project || path.basename(projectDir),
      iteration: status?.iteration,
      cli: status?.cli,
      status:
        status?.status === "running"
          ? "running"
          : status?.status === "complete"
            ? "complete"
            : "idle",
      currentTask: summary?.current_task,
      totalTasks: summary?.total_tasks,
      completedTasks: summary?.completed_tasks,
    };
    lines.push(renderStatusBar(statusInfo));
  }

  return lines.join("\n");
}
