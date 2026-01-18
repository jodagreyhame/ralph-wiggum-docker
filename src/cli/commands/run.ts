/**
 * Run Project Command (wrapper for docker compose)
 */

import { execSync } from "node:child_process";
import chalk from "chalk";
import { projectExists, getProjectDir } from "../../utils/project.js";

export function runCommand(projectName: string): void {
  if (!projectExists(projectName)) {
    console.error(chalk.red(`Error: Project '${projectName}' not found`));
    console.log(chalk.dim('Run "ralph list" to see available projects'));
    process.exit(1);
  }

  const projectDir = getProjectDir(projectName);
  console.log(chalk.cyan(`Running project: ${projectName}`));
  console.log(chalk.dim(`Directory: ${projectDir}`));
  console.log();

  try {
    // Try to run the project using scripts or docker compose
    execSync(`./scripts/run.sh ${projectName}`, {
      stdio: "inherit",
      cwd: process.cwd(),
    });
  } catch {
    console.error(chalk.yellow("Run script not found or failed."));
    console.log(chalk.dim("You can run the project manually with docker compose."));
  }
}
