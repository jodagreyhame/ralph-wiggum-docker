/**
 * New Project Command
 */

import chalk from "chalk";
import type { NewCommandOptions } from "../flags.js";
import { parseBoolean } from "../flags.js";
import {
  applyPreset,
  validateConfig,
  type ProjectConfig,
  type Backend,
  type AuthMode,
  type SessionMode,
} from "../../config/index.js";
import {
  getProjectDir,
  projectExists,
  loadProjectConfig,
  saveProjectConfig,
  slugify,
} from "../../utils/project.js";
import { copyTemplate, initGitRepo } from "../../utils/template.js";

export async function newCommand(
  projectName: string | undefined,
  options: NewCommandOptions,
): Promise<void> {
  // If no name or --interactive, launch TUI
  if (!projectName || options.interactive) {
    console.log(chalk.cyan("Launching interactive TUI mode..."));
    const { launchTUI } = await import("../../tui/index.js");
    await launchTUI();
    return;
  }

  const name = projectName.trim();
  const slug = slugify(name);

  if (!slug) {
    console.error(chalk.red("Error: Invalid project name"));
    process.exit(1);
  }

  // Check if project exists
  if (projectExists(slug)) {
    console.error(chalk.red(`Error: Project '${slug}' already exists`));
    console.log(
      chalk.dim(`Use 'ralph edit ${slug}' to modify or 'ralph delete ${slug}' to remove`),
    );
    process.exit(1);
  }

  // Create project directory and copy template (including config.json)
  const projectDir = getProjectDir(slug);
  console.log(chalk.dim(`Creating project: ${slug}`));

  const templateCopied = copyTemplate(projectDir);
  if (!templateCopied) {
    console.error(chalk.red("Failed to copy template files"));
    process.exit(1);
  }
  console.log(chalk.green("✓ Template files copied"));

  // Load config from template (now in project dir)
  let config = loadProjectConfig(slug);
  if (!config) {
    console.error(chalk.red("Failed to load template config"));
    process.exit(1);
  }

  // Update project-specific fields
  config.name = name;
  if (options.description) {
    config.description = options.description;
  }

  // Apply preset if specified
  if (options.preset) {
    config = applyPreset(config, options.preset);
    console.log(chalk.dim(`Using preset: ${options.preset}`));
  }

  // Apply CLI options
  config = applyOptions(config, options);

  // Validate config
  const validation = validateConfig(config);
  if (!validation.valid) {
    console.error(chalk.red("Configuration errors:"));
    for (const err of validation.errors) {
      console.error(chalk.red(`  ${err.path}: ${err.message}`));
    }
    process.exit(1);
  }

  // Save updated config
  saveProjectConfig(slug, config);
  console.log(chalk.green("✓ Configuration saved"));

  // Initialize git (optional, don't fail if it doesn't work)
  if (initGitRepo(projectDir)) {
    console.log(chalk.green("✓ Git repository initialized"));
  }

  // Print summary
  console.log();
  printConfigSummary(slug, config);

  console.log();
  console.log(chalk.dim("Next steps:"));
  console.log(chalk.dim(`  1. Edit ${projectDir}/GOAL.md with your project objective`));
  console.log(chalk.dim(`  2. Run: ralph run ${slug}`));
}

function applyOptions(config: ProjectConfig, options: NewCommandOptions): ProjectConfig {
  // Description
  if (options.description) {
    config.description = options.description;
  }

  // Builder
  if (options.builderBackend) {
    config.builder.backend = options.builderBackend;
  }
  if (options.builderAuth) {
    config.builder.auth_mode = options.builderAuth;
  }
  if (options.builderModel) {
    config.builder.model = options.builderModel;
  }
  if (options.builderSession) {
    config.builder.session_mode = options.builderSession;
  }

  // Reviewer
  config.reviewer.enabled = parseBoolean(
    options.reviewerEnabled,
    options.noReviewer,
    config.reviewer.enabled,
  );
  if (options.reviewerBackend) {
    config.reviewer.backend = options.reviewerBackend;
  }
  if (options.reviewerAuth) {
    config.reviewer.auth_mode = options.reviewerAuth;
  }
  if (options.reviewerModel) {
    config.reviewer.model = options.reviewerModel;
  }
  if (options.reviewerSession) {
    config.reviewer.session_mode = options.reviewerSession as SessionMode;
  }

  // Architect
  config.architect.enabled = parseBoolean(
    options.architectEnabled,
    options.noArchitect,
    config.architect.enabled,
  );
  if (options.architectBackend) {
    config.architect.backend = options.architectBackend;
  }
  if (options.architectAuth) {
    config.architect.auth_mode = options.architectAuth;
  }
  if (options.architectModel) {
    config.architect.model = options.architectModel;
  }
  if (options.architectSession) {
    config.architect.session_mode = options.architectSession;
  }

  // Escalation
  config.escalation.enabled = parseBoolean(
    options.escalationEnabled,
    options.noEscalation,
    config.escalation.enabled,
  );
  if (options.escalationFailures !== undefined) {
    config.escalation.max_builder_failures = options.escalationFailures;
  }

  // Provider Fallback
  if (options.fallbackEnabled || options.fallbackThreshold || options.fallbackSequence) {
    if (!config.provider_fallback) {
      config.provider_fallback = {
        enabled: true,
        failure_threshold: 10,
        sequence: [],
      };
    }
    config.provider_fallback.enabled = parseBoolean(
      options.fallbackEnabled,
      options.noFallback,
      true,
    );
    if (options.fallbackThreshold !== undefined) {
      config.provider_fallback.failure_threshold = options.fallbackThreshold;
    }
    if (options.fallbackSequence) {
      try {
        config.provider_fallback.sequence = JSON.parse(options.fallbackSequence);
      } catch {
        console.error(chalk.yellow("Warning: Invalid fallback-sequence JSON, using default"));
      }
    }
  }

  // Loop Settings
  if (options.maxIterations !== undefined) {
    config.max_iterations = options.maxIterations;
  }
  if (options.completionEnabled !== undefined || options.noCompletion !== undefined) {
    config.completion_enabled = parseBoolean(options.completionEnabled, options.noCompletion, true);
  }

  return config;
}

function printConfigSummary(slug: string, config: ProjectConfig): void {
  console.log(chalk.bold("═".repeat(55)));
  console.log(chalk.bold("  CONFIGURATION SUMMARY"));
  console.log(chalk.bold("═".repeat(55)));
  console.log(`  Project: ${chalk.green(slug)}`);
  console.log();

  // Builder
  console.log(chalk.cyan("  📦 BUILDER:"));
  console.log(`     Backend:    ${chalk.green(config.builder.backend)}`);
  console.log(`     Auth:       ${chalk.green(config.builder.auth_mode)}`);
  if (config.builder.model) {
    console.log(`     Model:      ${chalk.green(config.builder.model)}`);
  }
  console.log();

  // Reviewer
  console.log(chalk.yellow("  🔍 REVIEWER:"));
  if (config.reviewer.enabled) {
    console.log(`     Enabled:    ${chalk.green("Yes")}`);
    console.log(`     Backend:    ${chalk.green(config.reviewer.backend)}`);
    console.log(`     Auth:       ${chalk.green(config.reviewer.auth_mode)}`);
    if (config.reviewer.model) {
      console.log(`     Model:      ${chalk.green(config.reviewer.model)}`);
    }
  } else {
    console.log(`     Enabled:    ${chalk.yellow("No")}`);
  }
  console.log();

  // Architect
  console.log(chalk.magenta("  🏛️  ARCHITECT:"));
  if (config.architect.enabled) {
    console.log(`     Enabled:    ${chalk.green("Yes")}`);
    console.log(`     Backend:    ${chalk.green(config.architect.backend)}`);
    console.log(`     Auth:       ${chalk.green(config.architect.auth_mode)}`);
    if (config.architect.model) {
      console.log(`     Model:      ${chalk.green(config.architect.model)}`);
    }
  } else {
    console.log(`     Enabled:    ${chalk.yellow("No")}`);
  }
  console.log();

  // Escalation
  console.log(chalk.red("  ⬆️  ESCALATION:"));
  if (config.escalation.enabled) {
    console.log(`     Enabled:    ${chalk.green("Yes")}`);
    console.log(
      `     Threshold:  ${chalk.green(`${config.escalation.max_builder_failures} failures`)}`,
    );
  } else {
    console.log(`     Enabled:    ${chalk.yellow("No")}`);
  }
  console.log();

  // Loop
  console.log(chalk.green("  ⚙️  LOOP:"));
  console.log(`     Max Iter:   ${chalk.green(config.max_iterations || "infinite")}`);
  console.log(
    `     Completion: ${chalk.green(config.completion_enabled ? "Enabled" : "Disabled")}`,
  );

  console.log(chalk.bold("═".repeat(55)));
}
