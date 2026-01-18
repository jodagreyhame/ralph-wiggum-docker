/**
 * Project Detail Widget (blessed)
 * Container with 5 tabs: Overview, Tasks, Logs, History, Config
 */

import blessed from "blessed";
import contrib from "blessed-contrib";
import * as fs from "fs";
import * as path from "path";
import type { ProjectInfo } from "../../../utils/project-status.js";
import { formatRelativeTime } from "../../../utils/project-status.js";
import { getIterations } from "../../../utils/log-tailer.js";
import type { AppState, DetailTabName } from "../../state.js";
import {
  BLESSED_COLORS,
  formatProgressBar,
  formatProviderBadge,
  formatComplexityBadge,
  formatStatusBadge,
  getStatusIcon,
  getStatusColor,
  formatSectionHeader,
  formatDecorativeHeader,
} from "../theme.js";
import { createTabBar, updateTabBar } from "./TabBar.js";
import { createProjectDetailStatusBar, updateProjectDetailStatusBar } from "./StatusBar.js";
import { createModal } from "./Modal.js";

// Task types from TaskList component
interface Task {
  id: string;
  name: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "blocked";
  provider: string;
  complexity: "S" | "M" | "L";
  depends_on: string[];
  acceptance_criteria?: string[];
  files_to_create?: string[];
  files_to_modify?: string[];
}

interface Phase {
  phase: number;
  name: string;
  description: string;
  tasks: Task[];
}

export interface ProjectDetailOptions {
  parent: blessed.Widgets.Screen;
}

/**
 * Load all phases from project
 */
function loadPhases(projectDir: string): Phase[] {
  const specsDir = path.join(projectDir, ".project", "specs", "tasks");
  const phases: Phase[] = [];

  try {
    const files = fs
      .readdirSync(specsDir)
      .filter((f: string) => f.startsWith("phase-") && f.endsWith(".json"));

    files.sort((a: string, b: string) => {
      const aNum = parseInt(a.match(/phase-(\d+)/)?.[1] || "0", 10);
      const bNum = parseInt(b.match(/phase-(\d+)/)?.[1] || "0", 10);
      return aNum - bNum;
    });

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(specsDir, file), "utf-8");
        const phase: Phase = JSON.parse(content);
        phases.push(phase);
      } catch {
        // Skip invalid phase files
      }
    }
  } catch {
    // No tasks directory
  }

  return phases;
}

/**
 * Project Detail Container - manages all 5 tabs
 */
export class ProjectDetailContainer {
  private screen: blessed.Widgets.Screen;
  private project: ProjectInfo;
  private state: AppState;

  // Widgets
  private tabBar: blessed.Widgets.BoxElement;
  private contentArea: blessed.Widgets.BoxElement;
  private statusBar: blessed.Widgets.BoxElement;

  // Tab content widgets
  private overviewBox: blessed.Widgets.BoxElement | null = null;
  private tasksList: blessed.Widgets.ListTableElement | null = null;
  private logsViewer: contrib.Widgets.LogElement | null = null;
  private historyList: blessed.Widgets.ListTableElement | null = null;
  private historyDetail: blessed.Widgets.BoxElement | null = null;
  private configBox: blessed.Widgets.BoxElement | null = null;

  // Data
  private phases: Phase[] = [];
  private iterations: Array<{ number: number; duration?: number; exitCode?: number }> = [];

  constructor(options: ProjectDetailOptions, project: ProjectInfo, state: AppState) {
    this.screen = options.parent;
    this.project = project;
    this.state = state;

    // Load data
    this.loadData();

    // Create header with project name
    this.createHeader();

    // Create tab bar
    this.tabBar = createTabBar(
      { parent: this.screen, top: 2 },
      state.detailTab || "overview",
    );

    // Create content area
    this.contentArea = blessed.box({
      parent: this.screen,
      top: 4,
      left: 0,
      width: "100%",
      height: "100%-6",
    });

    // Create status bar
    this.statusBar = createProjectDetailStatusBar({ parent: this.screen }, state);

    // Create all tab widgets
    this.createAllTabs();

    // Show initial tab
    this.switchTab(state.detailTab || "overview");
  }

  private createHeader(): void {
    // Decorative header: ══ PROJECT-NAME ══ with yellow title
    const headerLines = formatDecorativeHeader(
      this.project.name.toUpperCase(),
      this.project.description || "Project Detail View",
    );
    blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: "100%",
      height: 2,
      content: `{center}${headerLines[0]}{/center}\n{center}${headerLines[1] || ""}{/center}`,
      tags: true,
    });
  }

  private loadData(): void {
    this.phases = loadPhases(this.project.path);
    this.iterations = getIterations(this.project.name).map((i) => ({
      number: i.number,
      duration: i.duration,
      exitCode: i.exitCode,
    }));
  }

  private createAllTabs(): void {
    this.overviewBox = this.createOverviewWidget();
    this.createTasksWidget();
    this.logsViewer = this.createLogsWidget();
    this.createHistoryWidget();
    this.configBox = this.createConfigWidget();
  }

  /**
   * Tab 1: Overview
   */
  private createOverviewWidget(): blessed.Widgets.BoxElement {
    const box = blessed.box({
      parent: this.contentArea,
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      tags: true,
      scrollable: true,
      scrollbar: {
        ch: "█",
        track: { bg: BLESSED_COLORS.dimmed },
        style: { inverse: true },
      },
      keys: true,
      vi: true,
      hidden: true,
    });

    this.updateOverviewContent(box);
    return box;
  }

  private updateOverviewContent(box: blessed.Widgets.BoxElement): void {
    const lines: string[] = [];

    // Status row - fixed width columns for alignment
    const statusIcon = getStatusIcon(this.project.status);
    const statusText = this.project.status.toUpperCase().padEnd(12);
    const providerBadge = this.project.provider ? formatProviderBadge(this.project.provider) : `{${BLESSED_COLORS.muted}-fg}-{/}`;
    lines.push(
      `{${BLESSED_COLORS.coral}-fg}STATUS:{/}     ${statusIcon} ${statusText}    {${BLESSED_COLORS.coral}-fg}PROVIDER:{/}   ${providerBadge}`,
    );

    // Iteration row - fixed width columns for alignment
    const iter = this.project.iteration !== null ? `${this.project.iteration} of ∞` : "0 of ∞";
    const iterText = iter.padEnd(12);
    const startedText = formatRelativeTime(this.project.lastActivity);
    lines.push(
      `{${BLESSED_COLORS.coral}-fg}ITERATION:{/}  {${BLESSED_COLORS.muted}-fg}${iterText}{/}    {${BLESSED_COLORS.coral}-fg}STARTED:{/}    {${BLESSED_COLORS.muted}-fg}${startedText}{/}`,
    );

    lines.push("");
    lines.push(formatSectionHeader("PROGRESS"));

    // Task progress - calculate from actual task data, not summary.json
    if (this.phases.length > 0) {
      let totalCompleted = 0;
      let totalTasks = 0;
      for (const phase of this.phases) {
        totalCompleted += phase.tasks.filter((t) => t.status === "completed").length;
        totalTasks += phase.tasks.length;
      }

      const currentPhase = this.project.taskProgress?.currentPhase || this.phases[0]?.name || "unknown";
      const bar = formatProgressBar(totalCompleted, totalTasks, 30);
      lines.push(`{${BLESSED_COLORS.cream}-fg}Overall:{/} ${bar} {${BLESSED_COLORS.muted}-fg}(${totalCompleted}/${totalTasks} tasks){/}`);
      lines.push("");
      lines.push(`{${BLESSED_COLORS.cream}-fg}Current Phase:{/} {${BLESSED_COLORS.info}-fg}${currentPhase}{/}`);
    } else if (this.project.taskProgress && this.project.taskProgress.total > 0) {
      // Fallback to summary.json if no phases loaded
      const { completed, total, currentPhase } = this.project.taskProgress;
      const bar = formatProgressBar(completed, total, 30);
      lines.push(`{${BLESSED_COLORS.cream}-fg}Overall:{/} ${bar} {${BLESSED_COLORS.muted}-fg}(${completed}/${total} tasks){/}`);
      lines.push("");
      lines.push(`{${BLESSED_COLORS.cream}-fg}Current Phase:{/} {${BLESSED_COLORS.info}-fg}${currentPhase}{/}`);
    } else {
      lines.push(`{${BLESSED_COLORS.muted}-fg}No task progress data available{/}`);
    }

    lines.push("");
    lines.push(formatSectionHeader("PHASES"));

    // Phases
    for (const phase of this.phases) {
      const completed = phase.tasks.filter((t) => t.status === "completed").length;
      const total = phase.tasks.length;
      const bar = formatProgressBar(completed, total, 25);

      const isCurrent = this.project.taskProgress?.currentPhase === phase.name;
      const currentMark = isCurrent ? ` {${BLESSED_COLORS.warning}-fg}◄ current{/}` : "";

      lines.push(
        `{${BLESSED_COLORS.cream}-fg}Phase ${phase.phase}:{/} ${bar} {${BLESSED_COLORS.muted}-fg}(${completed}/${total}){/}${currentMark}`,
      );
    }

    lines.push("");
    lines.push(formatSectionHeader("CURRENT TASK"));

    // Find current task
    let currentTask: Task | undefined;
    for (const phase of this.phases) {
      const active = phase.tasks.find((t) => t.status === "in_progress");
      if (active) {
        currentTask = active;
        break;
      }
    }

    if (currentTask) {
      lines.push(`{${BLESSED_COLORS.cream}-fg}Task ${currentTask.id}:{/} {${BLESSED_COLORS.info}-fg}${currentTask.name}{/}`);
      lines.push(
        `{${BLESSED_COLORS.cream}-fg}Provider:{/} ${formatProviderBadge(currentTask.provider)}  {${BLESSED_COLORS.cream}-fg}Complexity:{/} ${formatComplexityBadge(currentTask.complexity)}  {${BLESSED_COLORS.cream}-fg}Status:{/} ${formatStatusBadge("in_progress")}`,
      );
    } else {
      lines.push(`{${BLESSED_COLORS.muted}-fg}No active task{/}`);
    }

    box.setContent(lines.join("\n"));
  }

  /**
   * Tab 2: Tasks
   */
  private createTasksWidget(): void {
    // Filter bar
    const filterBar = blessed.box({
      parent: this.contentArea,
      top: 0,
      left: 0,
      width: "100%",
      height: 2,
      tags: true,
      hidden: true,
    });
    this.updateFilterBar(filterBar);

    // Tasks table
    this.tasksList = blessed.listtable({
      parent: this.contentArea,
      top: 2,
      left: 0,
      width: "100%",
      height: "100%-2",
      tags: true,
      keys: true,
      vi: true,
      mouse: true,
      border: "line",
      style: {
        fg: BLESSED_COLORS.cream,
        border: { fg: BLESSED_COLORS.dimmed },
        header: { fg: BLESSED_COLORS.coral, bold: true },
        cell: { fg: BLESSED_COLORS.cream },
        selected: { bg: BLESSED_COLORS.shell, fg: BLESSED_COLORS.midnight },
      },
      scrollbar: {
        ch: "█",
        track: { bg: BLESSED_COLORS.dimmed },
        style: { inverse: true },
      },
      hidden: true,
    });

    this.updateTasksContent();

    // Store filterBar reference for showing/hiding
    (this.tasksList as any)._filterBar = filterBar;
  }

  private updateFilterBar(filterBar: blessed.Widgets.BoxElement): void {
    const filter = this.state.taskFilter || { status: "all", phase: "all", provider: "all" };
    filterBar.setContent(
      `Filter: [{${BLESSED_COLORS.cream}-fg}${filter.status.toUpperCase()}{/}▼]  Phase: [{${BLESSED_COLORS.cream}-fg}${filter.phase.toUpperCase()}{/}▼]  Provider: [{${BLESSED_COLORS.cream}-fg}${filter.provider.toUpperCase()}{/}▼]\n{${BLESSED_COLORS.muted}-fg}Press 'f' to change filter{/}`,
    );
  }

  private updateTasksContent(): void {
    if (!this.tasksList) return;

    const headers = ["", "ID", "NAME", "STATUS", "PROVIDER", "COMPLEXITY"];
    const rows: string[][] = [];

    let taskIndex = 0;
    for (const phase of this.phases) {
      // Phase header row
      const completed = phase.tasks.filter((t) => t.status === "completed").length;
      rows.push([
        "",
        `{${BLESSED_COLORS.coral}-fg}Phase ${phase.phase}{/}`,
        `{${BLESSED_COLORS.coral}-fg}${phase.name}{/}`,
        `{${BLESSED_COLORS.muted}-fg}${completed}/${phase.tasks.length}{/}`,
        "",
        "",
      ]);

      for (const task of phase.tasks) {
        const isSelected = taskIndex === (this.state.selectedTaskIndex || 0);
        const prefix = isSelected ? "▶" : " ";
        const statusIcon = getStatusIcon(task.status);

        rows.push([
          prefix,
          `{${BLESSED_COLORS.muted}-fg}${task.id}{/}`,
          task.name.length > 30 ? task.name.substring(0, 27) + "..." : task.name,
          `${statusIcon} ${task.status}`,
          formatProviderBadge(task.provider),
          formatComplexityBadge(task.complexity),
        ]);

        taskIndex++;
      }
    }

    this.tasksList.setData([headers, ...rows]);
  }

  /**
   * Tab 3: Logs
   */
  private createLogsWidget(): contrib.Widgets.LogElement {
    const log = contrib.log({
      parent: this.contentArea,
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      tags: true,
      bufferLength: 500,
      border: "line",
      label: " Logs ",
      style: {
        fg: BLESSED_COLORS.cream,
        border: { fg: BLESSED_COLORS.dimmed },
        label: { fg: BLESSED_COLORS.coral },
      },
      hidden: true,
    });

    // Add initial logs from buffer
    const logBuffer = this.state.logBuffer || [];
    for (const line of logBuffer) {
      log.log(line);
    }

    if (logBuffer.length === 0) {
      log.log(`{${BLESSED_COLORS.muted}-fg}(waiting for logs...){/}`);
      log.log("");
      log.log(`{${BLESSED_COLORS.muted}-fg}Logs will appear here when the project is running.{/}`);
    }

    return log;
  }

  /**
   * Tab 4: History
   */
  private createHistoryWidget(): void {
    // Iterations list (top half)
    this.historyList = blessed.listtable({
      parent: this.contentArea,
      top: 0,
      left: 0,
      width: "100%",
      height: "50%",
      tags: true,
      keys: true,
      vi: true,
      mouse: true,
      border: "line",
      label: " Iterations ",
      style: {
        fg: BLESSED_COLORS.cream,
        border: { fg: BLESSED_COLORS.dimmed },
        label: { fg: BLESSED_COLORS.coral },
        header: { fg: BLESSED_COLORS.coral, bold: true },
        selected: { bg: BLESSED_COLORS.shell, fg: BLESSED_COLORS.midnight },
      },
      scrollbar: {
        ch: "█",
        track: { bg: BLESSED_COLORS.dimmed },
        style: { inverse: true },
      },
      hidden: true,
    });

    // Detail box (bottom half)
    this.historyDetail = blessed.box({
      parent: this.contentArea,
      top: "50%",
      left: 0,
      width: "100%",
      height: "50%",
      tags: true,
      border: "line",
      label: " Iteration Details ",
      style: {
        fg: BLESSED_COLORS.cream,
        border: { fg: BLESSED_COLORS.dimmed },
        label: { fg: BLESSED_COLORS.coral },
      },
      scrollable: true,
      hidden: true,
    });

    this.updateHistoryContent();
  }

  private updateHistoryContent(): void {
    if (!this.historyList || !this.historyDetail) return;

    const headers = ["  #", "STATUS", "DURATION", "STARTED"];
    const rows: string[][] = [];

    for (let i = 0; i < this.iterations.length; i++) {
      const iter = this.iterations[i];
      const isSelected = i === (this.state.selectedIterationIndex || 0);
      const prefix = isSelected ? "▶" : " ";

      let status: string;
      if (iter.number === this.project.iteration && this.project.status === "running") {
        status = `{${BLESSED_COLORS.warning}-fg}Running{/}`;
      } else if (iter.exitCode === 0) {
        status = `{${BLESSED_COLORS.success}-fg}Pass{/}`;
      } else if (iter.exitCode === undefined) {
        status = `{${BLESSED_COLORS.muted}-fg}Unknown{/}`;
      } else {
        status = `{${BLESSED_COLORS.error}-fg}Fail{/}`;
      }

      const duration =
        iter.duration !== undefined
          ? `${Math.floor(iter.duration / 60)}m ${Math.round(iter.duration % 60)}s`
          : "-";

      rows.push([
        `${prefix} ${iter.number}`,
        status,
        duration,
        formatRelativeTime(this.project.lastActivity),
      ]);
    }

    if (rows.length === 0) {
      rows.push(["", `{${BLESSED_COLORS.muted}-fg}No iterations yet{/}`, "", ""]);
    }

    this.historyList.setData([headers, ...rows]);

    // Update detail box
    const selectedIter = this.iterations[this.state.selectedIterationIndex || 0];
    if (selectedIter) {
      const exitCodeDisplay =
        selectedIter.exitCode !== undefined
          ? selectedIter.exitCode === 0
            ? `{${BLESSED_COLORS.success}-fg}0{/}`
            : `{${BLESSED_COLORS.error}-fg}${selectedIter.exitCode}{/}`
          : `{${BLESSED_COLORS.muted}-fg}-{/}`;

      this.historyDetail.setContent(
        `{${BLESSED_COLORS.cream}-fg}Iteration:{/}  {${BLESSED_COLORS.shell}-fg}${selectedIter.number}{/}\n` +
          `{${BLESSED_COLORS.cream}-fg}Duration:{/}   {${BLESSED_COLORS.muted}-fg}${selectedIter.duration ? `${selectedIter.duration}s` : "Unknown"}{/}\n` +
          `{${BLESSED_COLORS.cream}-fg}Exit Code:{/}  ${exitCodeDisplay}\n\n` +
          `{${BLESSED_COLORS.muted}-fg}Press Enter to view iteration logs{/}`,
      );
    } else {
      this.historyDetail.setContent(`{${BLESSED_COLORS.muted}-fg}No iteration selected{/}`);
    }
  }

  /**
   * Tab 5: Config
   */
  private createConfigWidget(): blessed.Widgets.BoxElement {
    const box = blessed.box({
      parent: this.contentArea,
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      tags: true,
      scrollable: true,
      scrollbar: {
        ch: "█",
        track: { bg: BLESSED_COLORS.dimmed },
        style: { inverse: true },
      },
      keys: true,
      vi: true,
      border: "line",
      label: " Configuration ",
      style: {
        fg: BLESSED_COLORS.cream,
        border: { fg: BLESSED_COLORS.dimmed },
        label: { fg: BLESSED_COLORS.coral },
      },
      hidden: true,
    });

    this.updateConfigContent(box);
    return box;
  }

  private updateConfigContent(box: blessed.Widgets.BoxElement): void {
    // Load config
    let config: any = null;
    const configPath = path.join(this.project.path, "config.json");
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, "utf-8");
        config = JSON.parse(content);
      } catch {
        // Invalid config
      }
    }

    if (!config) {
      box.setContent(`{${BLESSED_COLORS.error}-fg}Unable to load project configuration.{/}`);
      return;
    }

    const lines: string[] = [];

    lines.push(`{${BLESSED_COLORS.coral}-fg}{bold}PROJECT{/bold}{/}`);
    lines.push(`{${BLESSED_COLORS.cream}-fg}Name:{/}        {${BLESSED_COLORS.shell}-fg}${config.name || this.project.name}{/}`);
    lines.push(`{${BLESSED_COLORS.cream}-fg}Description:{/} {${BLESSED_COLORS.muted}-fg}${config.description || this.project.description}{/}`);
    lines.push("");

    lines.push(`{${BLESSED_COLORS.coral}-fg}{bold}BUILDER{/bold}{/}`);
    lines.push(`{${BLESSED_COLORS.cream}-fg}Backend:{/}   {${BLESSED_COLORS.info}-fg}${config.builder?.backend || this.project.provider || "-"}{/}`);
    lines.push(`{${BLESSED_COLORS.cream}-fg}Auth Mode:{/} {${BLESSED_COLORS.muted}-fg}${config.builder?.auth_mode || "-"}{/}`);
    lines.push(`{${BLESSED_COLORS.cream}-fg}Model:{/}     {${BLESSED_COLORS.muted}-fg}${config.builder?.model || this.project.model || "-"}{/}`);
    lines.push(`{${BLESSED_COLORS.cream}-fg}Session:{/}   {${BLESSED_COLORS.muted}-fg}${config.builder?.session_mode || "-"}{/}`);
    lines.push("");

    lines.push(`{${BLESSED_COLORS.coral}-fg}{bold}REVIEWER{/bold}{/}`);
    if (config.reviewer?.enabled) {
      lines.push(`{${BLESSED_COLORS.cream}-fg}Enabled:{/}  {${BLESSED_COLORS.success}-fg}Yes{/}`);
      lines.push(`{${BLESSED_COLORS.cream}-fg}Backend:{/}  {${BLESSED_COLORS.info}-fg}${config.reviewer.backend || "-"}{/}`);
      lines.push(`{${BLESSED_COLORS.cream}-fg}Model:{/}    {${BLESSED_COLORS.muted}-fg}${config.reviewer.model || "-"}{/}`);
    } else {
      lines.push(`{${BLESSED_COLORS.cream}-fg}Enabled:{/}  {${BLESSED_COLORS.muted}-fg}No{/}`);
    }
    lines.push("");

    lines.push(`{${BLESSED_COLORS.coral}-fg}{bold}LOOP SETTINGS{/bold}{/}`);
    lines.push(`{${BLESSED_COLORS.cream}-fg}Max Iterations:{/}       {${BLESSED_COLORS.muted}-fg}${config.max_iterations === 0 ? "∞ (unlimited)" : config.max_iterations}{/}`);
    lines.push(`{${BLESSED_COLORS.cream}-fg}Completion Detection:{/} ${config.completion_enabled ? `{${BLESSED_COLORS.success}-fg}Yes{/}` : `{${BLESSED_COLORS.muted}-fg}No{/}`}`);
    lines.push(`{${BLESSED_COLORS.cream}-fg}Escalation:{/}           ${config.escalation?.enabled ? `{${BLESSED_COLORS.success}-fg}Yes{/}` : `{${BLESSED_COLORS.muted}-fg}No{/}`}`);
    lines.push("");

    lines.push(`{${BLESSED_COLORS.info}-fg}Press Enter or 'e' to edit config{/}`);

    box.setContent(lines.join("\n"));
  }

  /**
   * Switch to a different tab
   */
  public switchTab(tab: DetailTabName): void {
    // Hide all tab content
    if (this.overviewBox) this.overviewBox.hide();
    if (this.tasksList) {
      this.tasksList.hide();
      (this.tasksList as any)._filterBar?.hide();
    }
    if (this.logsViewer) this.logsViewer.hide();
    if (this.historyList) this.historyList.hide();
    if (this.historyDetail) this.historyDetail.hide();
    if (this.configBox) this.configBox.hide();

    // Show the selected tab
    switch (tab) {
      case "overview":
        if (this.overviewBox) {
          this.overviewBox.show();
          this.overviewBox.focus();
        }
        break;
      case "tasks":
        if (this.tasksList) {
          (this.tasksList as any)._filterBar?.show();
          this.tasksList.show();
          this.tasksList.focus();
        }
        break;
      case "logs":
        if (this.logsViewer) {
          this.logsViewer.show();
          this.logsViewer.focus();
        }
        break;
      case "history":
        if (this.historyList && this.historyDetail) {
          this.historyList.show();
          this.historyDetail.show();
          this.historyList.focus();
        }
        break;
      case "config":
        if (this.configBox) {
          this.configBox.show();
          this.configBox.focus();
        }
        break;
    }

    // Update tab bar
    updateTabBar(this.tabBar, tab);

    // Update status bar
    this.state = { ...this.state, detailTab: tab };
    updateProjectDetailStatusBar(this.statusBar, this.state);

    this.screen.render();
  }

  /**
   * Update data and refresh current tab
   */
  public updateData(state: AppState): void {
    this.state = state;
    this.loadData();

    const tab = state.detailTab || "overview";

    switch (tab) {
      case "overview":
        if (this.overviewBox) this.updateOverviewContent(this.overviewBox);
        break;
      case "tasks":
        this.updateTasksContent();
        break;
      case "logs":
        // Logs are updated via appendLogs
        break;
      case "history":
        this.updateHistoryContent();
        break;
      case "config":
        if (this.configBox) this.updateConfigContent(this.configBox);
        break;
    }

    updateProjectDetailStatusBar(this.statusBar, state);
    this.screen.render();
  }

  /**
   * Append new log lines
   */
  public appendLogs(lines: string[]): void {
    if (this.logsViewer) {
      for (const line of lines) {
        this.logsViewer.log(line);
      }
    }
  }

  /**
   * Focus the current tab widget
   */
  public focus(): void {
    const tab = this.state.detailTab || "overview";
    this.switchTab(tab);
  }

  /**
   * Get the tasks list for external event binding
   */
  public getTasksList(): blessed.Widgets.ListTableElement | null {
    return this.tasksList;
  }

  /**
   * Get the history list for external event binding
   */
  public getHistoryList(): blessed.Widgets.ListTableElement | null {
    return this.historyList;
  }

  /**
   * Get iterations data for external access
   */
  public getIterations(): typeof this.iterations {
    return this.iterations;
  }

  /**
   * Show task detail modal
   */
  public showTaskDetailModal(taskIndex: number): void {
    // Find task by index
    let currentIndex = 0;
    let selectedTask: Task | null = null;

    for (const phase of this.phases) {
      for (const task of phase.tasks) {
        if (currentIndex === taskIndex) {
          selectedTask = task;
          break;
        }
        currentIndex++;
      }
      if (selectedTask) break;
    }

    if (!selectedTask) return;

    const lines: string[] = [];
    lines.push(`{${BLESSED_COLORS.coral}-fg}{bold}TASK ${selectedTask.id}: ${selectedTask.name}{/bold}{/}`);
    lines.push("");
    lines.push(`{${BLESSED_COLORS.cream}-fg}Status:{/}     ${formatStatusBadge(selectedTask.status)}`);
    lines.push(`{${BLESSED_COLORS.cream}-fg}Provider:{/}   ${formatProviderBadge(selectedTask.provider)}`);
    lines.push(`{${BLESSED_COLORS.cream}-fg}Complexity:{/} ${formatComplexityBadge(selectedTask.complexity)}`);
    lines.push("");
    lines.push(`{${BLESSED_COLORS.coral}-fg}Description{/}`);
    lines.push(selectedTask.description);
    lines.push("");
    lines.push(`{${BLESSED_COLORS.cream}-fg}Dependencies:{/} {${BLESSED_COLORS.muted}-fg}${selectedTask.depends_on.length > 0 ? selectedTask.depends_on.join(", ") : "None"}{/}`);

    if (selectedTask.acceptance_criteria && selectedTask.acceptance_criteria.length > 0) {
      lines.push("");
      lines.push(`{${BLESSED_COLORS.coral}-fg}Acceptance Criteria{/}`);
      for (const criteria of selectedTask.acceptance_criteria) {
        lines.push(`  {${BLESSED_COLORS.muted}-fg}•{/} ${criteria}`);
      }
    }

    if (selectedTask.files_to_create && selectedTask.files_to_create.length > 0) {
      lines.push("");
      lines.push(`{${BLESSED_COLORS.coral}-fg}Files to Create{/}`);
      for (const file of selectedTask.files_to_create) {
        lines.push(`  {${BLESSED_COLORS.info}-fg}• ${file}{/}`);
      }
    }

    if (selectedTask.files_to_modify && selectedTask.files_to_modify.length > 0) {
      lines.push("");
      lines.push(`{${BLESSED_COLORS.coral}-fg}Files to Modify{/}`);
      for (const file of selectedTask.files_to_modify) {
        lines.push(`  {${BLESSED_COLORS.warning}-fg}• ${file}{/}`);
      }
    }

    lines.push("");
    lines.push(`{${BLESSED_COLORS.muted}-fg}Press Esc, q, or Enter to close{/}`);

    createModal(this.screen, {
      title: `TASK ${selectedTask.id}`,
      content: lines.join("\n"),
      width: "80%",
      height: "80%",
    });
  }

  /**
   * Show iteration log modal
   */
  private iterationLogModal: blessed.Widgets.BoxElement | null = null;

  public showIterationLogModal(iterationNumber: number, content: string): void {
    // Close existing modal if any
    this.iterationLogModal?.destroy();

    this.iterationLogModal = blessed.box({
      parent: this.screen,
      top: "center",
      left: "center",
      width: "90%",
      height: "90%",
      border: "line",
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      mouse: true,
      tags: true,
      content: content,
      label: ` Iteration #${iterationNumber} Log `,
      style: {
        fg: BLESSED_COLORS.cream,
        border: { fg: BLESSED_COLORS.coral },
        label: { fg: BLESSED_COLORS.coral },
      },
    });

    this.iterationLogModal.key(["escape", "q", "enter"], () => {
      this.iterationLogModal?.destroy();
      this.iterationLogModal = null;
      this.screen.render();
    });

    this.iterationLogModal.focus();
    this.screen.render();
  }
}
