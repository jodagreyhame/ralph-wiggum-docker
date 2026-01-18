/**
 * Template Copying Operations
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import type { ProjectConfig } from "../config/schema.js";

// Get the template directory from the main project
export function getTemplateDir(): string {
  const cwd = process.cwd();
  const possiblePaths = [path.join(cwd, "template"), path.join(cwd, "reference", "template")];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Fallback to CWD template
  return path.join(cwd, "template");
}

export function copyTemplate(targetDir: string): boolean {
  const templateDir = getTemplateDir();

  if (!fs.existsSync(templateDir)) {
    console.error(`Template directory not found: ${templateDir}`);
    return false;
  }

  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Copy all template files recursively
  copyDirRecursive(templateDir, targetDir);

  // Create logs directory
  const logsDir = path.join(targetDir, "logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Create CLAUDE.md (symlink on Unix, copy on Windows)
  createClaudeMd(targetDir);

  return true;
}

/**
 * Create CLAUDE.md pointing to AGENTS.md
 * On Unix: symlink
 * On Windows: copy (symlinks require admin)
 */
function createClaudeMd(projectDir: string): void {
  const claudeMd = path.join(projectDir, "CLAUDE.md");
  const agentsMd = path.join(projectDir, "AGENTS.md");

  // Skip if CLAUDE.md already exists or AGENTS.md doesn't exist
  if (fs.existsSync(claudeMd) || !fs.existsSync(agentsMd)) {
    return;
  }

  if (process.platform === "win32") {
    // Windows: copy the file
    fs.copyFileSync(agentsMd, claudeMd);
  } else {
    // Unix: create symlink
    try {
      fs.symlinkSync("AGENTS.md", claudeMd);
    } catch {
      // Fallback to copy if symlink fails
      fs.copyFileSync(agentsMd, claudeMd);
    }
  }
}

function copyDirRecursive(src: string, dest: string): void {
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export function initGitRepo(projectDir: string): boolean {
  const gitDir = path.join(projectDir, ".git");
  if (fs.existsSync(gitDir)) {
    return true; // Already initialized
  }

  try {
    execSync("git init", { cwd: projectDir, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Load config.json from template directory
 * This is the canonical source of default configuration
 */
export function loadTemplateConfig(): ProjectConfig | null {
  const templateDir = getTemplateDir();
  const configPath = path.join(templateDir, "config.json");

  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(content) as ProjectConfig;
  } catch {
    return null;
  }
}
