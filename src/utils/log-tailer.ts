/**
 * Log Tailer Utilities
 * Tail formatted log files for live output display
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { getProjectDir } from "./project.js";

export interface TailResult {
  lines: string[];
  position: number;
  eof: boolean;
}

/**
 * Get the path to the formatted log file (logs/current.readable)
 * Falls back to latest iteration's output.readable if symlink is unreadable (Windows)
 */
export function getLogPath(projectName: string): string | null {
  const projectDir = getProjectDir(projectName);
  const symlinkPath = path.join(projectDir, "logs", "current.readable");

  // Try symlink first
  if (fs.existsSync(symlinkPath)) {
    try {
      // Check if we can actually read it (Windows symlink issue)
      fs.accessSync(symlinkPath, fs.constants.R_OK);
      return symlinkPath;
    } catch {
      // Symlink exists but unreadable (Windows) - fall through
    }
  }

  // Fallback: find latest iteration's output.readable
  const logsDir = path.join(projectDir, "logs");
  if (!fs.existsSync(logsDir)) return null;

  try {
    const iterations = fs.readdirSync(logsDir)
      .filter((d) => d.startsWith("iteration_"))
      .sort()
      .reverse();

    for (const iterDir of iterations) {
      const readablePath = path.join(logsDir, iterDir, "output.readable");
      if (fs.existsSync(readablePath)) return readablePath;
    }
  } catch {
    // Ignore directory read errors
  }

  return null;
}

/**
 * Get the path to a specific iteration's readable log
 */
export function getIterationLogPath(projectName: string, iteration: number): string {
  const projectDir = getProjectDir(projectName);
  const iterationDir = `iteration_${String(iteration).padStart(3, "0")}`;
  return path.join(projectDir, "logs", iterationDir, "output.readable");
}

/**
 * Initialize log buffer by reading the last N lines from a log file
 */
export function initializeLogBuffer(projectName: string, maxLines: number = 100): string[] {
  const logPath = getLogPath(projectName);

  if (!logPath || !fs.existsSync(logPath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(logPath, "utf-8");
    const lines = content.split("\n");

    // Return last maxLines lines
    if (lines.length > maxLines) {
      return lines.slice(-maxLines);
    }

    return lines;
  } catch {
    return [];
  }
}

/**
 * Tail the log file and return new lines since last position
 */
export function tailLogFile(projectName: string, lastPosition: number): TailResult {
  const logPath = getLogPath(projectName);

  if (!logPath || !fs.existsSync(logPath)) {
    return { lines: [], position: 0, eof: true };
  }

  try {
    const stats = fs.statSync(logPath);
    const fileSize = stats.size;

    // File was truncated (position > file size), restart from beginning
    if (lastPosition > fileSize) {
      lastPosition = 0;
    }

    // No new data
    if (lastPosition === fileSize) {
      return { lines: [], position: lastPosition, eof: true };
    }

    // Read new content
    const buffer = Buffer.alloc(fileSize - lastPosition);
    const fd = fs.openSync(logPath, "r");
    fs.readSync(fd, buffer, 0, buffer.length, lastPosition);
    fs.closeSync(fd);

    const content = buffer.toString("utf-8");
    const lines = content.split("\n");

    // Remove the trailing empty string if content ends with newline
    if (lines.length > 0 && lines[lines.length - 1] === "") {
      lines.pop();
    }

    return {
      lines,
      position: fileSize,
      eof: true,
    };
  } catch (err) {
    // On error, return empty and reset position
    console.error(`Error tailing log file: ${(err as Error).message}`);
    return { lines: [], position: 0, eof: true };
  }
}

/**
 * Get iteration list for a project
 */
export interface IterationInfo {
  number: number;
  dir: string;
  hasReadableLog: boolean;
  duration?: number;
  exitCode?: number;
}

export function getIterations(projectName: string): IterationInfo[] {
  const projectDir = getProjectDir(projectName);
  const logsDir = path.join(projectDir, "logs");
  const iterations: IterationInfo[] = [];

  if (!fs.existsSync(logsDir)) {
    return iterations;
  }

  try {
    const entries = fs.readdirSync(logsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const match = entry.name.match(/^iteration_(\d+)$/);
      if (!match) {
        continue;
      }

      const number = parseInt(match[1], 10);
      const iterationDir = path.join(logsDir, entry.name);

      // Check for readable log
      const logPath = path.join(iterationDir, "output.readable");
      const hasReadableLog = fs.existsSync(logPath);

      // Load duration if available
      let duration: number | undefined;
      const durationPath = path.join(iterationDir, "duration.json");
      if (fs.existsSync(durationPath)) {
        try {
          const durationContent = fs.readFileSync(durationPath, "utf-8");
          duration = JSON.parse(durationContent).seconds;
        } catch {
          // Ignore duration parse errors
        }
      }

      // Load exit code if available
      let exitCode: number | undefined;
      const exitCodePath = path.join(iterationDir, "exit_code");
      if (fs.existsSync(exitCodePath)) {
        try {
          const exitCodeContent = fs.readFileSync(exitCodePath, "utf-8");
          exitCode = parseInt(exitCodeContent.trim(), 10);
        } catch {
          // Ignore exit code parse errors
        }
      }

      iterations.push({
        number,
        dir: iterationDir,
        hasReadableLog,
        duration,
        exitCode,
      });
    }
  } catch (err) {
    console.error(`Error reading iterations: ${(err as Error).message}`);
  }

  // Sort by iteration number (descending - newest first)
  iterations.sort((a, b) => b.number - a.number);

  return iterations;
}

/**
 * Get git diff for an iteration
 */
export function getIterationDiff(projectName: string, iteration: number): string | null {
  const projectDir = getProjectDir(projectName);
  const iterationDir = path.join(
    projectDir,
    "logs",
    `iteration_${String(iteration).padStart(3, "0")}`,
  );
  const diffPath = path.join(iterationDir, "git_diff.txt");

  if (!fs.existsSync(diffPath)) {
    return null;
  }

  try {
    return fs.readFileSync(diffPath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Get files changed for an iteration
 */
export interface FileChange {
  path: string;
  status: "added" | "modified" | "deleted";
}

export function getIterationFiles(projectName: string, iteration: number): FileChange[] {
  const projectDir = getProjectDir(projectName);
  const iterationDir = path.join(
    projectDir,
    "logs",
    `iteration_${String(iteration).padStart(3, "0")}`,
  );
  const filesPath = path.join(iterationDir, "files_changed.json");

  if (!fs.existsSync(filesPath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(filesPath, "utf-8");
    const data = JSON.parse(content);

    // Convert to FileChange format
    const files: FileChange[] = [];

    if (data.added) {
      for (const path of data.added) {
        files.push({ path, status: "added" });
      }
    }

    if (data.modified) {
      for (const path of data.modified) {
        files.push({ path, status: "modified" });
      }
    }

    if (data.deleted) {
      for (const path of data.deleted) {
        files.push({ path, status: "deleted" });
      }
    }

    return files;
  } catch {
    return [];
  }
}
