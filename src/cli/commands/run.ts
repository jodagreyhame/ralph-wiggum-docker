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
    if (process.platform === "win32") {
      // Windows: use PowerShell script
      execSync(
        `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "./scripts/run.ps1" -Project "${projectName}"`,
        {
          stdio: "inherit",
          cwd: process.cwd(),
        },
      );
    } else {
      // Unix: use Bash script
      execSync(`./scripts/run.sh ${projectName}`, {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    }
  } catch (error) {
    // Only show fallback message if script actually failed (not just exited)
    if (error instanceof Error && error.message.includes("not found")) {
      console.error(chalk.yellow("Run script not found."));
      console.log(chalk.dim("You can run the project manually with docker compose."));
    }
    // Re-throw to preserve exit code from script
    throw error;
  }
}
