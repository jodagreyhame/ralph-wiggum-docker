/**
 * Main TUI Application (chalk + readline, no React)
 * Clawdbot-compatible
 */

import { theme } from "../theme/theme.js";
import { BACKENDS, type Backend, type ProjectConfig } from "../config/schema.js";
import { validateConfig } from "../config/validate.js";
import {
  getProjectDir,
  projectExists,
  saveProjectConfig,
  slugify,
  deleteProject,
  loadProjectConfig,
} from "../utils/project.js";
import { copyTemplate, initGitRepo } from "../utils/template.js";
import { loadAllProjectStatuses, loadProjectStatus } from "../utils/project-status.js";
import { tailLogFile, initializeLogBuffer } from "../utils/log-tailer.js";

import {
  startInput,
  stopInput,
  clearScreen,
  hideCursor,
  showCursor,
  type KeyEvent,
} from "./input.js";

import {
  createAppState,
  setActiveTab,
  nextTab,
  prevTab,
  setFocusedField,
  toggleDropdown,
  setSummaryButton,
  setMessage,
  clearMessage,
  setProjectName,
  setBuilderBackend,
  setBuilderAuth,
  setReviewerEnabled,
  setReviewerBackend,
  setReviewerAuth,
  setArchitectEnabled,
  setArchitectBackend,
  setArchitectAuth,
  setEscalationEnabled,
  setCompletionEnabled,
  getFieldCount,
  TABS,
  DETAIL_TABS,
  type AppState,
  type TabName,
  type ScreenType,
  type DetailTabName,
  setScreen,
  pushScreen,
  popScreen,
  setProjects,
  setSelectedProject,
  setDetailTab,
  navigateProjects,
  toggleListView,
  nextDetailTab,
  prevDetailTab,
  appendLogs,
  setLogPosition,
  toggleHelp,
  toggleDeleteConfirm,
  toggleFilterDropdown,
  setSelectedTaskIndex,
  navigateTasks,
  toggleTaskDetail,
  setTaskFilter,
} from "./state.js";

import { renderTabs } from "./components/tabs.js";
import { renderHelpBar } from "./components/help-bar.js";
import {
  renderProjectScreen,
  renderBuilderScreen,
  renderReviewerScreen,
  renderArchitectScreen,
  renderLoopScreen,
  renderSummaryScreen,
  renderProjectListScreen,
  getProjectListFooterInfo,
  getProjectListFooterKeys,
  renderProjectDetailScreen,
  getProjectDetailFooterInfo,
  getProjectDetailFooterKeys,
  renderTaskDetailModal,
} from "./screens/index.js";

export interface TUIAppOptions {
  initialScreen?: ScreenType;
  projectName?: string;
  initialConfig?: ProjectConfig;
}

export class TUIApp {
  private state: AppState;
  private running = false;
  private onExit: (() => void) | null = null;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  constructor(options: TUIAppOptions = {}) {
    const initialState = createAppState(options.initialConfig);

    // Set initial screen
    if (options.initialScreen) {
      initialState.currentScreen = options.initialScreen;
      initialState.navigationStack = [options.initialScreen];
    }

    // Load initial project if specified
    if (options.projectName) {
      const projectInfo = loadProjectStatus(options.projectName);
      if (projectInfo) {
        initialState.selectedProject = projectInfo;
        initialState.config =
          options.initialConfig ||
          ({
            name: projectInfo.name,
            description: projectInfo.description,
            // Full config would be loaded from config.json
          } as ProjectConfig);
      }
    }

    this.state = initialState;
  }

  async run(): Promise<void> {
    this.running = true;

    // Load initial project data
    await this.loadProjectData();

    hideCursor();
    this.render();

    // Start auto-refresh timer
    this.startRefreshTimer();

    startInput((key) => this.handleKey(key));

    // Wait for exit
    await new Promise<void>((resolve) => {
      this.onExit = resolve;
    });

    this.stopRefreshTimer();
    stopInput();
    showCursor();
    clearScreen();
  }

  private startRefreshTimer(): void {
    // Refresh every 500ms
    this.refreshInterval = setInterval(async () => {
      if (this.state.autoRefresh) {
        await this.loadProjectData();
        this.render();
      }
    }, 500);
  }

  private stopRefreshTimer(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  private async loadProjectData(): Promise<void> {
    // Reload project statuses
    const projects = loadAllProjectStatuses();
    this.state = setProjects(this.state, projects);

    // Load logs for selected project if in detail view and logs tab
    if (
      this.state.currentScreen === "project-detail" &&
      this.state.selectedProject &&
      this.state.detailTab === "logs"
    ) {
      const projectName = this.state.selectedProject.name;
      const lastPosition = this.state.logPosition || 0;

      const result = tailLogFile(projectName, lastPosition);
      if (result.lines.length > 0) {
        this.state = appendLogs(this.state, result.lines);
      }
      this.state = setLogPosition(this.state, result.position);
    }
  }

  private exit(): void {
    this.running = false;
    if (this.onExit) {
      this.onExit();
    }
  }

  private render(): void {
    if (!this.running) return;

    clearScreen();

    const lines: string[] = [];
    const width = process.stdout.columns || 80;
    const height = process.stdout.rows || 24;

    const screen = this.state.currentScreen;

    if (screen === "config-editor") {
      // Existing config editor UI
      this.renderConfigEditor(lines);
    } else if (screen === "projects-list") {
      this.renderProjectsList(lines, width, height);
    } else if (screen === "project-detail") {
      this.renderProjectDetail(lines, width, height);
    }

    console.log(lines.join("\n"));
  }

  private renderConfigEditor(lines: string[]): void {
    // Header
    lines.push("");
    lines.push(theme.heading("  ════════════════════════════════════════"));
    lines.push(theme.heading("        RALPH PROJECT CONFIGURATOR"));
    lines.push(theme.heading("  ════════════════════════════════════════"));

    // Tabs
    lines.push(renderTabs(TABS, this.state.activeTab));

    // Screen content
    lines.push("  ────────────────────────────────────────");
    lines.push(this.renderCurrentConfigScreen());
    lines.push("  ────────────────────────────────────────");

    // Message
    if (this.state.message) {
      const icon = this.state.message.type === "success" ? "✓" : "✗";
      const color = this.state.message.type === "success" ? theme.success : theme.error;
      lines.push("");
      lines.push(`  ${color(icon)} ${color(this.state.message.text)}`);
    }

    // Help bar
    lines.push(renderHelpBar());
  }

  private renderProjectsList(lines: string[], width: number, height: number): void {
    // Header
    lines.push("");
    lines.push(
      theme.heading(
        "  ════════════════════════════════════════════════════════════════════════════",
      ),
    );
    lines.push(theme.heading("                         RALPH DASHBOARD"));
    lines.push(
      theme.heading(
        "  ════════════════════════════════════════════════════════════════════════════",
      ),
    );

    // Content
    const contentLines = renderProjectListScreen(this.state, { width, height });
    lines.push(...contentLines);

    // Modals
    if (this.state.helpOpen) {
      lines.push(...this.renderHelpModal());
    }
    if (this.state.deleteConfirmOpen) {
      lines.push(...this.renderDeleteConfirmModal());
    }

    // Footer
    lines.push("");
    lines.push(`  ${getProjectListFooterInfo(this.state)}`);
    lines.push(`  ${getProjectListFooterKeys()}`);
  }

  private renderProjectDetail(lines: string[], width: number, height: number): void {
    // Header with project name
    const projectName = this.state.selectedProject?.name || "Unknown";
    lines.push("");
    lines.push(
      theme.heading(
        "  ════════════════════════════════════════════════════════════════════════════",
      ),
    );
    lines.push(theme.heading(`                         ${projectName.toUpperCase()}`));
    lines.push(
      theme.heading(
        "  ════════════════════════════════════════════════════════════════════════════",
      ),
    );

    // Content
    const contentLines = renderProjectDetailScreen(this.state, { width, height });
    lines.push(...contentLines);

    // Modals
    if (this.state.helpOpen) {
      lines.push(...this.renderHelpModal());
    }

    // Task detail modal
    if (this.state.taskDetailOpen && this.state.selectedProject) {
      lines.push(...renderTaskDetailModal(this.state.selectedProject, this.state));
    }

    // Footer
    lines.push("");
    const activeTab = this.state.detailTab || "overview";
    lines.push(`  ${getProjectDetailFooterInfo(this.state)}`);
    lines.push(`  ${getProjectDetailFooterKeys(activeTab)}`);
  }

  private renderCurrentConfigScreen(): string {
    switch (this.state.activeTab) {
      case "project":
        return renderProjectScreen(this.state);
      case "builder":
        return renderBuilderScreen(this.state);
      case "reviewer":
        return renderReviewerScreen(this.state);
      case "architect":
        return renderArchitectScreen(this.state);
      case "loop":
        return renderLoopScreen(this.state);
      case "summary":
        return renderSummaryScreen(this.state);
      default:
        return "";
    }
  }

  private handleKey(key: KeyEvent): void {
    // Clear message on any input
    if (this.state.message) {
      this.state = clearMessage(this.state);
    }

    // Global quit
    if (key.name === "q" && !this.state.dropdownOpen) {
      this.exit();
      return;
    }

    // Escape for navigation or closing dropdown
    if (key.name === "escape") {
      if (this.state.dropdownOpen) {
        this.state = toggleDropdown(this.state);
      } else if (this.state.currentScreen === "project-detail") {
        // Go back to projects list
        this.state = popScreen(this.state);
      } else if (this.state.currentScreen === "config-editor") {
        // Go back to project detail or projects list
        this.state = popScreen(this.state);
      }
      this.render();
      return;
    }

    // Route to screen-specific handler
    switch (this.state.currentScreen) {
      case "projects-list":
        this.handleProjectsListKey(key);
        break;
      case "project-detail":
        this.handleProjectDetailKey(key);
        break;
      case "config-editor":
        this.handleConfigEditorKey(key);
        break;
    }
  }

  private handleProjectsListKey(key: KeyEvent): void {
    // Handle modals first
    if (this.state.helpOpen) {
      if (key.name === "escape" || key.name === "q" || key.name === "?") {
        this.state = toggleHelp(this.state);
        this.render();
      }
      return;
    }

    if (this.state.deleteConfirmOpen) {
      if (key.name === "y" || key.name === "return") {
        this.handleDeleteProject();
        return;
      }
      if (key.name === "n" || key.name === "escape" || key.name === "q") {
        this.state = toggleDeleteConfirm(this.state);
        this.render();
      }
      return;
    }

    // ? for help
    if (key.name === "?") {
      this.state = toggleHelp(this.state);
      this.render();
      return;
    }

    // Up/down navigation
    if (key.name === "up" || key.name === "k") {
      this.state = navigateProjects(this.state, "up");
      this.render();
      return;
    }
    if (key.name === "down" || key.name === "j") {
      this.state = navigateProjects(this.state, "down");
      this.render();
      return;
    }

    // Enter to open project detail
    if (key.name === "return") {
      const projects = this.state.projects || [];
      const selected = projects[this.state.selectedProjectIndex || 0];
      if (selected) {
        this.state = setSelectedProject(this.state, selected);
        this.state = pushScreen(this.state, "project-detail");

        // Initialize log buffer for logs tab
        this.state.logBuffer = initializeLogBuffer(selected.name, 100);
      }
      this.render();
      return;
    }

    // Space to toggle view mode
    if (key.name === "space") {
      this.state = toggleListView(this.state);
      this.render();
      return;
    }

    // r to refresh
    if (key.name === "r") {
      this.loadProjectData();
      this.render();
      return;
    }

    // d to delete project
    if (key.name === "d") {
      const projects = this.state.projects || [];
      if (projects.length > 0) {
        this.state = toggleDeleteConfirm(this.state);
        this.render();
      }
      return;
    }
  }

  private handleProjectDetailKey(key: KeyEvent): void {
    const activeTab = this.state.detailTab || "overview";

    // Handle modals first
    if (this.state.helpOpen) {
      if (key.name === "escape" || key.name === "q" || key.name === "?") {
        this.state = toggleHelp(this.state);
        this.render();
      }
      return;
    }

    if (this.state.taskDetailOpen) {
      if (key.name === "escape" || key.name === "return") {
        this.state = toggleTaskDetail(this.state);
        this.render();
      }
      return;
    }

    if (this.state.filterDropdownOpen) {
      if (key.name === "escape" || key.name === "f") {
        this.state = toggleFilterDropdown(this.state);
        this.render();
        return;
      }
      // Handle filter selection
      return;
    }

    // ? for help
    if (key.name === "?") {
      this.state = toggleHelp(this.state);
      this.render();
      return;
    }

    // Tab navigation with left/right arrows
    if (key.name === "left" || key.name === "h") {
      this.state = prevDetailTab(this.state);
      this.render();
      return;
    }
    if (key.name === "right" || key.name === "l") {
      this.state = nextDetailTab(this.state);
      this.render();
      return;
    }

    // Tab shortcuts (1-5)
    const tabNum = parseInt(key.name);
    if (!isNaN(tabNum) && tabNum >= 1 && tabNum <= 5) {
      this.state = setDetailTab(this.state, DETAIL_TABS[tabNum - 1]);
      this.render();
      return;
    }

    // r to refresh
    if (key.name === "r") {
      this.loadProjectData();
      this.render();
      return;
    }

    // Tab-specific handlers
    switch (activeTab) {
      case "tasks":
        // Up/down navigation for tasks
        if (key.name === "up" || key.name === "k") {
          this.state = navigateTasks(this.state, "up");
          this.render();
          return;
        }
        if (key.name === "down" || key.name === "j") {
          this.state = navigateTasks(this.state, "down");
          this.render();
          return;
        }
        // f for filter
        if (key.name === "f") {
          this.state = toggleFilterDropdown(this.state);
          this.render();
          return;
        }
        // Enter for task detail
        if (key.name === "return") {
          this.state = toggleTaskDetail(this.state);
          this.render();
          return;
        }
        break;
      case "history":
        // Up/down navigation for iterations
        if (key.name === "up" || key.name === "k") {
          const idx = Math.max(0, (this.state.selectedIterationIndex || 0) - 1);
          this.state = { ...this.state, selectedIterationIndex: idx };
          this.render();
          return;
        }
        if (key.name === "down" || key.name === "j") {
          const idx = (this.state.selectedIterationIndex || 0) + 1;
          this.state = { ...this.state, selectedIterationIndex: idx };
          this.render();
          return;
        }
        break;
      case "config":
        if (key.name === "return" || key.name === "e") {
          // Load actual config and switch to config editor
          const project = this.state.selectedProject;
          if (project) {
            const config = loadProjectConfig(project.name);
            if (config) {
              this.state.config = config;
              this.state.isEditing = true;
              this.state.currentScreen = "config-editor";
              this.state.navigationStack = [...this.state.navigationStack, "config-editor"];
              this.render();
            }
          }
        }
        break;
    }
  }

  private handleConfigEditorKey(key: KeyEvent): void {
    // Escape closes dropdown
    if (key.name === "escape" && this.state.dropdownOpen) {
      this.state = toggleDropdown(this.state);
      this.render();
      return;
    }

    // Tab navigation with left/right arrows
    if (key.name === "left" && !this.state.dropdownOpen) {
      this.state = prevTab(this.state);
      this.render();
      return;
    }
    if (key.name === "right" && !this.state.dropdownOpen) {
      this.state = nextTab(this.state);
      this.render();
      return;
    }

    // Tab shortcuts (1-6)
    const tabNum = parseInt(key.name);
    if (!isNaN(tabNum) && tabNum >= 1 && tabNum <= 6 && !this.state.dropdownOpen) {
      this.state = setActiveTab(this.state, TABS[tabNum - 1]);
      this.render();
      return;
    }

    // Jump to summary with 's'
    if (key.name === "s" && !this.state.dropdownOpen) {
      this.state = setActiveTab(this.state, "summary");
      this.render();
      return;
    }

    const fieldCount = getFieldCount(this.state);

    // Field navigation with up/down arrows
    if (key.name === "up") {
      if (this.state.activeTab === "summary") {
        this.state = setSummaryButton(this.state, Math.max(0, this.state.summaryButton - 1));
      } else {
        this.state = setFocusedField(this.state, Math.max(0, this.state.focusedField - 1));
      }
      this.render();
      return;
    }
    if (key.name === "down") {
      if (this.state.activeTab === "summary") {
        this.state = setSummaryButton(this.state, Math.min(1, this.state.summaryButton + 1));
      } else {
        this.state = setFocusedField(
          this.state,
          Math.min(fieldCount - 1, this.state.focusedField + 1),
        );
      }
      this.render();
      return;
    }

    // Space toggles
    if (key.name === "space") {
      this.handleSpace();
      this.render();
      return;
    }

    // Enter for selection/action
    if (key.name === "return") {
      this.handleEnter();
      return;
    }

    // Backend selection with number keys for provider cards
    this.handleBackendSelection(key);
  }

  private handleSpace(): void {
    const tab = this.state.activeTab;
    const field = this.state.focusedField;

    if (tab === "reviewer" && field === 0) {
      this.state = setReviewerEnabled(this.state, !this.state.config.reviewer.enabled);
    } else if (tab === "architect" && field === 0) {
      this.state = setArchitectEnabled(this.state, !this.state.config.architect.enabled);
    } else if (tab === "loop") {
      if (field === 1) {
        this.state = setCompletionEnabled(this.state, !this.state.config.completion_enabled);
      } else if (field === 2) {
        this.state = setEscalationEnabled(this.state, !this.state.config.escalation.enabled);
      }
    }
  }

  private handleEnter(): void {
    const tab = this.state.activeTab;
    const field = this.state.focusedField;

    if (tab === "summary") {
      if (this.state.summaryButton === 0) {
        this.handleCreate();
      } else {
        this.exit();
      }
      return;
    }

    // Toggle dropdown for auth mode fields
    if (
      (tab === "builder" && field === 1) ||
      (tab === "reviewer" && field === 2 && this.state.config.reviewer.enabled) ||
      (tab === "architect" && field === 2 && this.state.config.architect.enabled)
    ) {
      this.state = toggleDropdown(this.state);
      this.render();
    }
  }

  private handleBackendSelection(key: KeyEvent): void {
    // Check for number keys 1-5 when focused on backend field
    const num = parseInt(key.sequence);
    if (isNaN(num) || num < 1 || num > 5) return;

    const backendIndex = num - 1;
    if (backendIndex >= BACKENDS.length) return;

    const backend = BACKENDS[backendIndex].id as Backend;
    const tab = this.state.activeTab;
    const field = this.state.focusedField;

    if (tab === "builder" && field === 0) {
      this.state = setBuilderBackend(this.state, backend);
      this.state = setBuilderAuth(this.state, BACKENDS[backendIndex].authModes[0]);
    } else if (tab === "reviewer" && field === 1 && this.state.config.reviewer.enabled) {
      this.state = setReviewerBackend(this.state, backend);
      this.state = setReviewerAuth(this.state, BACKENDS[backendIndex].authModes[0]);
    } else if (tab === "architect" && field === 1 && this.state.config.architect.enabled) {
      this.state = setArchitectBackend(this.state, backend);
      this.state = setArchitectAuth(this.state, BACKENDS[backendIndex].authModes[0]);
    }

    this.render();
  }

  private handleCreate(): void {
    const slug = slugify(this.state.config.name);

    if (!slug) {
      this.state = setMessage(this.state, { text: "Invalid project name", type: "error" });
      this.render();
      return;
    }

    if (projectExists(slug) && !this.state.isEditing) {
      this.state = setMessage(this.state, {
        text: `Project '${slug}' already exists`,
        type: "error",
      });
      this.render();
      return;
    }

    const validation = validateConfig(this.state.config);
    if (!validation.valid) {
      this.state = setMessage(this.state, {
        text: validation.errors[0]?.message || "Invalid config",
        type: "error",
      });
      this.render();
      return;
    }

    try {
      const projectDir = getProjectDir(slug);

      if (!this.state.isEditing) {
        copyTemplate(projectDir);
      }

      saveProjectConfig(slug, this.state.config);

      if (!this.state.isEditing) {
        initGitRepo(projectDir);
      }

      this.state = setMessage(this.state, {
        text: `Project '${slug}' ${this.state.isEditing ? "updated" : "created"} successfully!`,
        type: "success",
      });
      this.render();

      // Exit after delay
      setTimeout(() => this.exit(), 1500);
    } catch (err) {
      this.state = setMessage(this.state, {
        text: `Failed: ${(err as Error).message}`,
        type: "error",
      });
      this.render();
    }
  }

  private renderHelpModal(): string[] {
    const lines: string[] = [];
    lines.push("");
    lines.push(
      `  ${theme.dimmed("╔═══════════════════════════════════════════════════════════════════════════╗")}`,
    );
    lines.push(
      `  ${theme.dimmed("║")} ${theme.header("KEYBOARD SHORTCUTS").padEnd(73)} ${theme.dimmed("║")}`,
    );
    lines.push(
      `  ${theme.dimmed("╠═══════════════════════════════════════════════════════════════════════════╣")}`,
    );
    lines.push(
      `  ${theme.dimmed("║")} ${theme.text("Navigation:").padEnd(30)} ${theme.muted("↑/k - Up    ↓/j - Down    ←/h - Back    →/l - Forward").padEnd(43)} ${theme.dimmed("║")}`,
    );
    lines.push(
      `  ${theme.dimmed("║")} ${theme.text("").padEnd(30)} ${theme.muted("Enter - Select  Esc - Back  Space - Toggle  q - Quit").padEnd(43)} ${theme.dimmed("║")}`,
    );
    lines.push(
      `  ${theme.dimmed("╠───────────────────────────────────────────────────────────────────────────╣")}`,
    );
    lines.push(
      `  ${theme.dimmed("║")} ${theme.text("Projects List:").padEnd(30)} ${theme.muted("Enter - Open    Space - Expand    d - Delete    r - Refresh").padEnd(43)} ${theme.dimmed("║")}`,
    );
    lines.push(
      `  ${theme.dimmed("╠───────────────────────────────────────────────────────────────────────────╣")}`,
    );
    lines.push(
      `  ${theme.dimmed("║")} ${theme.text("Project Detail:").padEnd(30)} ${theme.muted("1-5 - Tabs      r - Refresh    ? - Help").padEnd(43)} ${theme.dimmed("║")}`,
    );
    lines.push(
      `  ${theme.dimmed("║")} ${theme.text("Tasks Tab:").padEnd(30)} ${theme.muted("↑↓ - Navigate  f - Filter  Enter - Details").padEnd(43)} ${theme.dimmed("║")}`,
    );
    lines.push(
      `  ${theme.dimmed("║")} ${theme.text("Config Tab:").padEnd(30)} ${theme.muted("Enter/e - Edit config").padEnd(43)} ${theme.dimmed("║")}`,
    );
    lines.push(
      `  ${theme.dimmed("╠───────────────────────────────────────────────────────────────────────────╣")}`,
    );
    lines.push(
      `  ${theme.dimmed("║")} ${theme.text("Config Editor:").padEnd(30)} ${theme.muted("1-6 - Tabs      Space - Toggle  Enter - Select").padEnd(43)} ${theme.dimmed("║")}`,
    );
    lines.push(
      `  ${theme.dimmed("╠───────────────────────────────────────────────────────────────────────────╣")}`,
    );
    lines.push(
      `  ${theme.dimmed("║")} ${theme.muted("Press ? or Esc to close").padEnd(73)} ${theme.dimmed("║")}`,
    );
    lines.push(
      `  ${theme.dimmed("╚═══════════════════════════════════════════════════════════════════════════╝")}`,
    );
    lines.push("");
    return lines;
  }

  private renderDeleteConfirmModal(): string[] {
    const lines: string[] = [];
    const project = this.state.projects?.[this.state.selectedProjectIndex || 0];
    const projectName = project?.name || "this project";

    lines.push("");
    lines.push(
      `  ${theme.error("╔═══════════════════════════════════════════════════════════════════════════╗")}`,
    );
    lines.push(
      `  ${theme.error("║")} ${theme.header("DELETE PROJECT").padEnd(73)} ${theme.error("║")}`,
    );
    lines.push(
      `  ${theme.error("╠═══════════════════════════════════════════════════════════════════════════╣")}`,
    );
    lines.push(
      `  ${theme.error("║")} ${theme.warning(`Delete '${projectName}'? This cannot be undone.`).padEnd(73)} ${theme.error("║")}`,
    );
    lines.push(
      `  ${theme.error("╠═══════════════════════════════════════════════════════════════════════════╣")}`,
    );
    lines.push(
      `  ${theme.error("║")} ${theme.success("Y - Yes, delete").padEnd(73)} ${theme.error("║")}`,
    );
    lines.push(
      `  ${theme.error("║")} ${theme.muted("N - No, cancel").padEnd(73)} ${theme.error("║")}`,
    );
    lines.push(
      `  ${theme.error("╚═══════════════════════════════════════════════════════════════════════════╝")}`,
    );
    lines.push("");
    return lines;
  }

  private handleDeleteProject(): void {
    const projects = this.state.projects || [];
    const selected = projects[this.state.selectedProjectIndex || 0];

    if (!selected) {
      this.state = toggleDeleteConfirm(this.state);
      this.render();
      return;
    }

    try {
      deleteProject(selected.name);
      this.state = toggleDeleteConfirm(this.state);
      this.state = setMessage(this.state, {
        text: `Project '${selected.name}' deleted successfully!`,
        type: "success",
      });
      this.loadProjectData();
      this.render();

      // Clear message after delay
      setTimeout(() => {
        this.state = clearMessage(this.state);
        this.render();
      }, 2000);
    } catch (err) {
      this.state = toggleDeleteConfirm(this.state);
      this.state = setMessage(this.state, {
        text: `Failed: ${(err as Error).message}`,
        type: "error",
      });
      this.render();
    }
  }
}
