#!/usr/bin/env node
/**
 * Ralph CLI - TUI dashboard and project configurator
 *
 * Display Modes (existing):
 *   ralph -p <path> -s dashboard    # Project overview
 *   ralph -p <path> -s tasks        # Task list
 *   ralph -p <path> -s progress     # Progress view
 *
 * Project Management (new):
 *   ralph new <name>                # Create project
 *   ralph new --interactive         # Interactive wizard
 *   ralph new --preset=full         # Use preset
 *   ralph list                      # List projects
 *   ralph show <name>               # Display config
 *   ralph edit <name>               # Edit in TUI
 *   ralph delete <name>             # Delete project
 *   ralph validate <path>           # Validate config
 *   ralph run <name>                # Run with Docker
 *   ralph tui                       # Launch interactive TUI
 */

import { Command } from "commander";
import * as path from "path";
import * as fs from "fs";
import { renderDashboard } from "../screens/Dashboard.js";
import { renderTasks, renderTaskDetail } from "../screens/Tasks.js";
import { renderProgress } from "../screens/Progress.js";
import { theme } from "../theme/theme.js";
import { newCommand } from "./commands/new.js";
import { listCommand } from "./commands/list.js";
import { showCommand } from "./commands/show.js";
import { validateCommand } from "./commands/validate.js";
import { deleteCommand } from "./commands/delete.js";
import { runCommand } from "./commands/run.js";
import { editCommand } from "./commands/edit.js";

const program = new Command();

program
  .name("ralph")
  .description("TUI dashboard and project configurator for ralph-wiggum-docker-loop")
  .version("1.0.0")
  .allowExcessArguments(false)
  .allowUnknownOption(false);

// ============================================
// Display Mode Options (existing functionality)
// ============================================
program
  .option("-p, --project <path>", "Project directory path")
  .option("-s, --screen <screen>", "Screen to display (dashboard, tasks, progress)")
  .option("-t, --task <id>", "Show task detail by ID")
  .option("--status <status>", "Filter tasks by status (pending, in_progress, completed, blocked)")
  .option("--phase <number>", "Filter tasks by phase number")
  .action(() => {
    // Default action when no subcommand - handled after parse()
    // This prevents commander from showing help
  });

// ============================================
// Project Management Commands
// ============================================

// New command
program
  .command("new [project-name]")
  .description("Create a new project")
  .option("-d, --description <desc>", "Project description")
  .option("-p, --preset <preset>", "Use preset configuration (minimal, standard, three-tier, full)")
  .option("-i, --interactive", "Launch interactive TUI mode")
  // Builder options
  .option("--builder-backend <backend>", "Builder backend (claude, gemini, codex, opencode, zai)")
  .option("--builder-auth <auth>", "Builder auth mode")
  .option("--builder-model <model>", "Builder model override")
  .option("--builder-session <mode>", "Builder session mode (fresh, resume)")
  // Reviewer options
  .option("--reviewer-enabled", "Enable reviewer")
  .option("--no-reviewer", "Disable reviewer")
  .option("--reviewer-backend <backend>", "Reviewer backend")
  .option("--reviewer-auth <auth>", "Reviewer auth mode")
  .option("--reviewer-model <model>", "Reviewer model override")
  .option("--reviewer-session <mode>", "Reviewer session mode (fresh, resume)")
  // Architect options
  .option("--architect-enabled", "Enable architect")
  .option("--no-architect", "Disable architect")
  .option("--architect-backend <backend>", "Architect backend")
  .option("--architect-auth <auth>", "Architect auth mode")
  .option("--architect-model <model>", "Architect model override")
  .option("--architect-session <mode>", "Architect session mode (fresh, resume)")
  // Escalation options
  .option("--escalation-enabled", "Enable escalation")
  .option("--no-escalation", "Disable escalation")
  .option("--escalation-failures <n>", "Max failures before escalation", parseInt)
  // Fallback options
  .option("--fallback-enabled", "Enable provider fallback")
  .option("--no-fallback", "Disable provider fallback")
  .option("--fallback-threshold <n>", "Fallback failure threshold", parseInt)
  .option("--fallback-sequence <json>", "Fallback provider sequence (JSON array)")
  // Loop options
  .option("--max-iterations <n>", "Maximum iterations (0 = infinite)", parseInt)
  .option("--completion-enabled", "Enable completion detection")
  .option("--no-completion", "Disable completion detection")
  .action((projectName, options) => {
    newCommand(projectName, options);
  });

// List command
program
  .command("list")
  .alias("ls")
  .description("List all projects")
  .action(() => {
    listCommand();
  });

// Show command
program
  .command("show <project>")
  .description("Show project configuration")
  .action((project) => {
    showCommand(project);
  });

// Edit command
program
  .command("edit <project>")
  .description("Edit existing project in TUI")
  .action(async (project) => {
    await editCommand(project);
  });

// Delete command
program
  .command("delete <project>")
  .alias("rm")
  .description("Delete a project")
  .option("-f, --force", "Skip confirmation")
  .action(async (project, options) => {
    await deleteCommand(project, options);
  });

// Validate command
program
  .command("validate <path>")
  .description("Validate a config.json file")
  .action((configPath) => {
    validateCommand(configPath);
  });

// Run command
program
  .command("run <project>")
  .description("Run a project (wrapper for docker compose)")
  .action((project) => {
    runCommand(project);
  });

// TUI command
program
  .command("tui [project] [view]")
  .description("Launch interactive TUI mode")
  .option("--compact", "Start in compact view mode (default for projects list)")
  .option("--expanded", "Start in expanded view mode")
  .option("--full", "Start in full view mode (with live logs)")
  .action(async (project, view, options) => {
    const { launchTUIWithOptions } = await import("../tui/index.js");

    // Determine initial screen based on arguments
    let initialScreen: "projects-list" | "project-detail" | "config-editor" = "projects-list";

    if (project) {
      if (view === "config") {
        // ralph tui <project> config -> config editor
        initialScreen = "config-editor";
      } else {
        // ralph tui <project> -> project detail
        initialScreen = "project-detail";
      }
    }

    await launchTUIWithOptions({
      initialScreen,
      projectName: project,
    });
  });

// Parse arguments
program.parse();

// ============================================
// Display Mode Handler (if --project is used)
// ============================================
const options = program.opts();

if (options.project) {
  // Resolve project directory
  const projectDir = path.resolve(options.project);

  // Validate project directory
  if (!fs.existsSync(projectDir)) {
    console.error(theme.error(`Project directory not found: ${projectDir}`));
    process.exit(1);
  }

  // Check for .project directory
  const projectConfigDir = path.join(projectDir, ".project");
  if (!fs.existsSync(projectConfigDir)) {
    console.error(theme.warning(`No .project directory found in: ${projectDir}`));
    console.error(theme.muted("This may not be a Ralph project."));
  }

  // Render the requested screen
  try {
    let output: string;

    if (options.task) {
      // Task detail mode
      output = renderTaskDetail(projectDir, options.task);
    } else {
      switch (options.screen) {
        case "tasks":
          output = renderTasks(projectDir, {
            filterStatus: options.status || "all",
            filterPhase: options.phase ? parseInt(options.phase) : undefined,
          });
          break;

        case "progress":
          output = renderProgress(projectDir);
          break;

        case "dashboard":
        default:
          output = renderDashboard(projectDir);
          break;
      }
    }

    console.log(output);
  } catch (error) {
    console.error(theme.error("Error rendering screen:"));
    console.error(theme.muted((error as Error).message));
    process.exit(1);
  }
}
