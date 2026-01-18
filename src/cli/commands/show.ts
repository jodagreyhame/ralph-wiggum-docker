/**
 * Show Project Command
 */

import chalk from "chalk";
import { loadProjectConfig, projectExists } from "../../utils/project.js";

export function showCommand(projectName: string): void {
  if (!projectExists(projectName)) {
    console.error(chalk.red(`Error: Project '${projectName}' not found`));
    console.log(chalk.dim('Run "ralph list" to see available projects'));
    process.exit(1);
  }

  const config = loadProjectConfig(projectName);
  if (!config) {
    console.error(chalk.red(`Error: Failed to load config for '${projectName}'`));
    process.exit(1);
  }

  console.log(chalk.bold(`Project: ${chalk.green(config.name)}`));
  if (config.description) {
    console.log(chalk.dim(config.description));
  }
  console.log();

  // Print full config as formatted JSON
  console.log(chalk.dim("Config:"));
  console.log(JSON.stringify(config, null, 2));
}
