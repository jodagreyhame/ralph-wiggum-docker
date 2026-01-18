/**
 * Project Status Utilities
 * Load and parse project status information for TUI dashboard
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { getProjectDir, getProjectsDir, loadProjectConfig } from "./project.js";

export interface ProjectInfo {
  name: string;
  description: string;
  status: "running" | "completed" | "idle" | "blocked";
  iteration: number | null;
  maxIterations: number;
  provider: string | null;
  model: string | null;
  lastActivity: Date | null;
  taskProgress?: {
    completed: number;
    total: number;
    currentPhase: string;
  };
  path: string;
}

interface StatusData {
  iteration: number;
  status: string;
  started?: string;
  project: string;
  cli: string;
  exit_code?: number;
  seconds?: number;
}

interface CompletionData {
  completed: boolean;
  reason?: string;
}

interface SummaryData {
  total_tasks: number;
  completed_tasks: number;
  current_phase: string;
  current_task: string;
  phases?: Array<{
    id: string;
    name: string;
    tasks: number;
    completed: number;
  }>;
}

/**
 * Load status data from logs/status.json
 */
function loadStatusData(projectDir: string): StatusData | null {
  const statusPath = path.join(projectDir, "logs", "status.json");
  try {
    const content = fs.readFileSync(statusPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Load completion data from logs/completion.json
 */
function loadCompletionData(projectDir: string): CompletionData | null {
  const completionPath = path.join(projectDir, "logs", "completion.json");
  try {
    const content = fs.readFileSync(completionPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Load summary data from .project/specs/tasks/summary.json
 */
function loadSummaryData(projectDir: string): SummaryData | null {
  const summaryPath = path.join(projectDir, ".project", "specs", "tasks", "summary.json");
  try {
    const content = fs.readFileSync(summaryPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Calculate actual task progress from phase files
 * This is more accurate than summary.json which may have stale data
 */
function calculateTaskProgress(
  projectDir: string,
  summaryData: SummaryData | null,
): ProjectInfo["taskProgress"] | undefined {
  const specsDir = path.join(projectDir, ".project", "specs", "tasks");

  try {
    const files = fs
      .readdirSync(specsDir)
      .filter((f) => f.startsWith("phase-") && f.endsWith(".json"))
      .sort();

    if (files.length === 0) {
      // No phase files, fall back to summary.json
      if (summaryData) {
        return {
          completed: summaryData.completed_tasks,
          total: summaryData.total_tasks,
          currentPhase: summaryData.current_phase,
        };
      }
      return undefined;
    }

    let totalTasks = 0;
    let completedTasks = 0;
    let currentPhase = summaryData?.current_phase || "unknown";

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(specsDir, file), "utf-8");
        const phase = JSON.parse(content);
        if (phase.tasks && Array.isArray(phase.tasks)) {
          totalTasks += phase.tasks.length;
          completedTasks += phase.tasks.filter(
            (t: { status?: string }) => t.status === "completed",
          ).length;
        }
      } catch {
        // Skip invalid phase files
      }
    }

    if (totalTasks === 0) {
      return undefined;
    }

    return {
      completed: completedTasks,
      total: totalTasks,
      currentPhase,
    };
  } catch {
    // Fall back to summary.json if we can't read phase files
    if (summaryData) {
      return {
        completed: summaryData.completed_tasks,
        total: summaryData.total_tasks,
        currentPhase: summaryData.current_phase,
      };
    }
    return undefined;
  }
}

/**
 * Get the latest log timestamp from logs directory
 */
function getLatestLogTimestamp(projectDir: string): Date | null {
  const logsDir = path.join(projectDir, "logs");
  try {
    const entries = fs.readdirSync(logsDir, { withFileTypes: true });
    let latestTime = 0;

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith("iteration_")) {
        const iterationDir = path.join(logsDir, entry.name);
        const stat = fs.statSync(iterationDir);
        if (stat.mtimeMs > latestTime) {
          latestTime = stat.mtimeMs;
        }
      }
    }

    // Also check status.json modification time
    const statusPath = path.join(logsDir, "status.json");
    if (fs.existsSync(statusPath)) {
      const stat = fs.statSync(statusPath);
      if (stat.mtimeMs > latestTime) {
        latestTime = stat.mtimeMs;
      }
    }

    return latestTime > 0 ? new Date(latestTime) : null;
  } catch {
    return null;
  }
}

/**
 * Determine project status from various data sources
 */
function determineProjectStatus(
  statusData: StatusData | null,
  completionData: CompletionData | null,
): ProjectInfo["status"] {
  // If completed flag is set, it's complete
  if (completionData?.completed) {
    return "completed";
  }

  // Check status.json
  if (statusData) {
    switch (statusData.status) {
      case "running":
        return "running";
      case "complete":
        return "completed";
      case "error":
        return "blocked";
      case "idle":
      default:
        return "idle";
    }
  }

  // No data means idle
  return "idle";
}

/**
 * Format relative time (e.g., "2m ago", "1h ago", "3d ago")
 */
export function formatRelativeTime(date: Date | null): string {
  if (!date) {
    return "-";
  }

  const now = Date.now();
  const diff = now - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return "<1m ago";
  } else if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else {
    return `${days}d ago`;
  }
}

/**
 * Load status information for a single project
 */
export function loadProjectStatus(projectName: string): ProjectInfo | null {
  const projectDir = getProjectDir(projectName);
  const config = loadProjectConfig(projectName);

  if (!config) {
    return null;
  }

  // Load all data sources
  const statusData = loadStatusData(projectDir);
  const completionData = loadCompletionData(projectDir);
  const summaryData = loadSummaryData(projectDir);
  const latestTimestamp = getLatestLogTimestamp(projectDir);

  // Determine status
  const status = determineProjectStatus(statusData, completionData);

  // Build task progress from actual phase files (more accurate than summary.json)
  const taskProgress = calculateTaskProgress(projectDir, summaryData);

  // Extract provider/model from status or config
  const provider = statusData?.cli || config.builder.backend || null;
  const model = statusData?.project || config.builder.model || null;

  return {
    name: projectName,
    description: config.description || "",
    status,
    iteration: statusData?.iteration ?? null,
    maxIterations: config.max_iterations || 0,
    provider,
    model,
    lastActivity: latestTimestamp,
    taskProgress,
    path: projectDir,
  };
}

/**
 * Load status information for all projects in .projects/
 */
export function loadAllProjectStatuses(): ProjectInfo[] {
  const projectsDir = getProjectsDir();
  const projects: ProjectInfo[] = [];

  if (!fs.existsSync(projectsDir)) {
    return projects;
  }

  try {
    const entries = fs.readdirSync(projectsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      // Skip hidden directories
      if (entry.name.startsWith("_")) {
        continue;
      }

      const info = loadProjectStatus(entry.name);
      if (info) {
        projects.push(info);
      }
    }
  } catch (err) {
    // If directory read fails, return empty list
    console.error(`Error reading projects directory: ${(err as Error).message}`);
  }

  // Sort by last activity (most recent first)
  projects.sort((a, b) => {
    const aTime = a.lastActivity?.getTime() ?? 0;
    const bTime = b.lastActivity?.getTime() ?? 0;
    return bTime - aTime;
  });

  return projects;
}
