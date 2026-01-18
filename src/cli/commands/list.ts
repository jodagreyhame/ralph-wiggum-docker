/**
 * List Projects Command
 */

import chalk from "chalk";
import { listProjects, loadProjectConfig } from "../../utils/project.js";

export function listCommand(): void {
  const projects = listProjects();

  if (projects.length === 0) {
    console.log(chalk.yellow("No projects found."));
    console.log(chalk.dim("Create a new project with: ralph new <project-name>"));
    return;
  }

  console.log(chalk.bold("Projects:"));
  console.log();

  for (const name of projects) {
    const config = loadProjectConfig(name);
    if (config) {
      const tiers: string[] = ["Builder"];
      if (config.reviewer?.enabled) tiers.push("Reviewer");
      if (config.architect?.enabled) tiers.push("Architect");

      console.log(`  ${chalk.green(name)}`);
      console.log(`    ${chalk.dim("Backend:")} ${config.builder?.backend || "claude"}`);
      console.log(`    ${chalk.dim("Tiers:")} ${tiers.join(" → ")}`);
      console.log();
    } else {
      console.log(`  ${chalk.red(name)} ${chalk.dim("(invalid config)")}`);
    }
  }
}
