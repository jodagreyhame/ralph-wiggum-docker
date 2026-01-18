/**
 * Blessed-based TUI Application
 * Uses blessed + blessed-contrib for proper terminal handling
 */

import blessed from "blessed";
import type { ProjectConfig } from "../config/schema.js";
import {
  deleteProject,
  loadProjectConfig,
  saveProjectConfig,
  getProjectDir,
  projectExists,
  slugify,
} from "../utils/project.js";
import { copyTemplate, initGitRepo } from "../utils/template.js";
import { createDefaultConfig } from "../config/defaults.js";
import { loadAllProjectStatuses, loadProjectStatus } from "../utils/project-status.js";
import { tailLogFile, initializeLogBuffer, getIterationLogPath } from "../utils/log-tailer.js";
import * as fs from "node:fs";

import {
  createAppState,
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
  navigateTasks,
  toggleTaskDetail,
  toggleFilterDropdown,
  toggleAutoScroll,
  popScreen,
  pushScreen,
  // Config editor state
  setActiveTab,
  nextTab,
  prevTab,
  setFocusedField,
  toggleDropdown,
  setSummaryButton,
  setBuilderAuth,
  setReviewerEnabled,
  setReviewerAuth,
  setArchitectEnabled,
  setArchitectAuth,
  setEscalationEnabled,
  setCompletionEnabled,
  getFieldCount,
  TABS,
  DETAIL_TABS,
  type AppState,
  type ScreenType,
  type DetailTabName,
  type TabName,
} from "./state.js";

import { createScreen, destroyScreen, renderScreen, clearScreen } from "./blessed/screen.js";
import { BLESSED_COLORS } from "./blessed/theme.js";
import {
  createProjectListTable,
  updateProjectListTable,
  createStatsBar,
  createEmptyState,
  createHelpModal,
  createDeleteConfirmModal,
  ProjectDetailContainer,
  ConfigEditorContainer,
  createProjectListStatusBar,
  updateProjectListStatusBar,
  getTabByIndex,
  getConfigTabByIndex,
} from "./blessed/widgets/index.js";
import { BACKENDS } from "../config/schema.js";

export interface BlessedTUIAppOptions {
  initialScreen?: ScreenType;
  projectName?: string;
  initialConfig?: ProjectConfig;
}

export class BlessedTUIApp {
  private state: AppState;
  private screen: blessed.Widgets.Screen;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  // Project List widgets
  private projectListTable: blessed.Widgets.ListTableElement | null = null;
  private projectListStatsBar: blessed.Widgets.BoxElement | null = null;
  private projectListStatusBar: blessed.Widgets.BoxElement | null = null;

  // Project Detail container
  private projectDetailContainer: ProjectDetailContainer | null = null;

  // Config Editor container
  private configEditorContainer: ConfigEditorContainer | null = null;

  // Key handler storage (to prevent accumulation)
  private projectListKeyHandlers: Map<string, Function> = new Map();
  private projectDetailKeyHandlers: Map<string, Function> = new Map();
  private configEditorKeyHandlers: Map<string, Function> = new Map();

  constructor(options: BlessedTUIAppOptions = {}) {
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
          } as ProjectConfig);
      }
    }

    this.state = initialState;
    this.screen = createScreen({ title: "Ralph Dashboard" });
  }

  async run(): Promise<void> {
    // Load initial project data
    await this.loadProjectData();

    // Set up global key handlers
    this.setupGlobalKeys();

    // Render initial screen
    this.renderCurrentScreen();

    // Start auto-refresh timer
    this.startRefreshTimer();

    // Wait for exit (q key will destroy screen)
    await new Promise<void>((resolve) => {
      this.screen.on("destroy", () => resolve());
    });

    this.cleanup();
  }

  private setupGlobalKeys(): void {
    // Quit on q (when not in dropdown/modal)
    this.screen.key(["q"], () => {
      if (
        !this.state.dropdownOpen &&
        !this.state.helpOpen &&
        !this.state.deleteConfirmOpen &&
        !this.state.taskDetailOpen
      ) {
        destroyScreen(this.screen);
      }
    });

    // Escape for back navigation
    this.screen.key(["escape"], () => {
      // Close modals/overlays first
      if (this.state.helpOpen) {
        this.state = toggleHelp(this.state);
        this.renderCurrentScreen();
        return;
      }
      if (this.state.deleteConfirmOpen) {
        this.state = toggleDeleteConfirm(this.state);
        this.renderCurrentScreen();
        return;
      }
      if (this.state.taskDetailOpen) {
        this.state = toggleTaskDetail(this.state);
        this.renderCurrentScreen();
        return;
      }

      // In config editor, close dropdown first before navigating back
      if (this.state.currentScreen === "config-editor" && this.state.dropdownOpen) {
        this.state = toggleDropdown(this.state);
        this.configEditorContainer?.updateData(this.state);
        renderScreen(this.screen);
        return;
      }

      // Navigate back
      if (this.state.currentScreen === "project-detail") {
        this.state = popScreen(this.state);
        this.renderCurrentScreen();
      } else if (this.state.currentScreen === "config-editor") {
        // Reset config editor state before going back
        this.state = { ...this.state, dropdownOpen: false, focusedField: 0 };
        this.state = popScreen(this.state);
        this.renderCurrentScreen();
      }
    });

    // Help on ?
    this.screen.key(["?"], () => {
      if (!this.state.helpOpen) {
        this.state = toggleHelp(this.state);
        this.showHelpModal();
      }
    });

    // Refresh on r
    this.screen.key(["r"], async () => {
      await this.loadProjectData();
      this.updateCurrentScreen();
    });
  }

  private renderCurrentScreen(): void {
    // Remove screen-specific key handlers BEFORE clearing
    this.removeProjectListKeyHandlers();
    this.removeProjectDetailKeyHandlers();
    this.removeConfigEditorKeyHandlers();

    // Clear all children
    clearScreen(this.screen);

    // Reset widget references
    this.projectListTable = null;
    this.projectListStatsBar = null;
    this.projectListStatusBar = null;
    this.projectDetailContainer = null;
    this.configEditorContainer = null;

    // Render based on screen type
    switch (this.state.currentScreen) {
      case "projects-list":
        this.renderProjectsList();
        break;
      case "project-detail":
        this.renderProjectDetail();
        break;
      case "config-editor":
        this.renderConfigEditor();
        break;
    }

    renderScreen(this.screen);
  }

  private renderProjectsList(): void {
    // Header
    blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: "100%",
      height: 3,
      content: `{center}{${BLESSED_COLORS.coral}-fg}{bold}═══════════════════════════════════════════════════════════════════════{/bold}{/}{/center}\n{center}{${BLESSED_COLORS.coral}-fg}{bold}RALPH DASHBOARD{/bold}{/}{/center}`,
      tags: true,
    });

    // Stats bar
    this.projectListStatsBar = this.createStatsBar();

    // Project list table or empty state
    const projects = this.state.projects || [];
    if (projects.length === 0) {
      createEmptyState(this.screen);
    } else {
      this.projectListTable = createProjectListTable(
        { parent: this.screen, top: 5, height: "100%-8" },
        this.state,
      );

      // Key bindings for project list
      this.setupProjectListKeys();
    }

    // Status bar
    this.projectListStatusBar = createProjectListStatusBar({ parent: this.screen }, this.state);

    // Focus the table
    if (this.projectListTable) {
      this.projectListTable.focus();
    }
  }

  private createStatsBar(): blessed.Widgets.BoxElement {
    const projects = this.state.projects || [];
    const total = projects.length;
    const running = projects.filter((p) => p.status === "running").length;
    const completed = projects.filter((p) => p.status === "completed").length;
    const idle = projects.filter((p) => p.status === "idle").length;
    const blocked = projects.filter((p) => p.status === "blocked").length;
    const viewMode = this.state.listViewMode || "compact";

    const parts: string[] = [`{${BLESSED_COLORS.shell}-fg}${total} Projects{/}`];

    if (running > 0) {
      parts.push(`{${BLESSED_COLORS.warning}-fg}● ${running} Running{/}`);
    }
    if (completed > 0) {
      parts.push(`{${BLESSED_COLORS.success}-fg}✓ ${completed} Complete{/}`);
    }
    if (idle > 0) {
      parts.push(`{${BLESSED_COLORS.muted}-fg}○ ${idle} Idle{/}`);
    }
    if (blocked > 0) {
      parts.push(`{${BLESSED_COLORS.error}-fg}✕ ${blocked} Blocked{/}`);
    }

    if (viewMode === "expanded") {
      parts.push(`{${BLESSED_COLORS.info}-fg}[Expanded]{/}`);
    }

    return blessed.box({
      parent: this.screen,
      top: 3,
      left: 0,
      width: "100%",
      height: 1,
      content: `  ${parts.join(` {${BLESSED_COLORS.dimmed}-fg}│{/} `)}`,
      tags: true,
    });
  }

  private removeProjectListKeyHandlers(): void {
    for (const [keys, handler] of this.projectListKeyHandlers) {
      for (const key of keys.split(",")) {
        this.screen.unkey(key, handler as any);
      }
    }
    this.projectListKeyHandlers.clear();
  }

  private removeProjectDetailKeyHandlers(): void {
    for (const [keys, handler] of this.projectDetailKeyHandlers) {
      for (const key of keys.split(",")) {
        this.screen.unkey(key, handler as any);
      }
    }
    this.projectDetailKeyHandlers.clear();
  }

  private removeConfigEditorKeyHandlers(): void {
    for (const [keys, handler] of this.configEditorKeyHandlers) {
      for (const key of keys.split(",")) {
        this.screen.unkey(key, handler as any);
      }
    }
    this.configEditorKeyHandlers.clear();
  }

  private setupProjectListKeys(): void {
    if (!this.projectListTable) return;

    // Navigation with j/k
    const downHandler = () => {
      if (this.state.helpOpen || this.state.deleteConfirmOpen) return;
      if (this.state.currentScreen !== "projects-list") return;
      this.state = navigateProjects(this.state, "down");
      this.updateProjectListSelection();
    };
    this.screen.key(["j", "down"], downHandler);
    this.projectListKeyHandlers.set("j,down", downHandler);

    const upHandler = () => {
      if (this.state.helpOpen || this.state.deleteConfirmOpen) return;
      if (this.state.currentScreen !== "projects-list") return;
      this.state = navigateProjects(this.state, "up");
      this.updateProjectListSelection();
    };
    this.screen.key(["k", "up"], upHandler);
    this.projectListKeyHandlers.set("k,up", upHandler);

    // Enter to open detail
    const enterHandler = () => {
      if (this.state.helpOpen || this.state.deleteConfirmOpen) return;
      if (this.state.currentScreen !== "projects-list") return;
      const projects = this.state.projects || [];
      const selected = projects[this.state.selectedProjectIndex || 0];
      if (selected) {
        this.state = setSelectedProject(this.state, selected);
        this.state = pushScreen(this.state, "project-detail");
        this.state.logBuffer = initializeLogBuffer(selected.name, 100);
        this.renderCurrentScreen();
      }
    };
    this.screen.key(["enter"], enterHandler);
    this.projectListKeyHandlers.set("enter", enterHandler);

    // Space to toggle view mode
    const spaceHandler = () => {
      if (this.state.helpOpen || this.state.deleteConfirmOpen) return;
      if (this.state.currentScreen !== "projects-list") return;
      this.state = toggleListView(this.state);
      this.renderCurrentScreen();
    };
    this.screen.key(["space"], spaceHandler);
    this.projectListKeyHandlers.set("space", spaceHandler);

    // d to delete
    const deleteHandler = () => {
      if (this.state.helpOpen || this.state.deleteConfirmOpen) return;
      if (this.state.currentScreen !== "projects-list") return;
      const projects = this.state.projects || [];
      if (projects.length > 0) {
        this.state = toggleDeleteConfirm(this.state);
        this.showDeleteConfirmModal();
      }
    };
    this.screen.key(["d"], deleteHandler);
    this.projectListKeyHandlers.set("d", deleteHandler);

    // n to create new project
    const newHandler = () => {
      if (this.state.helpOpen || this.state.deleteConfirmOpen) return;
      if (this.state.currentScreen !== "projects-list") return;
      this.state = pushScreen(this.state, "config-editor");
      this.state.isEditing = false; // New project mode (not editing existing)
      this.renderCurrentScreen();
    };
    this.screen.key(["n"], newHandler);
    this.projectListKeyHandlers.set("n", newHandler);

    // Select event from table
    this.projectListTable.on("select", (_item: any, index: number) => {
      // index includes header row, so subtract 1
      const actualIndex = Math.max(0, index - 1);
      this.state = { ...this.state, selectedProjectIndex: actualIndex };
      if (this.projectListStatusBar) {
        updateProjectListStatusBar(this.projectListStatusBar, this.state);
      }
    });
  }

  private updateProjectListSelection(): void {
    if (this.projectListTable) {
      updateProjectListTable(this.projectListTable, this.state);
    }
    if (this.projectListStatusBar) {
      updateProjectListStatusBar(this.projectListStatusBar, this.state);
    }
    renderScreen(this.screen);
  }

  private renderProjectDetail(): void {
    if (!this.state.selectedProject) {
      // Fallback - go back to list
      this.state = popScreen(this.state);
      this.renderCurrentScreen();
      return;
    }

    // Create the detail container
    this.projectDetailContainer = new ProjectDetailContainer(
      { parent: this.screen },
      this.state.selectedProject,
      this.state,
    );

    // Set up detail-specific keys
    this.setupProjectDetailKeys();
  }

  private setupProjectDetailKeys(): void {
    // Tab switching with 1-5
    const tabHandler = (ch: string) => {
      if (this.state.helpOpen || this.state.taskDetailOpen) return;
      if (this.state.currentScreen !== "project-detail") return;
      const tabIndex = parseInt(ch);
      const tab = getTabByIndex(tabIndex);
      if (tab) {
        this.state = setDetailTab(this.state, tab);
        this.projectDetailContainer?.switchTab(tab);
        renderScreen(this.screen);
      }
    };
    this.screen.key(["1", "2", "3", "4", "5"], tabHandler);
    this.projectDetailKeyHandlers.set("1,2,3,4,5", tabHandler);

    // Tab switching with h/l or left/right
    const prevTabHandler = () => {
      if (this.state.helpOpen || this.state.taskDetailOpen) return;
      if (this.state.currentScreen !== "project-detail") return;
      this.state = prevDetailTab(this.state);
      this.projectDetailContainer?.switchTab(this.state.detailTab || "overview");
      renderScreen(this.screen);
    };
    this.screen.key(["h", "left"], prevTabHandler);
    this.projectDetailKeyHandlers.set("h,left", prevTabHandler);

    const nextTabHandler = () => {
      if (this.state.helpOpen || this.state.taskDetailOpen) return;
      if (this.state.currentScreen !== "project-detail") return;
      this.state = nextDetailTab(this.state);
      this.projectDetailContainer?.switchTab(this.state.detailTab || "overview");
      renderScreen(this.screen);
    };
    this.screen.key(["l", "right"], nextTabHandler);
    this.projectDetailKeyHandlers.set("l,right", nextTabHandler);

    // Tab-specific keys
    const downHandler = () => {
      if (this.state.helpOpen || this.state.taskDetailOpen) return;
      if (this.state.currentScreen !== "project-detail") return;
      const tab = this.state.detailTab || "overview";
      if (tab === "tasks") {
        this.state = navigateTasks(this.state, "down");
        this.projectDetailContainer?.updateData(this.state);
      } else if (tab === "history") {
        const iterations = this.projectDetailContainer?.getIterations() || [];
        const maxIdx = Math.max(0, iterations.length - 1);
        const idx = Math.min(maxIdx, (this.state.selectedIterationIndex || 0) + 1);
        this.state = { ...this.state, selectedIterationIndex: idx };
        this.projectDetailContainer?.updateData(this.state);
      }
    };
    this.screen.key(["j", "down"], downHandler);
    this.projectDetailKeyHandlers.set("j,down", downHandler);

    const upHandler = () => {
      if (this.state.helpOpen || this.state.taskDetailOpen) return;
      if (this.state.currentScreen !== "project-detail") return;
      const tab = this.state.detailTab || "overview";
      if (tab === "tasks") {
        this.state = navigateTasks(this.state, "up");
        this.projectDetailContainer?.updateData(this.state);
      } else if (tab === "history") {
        const idx = Math.max(0, (this.state.selectedIterationIndex || 0) - 1);
        this.state = { ...this.state, selectedIterationIndex: idx };
        this.projectDetailContainer?.updateData(this.state);
      }
    };
    this.screen.key(["k", "up"], upHandler);
    this.projectDetailKeyHandlers.set("k,up", upHandler);

    // Enter for task detail, history log, or config edit
    const enterHandler = () => {
      if (this.state.helpOpen || this.state.taskDetailOpen) return;
      if (this.state.currentScreen !== "project-detail") return;
      const tab = this.state.detailTab || "overview";
      if (tab === "tasks") {
        this.projectDetailContainer?.showTaskDetailModal(this.state.selectedTaskIndex || 0);
      } else if (tab === "history") {
        const iterations = this.projectDetailContainer?.getIterations() || [];
        const selectedIdx = this.state.selectedIterationIndex || 0;
        const selectedIter = iterations[selectedIdx];
        if (selectedIter) {
          this.showIterationLogModal(selectedIter.number);
        }
      } else if (tab === "config") {
        // TODO: Switch to config editor
      }
    };
    this.screen.key(["enter"], enterHandler);
    this.projectDetailKeyHandlers.set("enter", enterHandler);

    // e for config edit
    const editHandler = () => {
      if (this.state.helpOpen || this.state.taskDetailOpen) return;
      if (this.state.currentScreen !== "project-detail") return;
      const tab = this.state.detailTab || "overview";
      if (tab === "config") {
        // TODO: Switch to config editor
      }
    };
    this.screen.key(["e"], editHandler);
    this.projectDetailKeyHandlers.set("e", editHandler);

    // f for filter toggle (tasks tab)
    const filterHandler = () => {
      if (this.state.helpOpen || this.state.taskDetailOpen) return;
      if (this.state.currentScreen !== "project-detail") return;
      const tab = this.state.detailTab || "overview";
      if (tab === "tasks") {
        this.state = toggleFilterDropdown(this.state);
        this.projectDetailContainer?.updateData(this.state);
        renderScreen(this.screen);
      }
    };
    this.screen.key(["f"], filterHandler);
    this.projectDetailKeyHandlers.set("f", filterHandler);

    // s for auto-scroll toggle (logs tab)
    const autoScrollHandler = () => {
      if (this.state.helpOpen || this.state.taskDetailOpen) return;
      if (this.state.currentScreen !== "project-detail") return;
      const tab = this.state.detailTab || "overview";
      if (tab === "logs") {
        this.state = toggleAutoScroll(this.state);
        this.projectDetailContainer?.updateData(this.state);
        renderScreen(this.screen);
      }
    };
    this.screen.key(["s"], autoScrollHandler);
    this.projectDetailKeyHandlers.set("s", autoScrollHandler);
  }

  private renderConfigEditor(): void {
    const isNewProject = !this.state.isEditing;

    // Initialize config for new project
    if (isNewProject && (!this.state.config.name || this.state.config.name === "my-project")) {
      this.state = {
        ...this.state,
        config: createDefaultConfig("new-project"),
        activeTab: "project",
        focusedField: 0,
        dropdownOpen: false,
        summaryButton: 0,
      };
    }

    // Create the config editor container
    this.configEditorContainer = new ConfigEditorContainer(
      { parent: this.screen },
      this.state,
      isNewProject,
    );

    // Set up state update callback for text inputs
    this.configEditorContainer.setStateUpdateCallback((updater) => {
      this.state = updater(this.state);
      this.configEditorContainer?.updateData(this.state);
      renderScreen(this.screen);
    });

    // Set up config editor keys
    this.setupConfigEditorKeys();
  }

  private setupConfigEditorKeys(): void {
    // Tab switching with 1-6 (skip on text input fields)
    const tabHandler = (ch: string) => {
      if (this.state.helpOpen || this.state.dropdownOpen) return;
      if (this.state.currentScreen !== "config-editor") return;
      if (this.isTextInputField()) return; // Allow typing numbers in text fields
      const tabIndex = parseInt(ch);
      const tab = getConfigTabByIndex(tabIndex);
      if (tab) {
        this.state = setActiveTab(this.state, tab);
        this.configEditorContainer?.switchTab(tab);
        renderScreen(this.screen);
      }
    };
    this.screen.key(["1", "2", "3", "4", "5", "6"], tabHandler);
    this.configEditorKeyHandlers.set("1,2,3,4,5,6", tabHandler);

    // Tab switching with Tab/Shift+Tab (always works)
    const nextTabHandler = () => {
      if (this.state.helpOpen || this.state.dropdownOpen) return;
      if (this.state.currentScreen !== "config-editor") return;
      this.state = nextTab(this.state);
      this.configEditorContainer?.switchTab(this.state.activeTab);
      renderScreen(this.screen);
    };
    this.screen.key(["tab"], nextTabHandler);
    this.configEditorKeyHandlers.set("tab", nextTabHandler);

    const prevTabHandler = () => {
      if (this.state.helpOpen || this.state.dropdownOpen) return;
      if (this.state.currentScreen !== "config-editor") return;
      this.state = prevTab(this.state);
      this.configEditorContainer?.switchTab(this.state.activeTab);
      renderScreen(this.screen);
    };
    this.screen.key(["S-tab"], prevTabHandler);
    this.configEditorKeyHandlers.set("S-tab", prevTabHandler);

    // Field navigation with arrow keys only (j/k are for text input on text fields)
    const downFieldHandler = () => {
      if (this.state.helpOpen) return;
      if (this.state.currentScreen !== "config-editor") return;
      if (this.state.dropdownOpen) {
        // Navigate dropdown items
        this.handleDropdownNavigation("down");
      } else {
        const maxField = getFieldCount(this.state) - 1;
        if (this.state.focusedField < maxField) {
          this.state = setFocusedField(this.state, this.state.focusedField + 1);
          this.configEditorContainer?.updateData(this.state);
          renderScreen(this.screen);
        }
      }
    };
    this.screen.key(["down"], downFieldHandler);
    this.configEditorKeyHandlers.set("down", downFieldHandler);

    const upFieldHandler = () => {
      if (this.state.helpOpen) return;
      if (this.state.currentScreen !== "config-editor") return;
      if (this.state.dropdownOpen) {
        // Navigate dropdown items
        this.handleDropdownNavigation("up");
      } else {
        if (this.state.focusedField > 0) {
          this.state = setFocusedField(this.state, this.state.focusedField - 1);
          this.configEditorContainer?.updateData(this.state);
          renderScreen(this.screen);
        }
      }
    };
    this.screen.key(["up"], upFieldHandler);
    this.configEditorKeyHandlers.set("up", upFieldHandler);

    // Space for toggle fields
    const spaceHandler = () => {
      if (this.state.helpOpen || this.state.dropdownOpen) return;
      if (this.state.currentScreen !== "config-editor") return;
      this.handleToggleField();
    };
    this.screen.key(["space"], spaceHandler);
    this.configEditorKeyHandlers.set("space", spaceHandler);

    // Enter for text input focus, dropdown/button selection
    const enterHandler = () => {
      if (this.state.helpOpen) return;
      if (this.state.currentScreen !== "config-editor") return;

      // Check if on a text input field - focus the blessed textbox
      const { activeTab, focusedField } = this.state;
      if (activeTab === "project" || (activeTab === "loop" && focusedField === 0)) {
        this.configEditorContainer?.focusCurrentInput();
        return;
      }

      this.handleEnterKey();
    };
    this.screen.key(["enter"], enterHandler);
    this.configEditorKeyHandlers.set("enter", enterHandler);
  }

  private handleToggleField(): void {
    const { activeTab, focusedField, config } = this.state;

    if (activeTab === "reviewer" && focusedField === 0) {
      this.state = setReviewerEnabled(this.state, !config.reviewer.enabled);
    } else if (activeTab === "architect" && focusedField === 0) {
      this.state = setArchitectEnabled(this.state, !config.architect.enabled);
    } else if (activeTab === "loop") {
      if (focusedField === 1) {
        this.state = setCompletionEnabled(this.state, !config.completion_enabled);
      } else if (focusedField === 2) {
        this.state = setEscalationEnabled(this.state, !config.escalation.enabled);
      }
    }

    this.configEditorContainer?.updateData(this.state);
    renderScreen(this.screen);
  }

  private handleEnterKey(): void {
    const { activeTab, focusedField, dropdownOpen, summaryButton } = this.state;

    // Handle dropdown
    if (this.isDropdownField()) {
      if (dropdownOpen) {
        // Close dropdown and apply selection
        this.state = toggleDropdown(this.state);
      } else {
        // Open dropdown
        this.state = toggleDropdown(this.state);
      }
      this.configEditorContainer?.updateData(this.state);
      renderScreen(this.screen);
      return;
    }

    // Handle summary buttons
    if (activeTab === "summary") {
      if (summaryButton === 0) {
        // Create/Update project
        this.saveProject();
      } else {
        // Cancel
        this.state = popScreen(this.state);
        this.renderCurrentScreen();
      }
      return;
    }
  }

  /**
   * Check if the current focused field is a text input field
   */
  private isTextInputField(): boolean {
    const { activeTab, focusedField } = this.state;

    // Project tab: name (0), description (1)
    if (activeTab === "project") {
      return focusedField === 0 || focusedField === 1;
    }

    // Loop tab: max_iterations (0)
    if (activeTab === "loop" && focusedField === 0) {
      return true;
    }

    return false;
  }

  private handleDropdownNavigation(direction: "up" | "down"): void {
    // Get current auth modes for the active backend field
    const { activeTab, config } = this.state;
    let backend: string;

    if (activeTab === "builder") {
      backend = config.builder.backend;
    } else if (activeTab === "reviewer") {
      backend = config.reviewer.backend;
    } else if (activeTab === "architect") {
      backend = config.architect.backend;
    } else {
      return;
    }

    const backendInfo = BACKENDS.find((b) => b.id === backend);
    const authModes = backendInfo?.authModes || [];

    // Find current index
    let currentAuth: string;
    if (activeTab === "builder") {
      currentAuth = config.builder.auth_mode;
    } else if (activeTab === "reviewer") {
      currentAuth = config.reviewer.auth_mode;
    } else {
      currentAuth = config.architect.auth_mode;
    }

    const currentIndex = authModes.indexOf(currentAuth as any);
    let newIndex: number;

    if (direction === "down") {
      newIndex = Math.min(currentIndex + 1, authModes.length - 1);
    } else {
      newIndex = Math.max(currentIndex - 1, 0);
    }

    const newAuth = authModes[newIndex];

    // Update state
    if (activeTab === "builder") {
      this.state = setBuilderAuth(this.state, newAuth);
    } else if (activeTab === "reviewer") {
      this.state = setReviewerAuth(this.state, newAuth);
    } else {
      this.state = setArchitectAuth(this.state, newAuth);
    }

    this.configEditorContainer?.updateData(this.state);
    renderScreen(this.screen);
  }

  private isDropdownField(): boolean {
    const { activeTab, focusedField } = this.state;

    if (activeTab === "builder" && focusedField === 1) return true;
    if (activeTab === "reviewer" && focusedField === 2 && this.state.config.reviewer.enabled)
      return true;
    if (activeTab === "architect" && focusedField === 2 && this.state.config.architect.enabled)
      return true;

    return false;
  }

  private saveProject(): void {
    const { config, isEditing } = this.state;

    try {
      const slug = slugify(config.name);
      if (!slug) {
        // Invalid project name
        return;
      }

      if (isEditing) {
        // Update existing project config
        saveProjectConfig(slug, config);
      } else {
        // Check if project already exists
        if (projectExists(slug)) {
          // Project already exists - could show error
          return;
        }

        // Create new project - copy template first
        const projectDir = getProjectDir(slug);
        const templateCopied = copyTemplate(projectDir);
        if (!templateCopied) {
          return;
        }

        // Save the config
        saveProjectConfig(slug, config);

        // Initialize git repo (optional, don't fail if it doesn't work)
        initGitRepo(projectDir);
      }

      // Go back to projects list
      this.state = popScreen(this.state);
      this.loadProjectData();
      this.renderCurrentScreen();
    } catch (error) {
      // Show error message
      // For now, just log it
      console.error("Failed to save project:", error);
    }
  }

  private showHelpModal(): void {
    const screenType =
      this.state.currentScreen === "projects-list" ? "projects-list" : "project-detail";
    createHelpModal(this.screen, screenType, () => {
      this.state = toggleHelp(this.state);
    });
  }

  private showDeleteConfirmModal(): void {
    const projects = this.state.projects || [];
    const selected = projects[this.state.selectedProjectIndex || 0];
    if (!selected) return;

    createDeleteConfirmModal(
      this.screen,
      selected.name,
      () => {
        // Confirm delete
        deleteProject(selected.name);
        this.state = toggleDeleteConfirm(this.state);
        this.loadProjectData();
        this.renderCurrentScreen();
      },
      () => {
        // Cancel
        this.state = toggleDeleteConfirm(this.state);
        renderScreen(this.screen);
      },
    );
  }

  private showIterationLogModal(iterationNumber: number): void {
    const projectName = this.state.selectedProject?.name;
    if (!projectName) return;

    const logPath = getIterationLogPath(projectName, iterationNumber);
    let content = "No log file found for this iteration.";
    if (fs.existsSync(logPath)) {
      try {
        content = fs.readFileSync(logPath, "utf-8");
      } catch {
        content = "Failed to read log file.";
      }
    }

    this.projectDetailContainer?.showIterationLogModal(iterationNumber, content);
  }

  private startRefreshTimer(): void {
    this.refreshInterval = setInterval(async () => {
      if (this.state.autoRefresh) {
        await this.loadProjectData();
        this.updateCurrentScreen();
      }
    }, 500);
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
        this.projectDetailContainer?.appendLogs(result.lines);
      }
      this.state = setLogPosition(this.state, result.position);
    }
  }

  private updateCurrentScreen(): void {
    switch (this.state.currentScreen) {
      case "projects-list":
        this.updateProjectListSelection();
        break;
      case "project-detail":
        this.projectDetailContainer?.updateData(this.state);
        renderScreen(this.screen);
        break;
    }
  }

  private cleanup(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}

/**
 * Launch the blessed TUI
 */
export async function launchBlessedTUI(options: BlessedTUIAppOptions = {}): Promise<void> {
  const app = new BlessedTUIApp(options);
  await app.run();
}
