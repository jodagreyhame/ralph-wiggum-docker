/**
 * Config Editor Widget (blessed)
 * Container with 6 tabs: Project, Builder, Reviewer, Architect, Loop, Summary
 * Uses actual blessed textbox widgets for text input
 */

import blessed from "blessed";
import type { Backend } from "../../../config/schema.js";
import { BACKENDS } from "../../../config/schema.js";
import type { AppState, TabName } from "../../state.js";
import { getFieldCount } from "../../state.js";
import { BLESSED_COLORS, formatDecorativeHeader } from "../theme.js";
import {
  createConfigEditorTabBar,
  updateConfigEditorTabBar,
} from "./ConfigEditorTabBar.js";

export interface ConfigEditorOptions {
  parent: blessed.Widgets.Screen;
}

// Callback type for state updates
export type StateUpdateCallback = (updater: (state: AppState) => AppState) => void;

/**
 * Config Editor Container - manages all 6 config tabs
 */
export class ConfigEditorContainer {
  private screen: blessed.Widgets.Screen;
  private state: AppState;
  private isNewProject: boolean;
  private onStateUpdate: StateUpdateCallback | null = null;

  // Widgets
  private headerBox: blessed.Widgets.BoxElement;
  private tabBar: blessed.Widgets.BoxElement;
  private contentArea: blessed.Widgets.BoxElement;
  private statusBar: blessed.Widgets.BoxElement;

  // Text input widgets
  private nameInput: blessed.Widgets.TextboxElement | null = null;
  private descInput: blessed.Widgets.TextboxElement | null = null;
  private maxIterInput: blessed.Widgets.TextboxElement | null = null;

  constructor(options: ConfigEditorOptions, state: AppState, isNewProject: boolean) {
    this.screen = options.parent;
    this.state = state;
    this.isNewProject = isNewProject;

    // Create header with decorative border
    const headerLines = formatDecorativeHeader(
      isNewProject ? "NEW PROJECT" : "EDIT CONFIG",
      isNewProject ? "Create a new Ralph project" : `Editing: ${state.config.name}`,
    );

    this.headerBox = blessed.box({
      parent: this.screen,
      top: 0,
      left: "center",
      width: "100%",
      height: 3,
      content: `{center}${headerLines.join("\n")}{/center}`,
      tags: true,
    });

    // Create tab bar
    this.tabBar = createConfigEditorTabBar(
      { parent: this.screen, top: 3 },
      state.activeTab,
    );

    // Create content area
    this.contentArea = blessed.box({
      parent: this.screen,
      top: 5,
      left: 0,
      width: "100%",
      height: "100%-8",
      tags: true,
      scrollable: true,
      scrollbar: {
        ch: "\u2588",
        track: { bg: BLESSED_COLORS.dimmed },
        style: { inverse: true },
      },
    });

    // Create status bar
    this.statusBar = blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 0,
      width: "100%",
      height: 2,
      tags: true,
    });

    // Initial render
    this.renderCurrentTab();
    this.updateStatusBar();
  }

  /**
   * Set callback for state updates from input widgets
   */
  setStateUpdateCallback(callback: StateUpdateCallback): void {
    this.onStateUpdate = callback;
  }

  /**
   * Switch to a different tab
   */
  switchTab(tab: TabName): void {
    this.destroyInputWidgets();
    this.state = { ...this.state, activeTab: tab, focusedField: 0, dropdownOpen: false };
    updateConfigEditorTabBar(this.tabBar, tab);
    this.renderCurrentTab();
    this.updateStatusBar();
    this.screen.render();
  }

  /**
   * Update with new state
   */
  updateData(state: AppState): void {
    const tabChanged = this.state.activeTab !== state.activeTab;
    this.state = state;
    updateConfigEditorTabBar(this.tabBar, state.activeTab);

    if (tabChanged) {
      this.destroyInputWidgets();
    }

    this.renderCurrentTab();
    this.updateStatusBar();
  }

  /**
   * Get current state
   */
  getState(): AppState {
    return this.state;
  }

  /**
   * Focus the appropriate input for the current field
   */
  focusCurrentInput(): void {
    if (this.state.activeTab === "project") {
      if (this.state.focusedField === 0 && this.nameInput) {
        this.nameInput.focus();
        this.nameInput.readInput();
      } else if (this.state.focusedField === 1 && this.descInput) {
        this.descInput.focus();
        this.descInput.readInput();
      }
    } else if (this.state.activeTab === "loop" && this.state.focusedField === 0 && this.maxIterInput) {
      this.maxIterInput.focus();
      this.maxIterInput.readInput();
    }
  }

  /**
   * Destroy input widgets before switching tabs
   */
  private destroyInputWidgets(): void {
    if (this.nameInput) {
      this.nameInput.destroy();
      this.nameInput = null;
    }
    if (this.descInput) {
      this.descInput.destroy();
      this.descInput = null;
    }
    if (this.maxIterInput) {
      this.maxIterInput.destroy();
      this.maxIterInput = null;
    }
  }

  /**
   * Render the current tab content
   */
  private renderCurrentTab(): void {
    // Clear content area children
    for (const child of [...this.contentArea.children]) {
      child.destroy();
    }

    switch (this.state.activeTab) {
      case "project":
        this.renderProjectTab();
        break;
      case "builder":
        this.renderBuilderTab();
        break;
      case "reviewer":
        this.renderReviewerTab();
        break;
      case "architect":
        this.renderArchitectTab();
        break;
      case "loop":
        this.renderLoopTab();
        break;
      case "summary":
        this.renderSummaryTab();
        break;
    }
  }

  /**
   * Create a text input field
   */
  private createTextInput(
    top: number,
    label: string,
    value: string,
    placeholder: string,
    onSubmit: (value: string) => void,
  ): blessed.Widgets.TextboxElement {
    // Label
    blessed.box({
      parent: this.contentArea,
      top,
      left: 2,
      width: 20,
      height: 1,
      content: `{${BLESSED_COLORS.muted}-fg}${label}:{/}`,
      tags: true,
    });

    // Input box
    const input = blessed.textbox({
      parent: this.contentArea,
      top,
      left: 22,
      width: "50%",
      height: 1,
      inputOnFocus: true,
      keys: true,
      mouse: true,
      value: value,
      style: {
        fg: BLESSED_COLORS.cream,
        bg: BLESSED_COLORS.dimmed,
        focus: {
          fg: BLESSED_COLORS.midnight,
          bg: BLESSED_COLORS.coral,
        },
      },
    });

    // Show placeholder if empty
    if (!value && placeholder) {
      input.setValue(placeholder);
      input.style.fg = BLESSED_COLORS.muted;
    }

    input.on("submit", (val: string) => {
      // Clear placeholder on submit if it was the placeholder
      const finalValue = val === placeholder ? "" : val;
      onSubmit(finalValue);
      this.screen.render();
    });

    input.on("cancel", () => {
      // Restore original value and blur the input
      input.setValue(value || placeholder);
      if (!value && placeholder) {
        input.style.fg = BLESSED_COLORS.muted;
      }
      this.screen.render();
    });

    input.on("focus", () => {
      // Clear placeholder on focus
      if (input.getValue() === placeholder) {
        input.setValue("");
        input.style.fg = BLESSED_COLORS.cream;
      }
    });

    input.on("blur", () => {
      // Restore placeholder if empty
      const val = input.getValue();
      if (!val && placeholder) {
        input.setValue(placeholder);
        input.style.fg = BLESSED_COLORS.muted;
      }
    });

    return input;
  }

  /**
   * Render toggle field
   */
  private formatToggle(label: string, value: boolean, isFocused: boolean): string {
    const prefix = isFocused ? `{${BLESSED_COLORS.coral}-fg}> {/}` : "  ";
    const toggle = value
      ? `{${BLESSED_COLORS.success}-fg}[ON]{/}`
      : `{${BLESSED_COLORS.muted}-fg}[OFF]{/}`;
    return `${prefix}{${BLESSED_COLORS.muted}-fg}${label}:{/} ${toggle}`;
  }

  /**
   * Render provider cards
   */
  private formatProviderCards(selectedBackend: Backend, isFocused: boolean): string[] {
    const lines: string[] = [];
    const prefix = isFocused ? `{${BLESSED_COLORS.coral}-fg}> {/}` : "  ";

    lines.push(`${prefix}{${BLESSED_COLORS.muted}-fg}Backend (press 1-5):{/}`);

    const cardLine = BACKENDS.map((b, i) => {
      const isSelected = b.id === selectedBackend;
      const num = i + 1;
      if (isSelected) {
        return `{${BLESSED_COLORS.coral}-bg}{${BLESSED_COLORS.midnight}-fg} [${num}] ${b.name} {/}`;
      }
      return `{${BLESSED_COLORS.dimmed}-fg}[${num}] ${b.name}{/}`;
    }).join("  ");

    lines.push(`    ${cardLine}`);
    return lines;
  }

  /**
   * Render dropdown
   */
  private formatDropdown(
    label: string,
    items: { id: string; label: string }[],
    selected: string,
    isOpen: boolean,
    isFocused: boolean,
  ): string[] {
    const lines: string[] = [];
    const prefix = isFocused ? `{${BLESSED_COLORS.coral}-fg}> {/}` : "  ";
    const arrow = isOpen ? "\u25BC" : "\u25B6";

    const selectedItem = items.find(i => i.id === selected);
    const displayValue = selectedItem?.label || selected;

    lines.push(`${prefix}{${BLESSED_COLORS.muted}-fg}${label}:{/} ${displayValue} {${BLESSED_COLORS.muted}-fg}${arrow}{/}`);

    if (isOpen) {
      for (const item of items) {
        const isSelectedItem = item.id === selected;
        if (isSelectedItem) {
          lines.push(`      {${BLESSED_COLORS.coral}-fg}\u25CF ${item.label}{/}`);
        } else {
          lines.push(`      {${BLESSED_COLORS.muted}-fg}\u25CB ${item.label}{/}`);
        }
      }
    }

    return lines;
  }

  /**
   * Project tab - name and description with actual text inputs
   */
  private renderProjectTab(): void {
    // Title
    blessed.box({
      parent: this.contentArea,
      top: 1,
      left: 2,
      width: "100%-4",
      height: 1,
      content: `{${BLESSED_COLORS.coral}-fg}PROJECT DETAILS{/}`,
      tags: true,
    });

    // Instructions
    blessed.box({
      parent: this.contentArea,
      top: 3,
      left: 2,
      width: "100%-4",
      height: 1,
      content: `{${BLESSED_COLORS.muted}-fg}Press Enter on a field to edit, Esc when done{/}`,
      tags: true,
    });

    // Name input
    this.nameInput = this.createTextInput(
      5,
      "Name",
      this.state.config.name,
      "my-project",
      (value) => {
        if (this.onStateUpdate) {
          this.onStateUpdate((s) => ({
            ...s,
            config: { ...s.config, name: value },
          }));
        }
      },
    );

    // Description input
    this.descInput = this.createTextInput(
      7,
      "Description",
      this.state.config.description,
      "Project description",
      (value) => {
        if (this.onStateUpdate) {
          this.onStateUpdate((s) => ({
            ...s,
            config: { ...s.config, description: value },
          }));
        }
      },
    );

    // Field indicators
    const nameIndicator = this.state.focusedField === 0 ? `{${BLESSED_COLORS.coral}-fg}>{/}` : " ";
    const descIndicator = this.state.focusedField === 1 ? `{${BLESSED_COLORS.coral}-fg}>{/}` : " ";

    blessed.box({
      parent: this.contentArea,
      top: 5,
      left: 0,
      width: 2,
      height: 1,
      content: nameIndicator,
      tags: true,
    });

    blessed.box({
      parent: this.contentArea,
      top: 7,
      left: 0,
      width: 2,
      height: 1,
      content: descIndicator,
      tags: true,
    });
  }

  /**
   * Builder tab - backend and auth
   */
  private renderBuilderTab(): void {
    const backend = BACKENDS.find(b => b.id === this.state.config.builder.backend);
    const authModes = backend?.authModes.map(am => ({ id: am, label: am })) || [];

    const lines: string[] = [
      "",
      `{${BLESSED_COLORS.coral}-fg}BUILDER CONFIGURATION{/}`,
      "",
      ...this.formatProviderCards(this.state.config.builder.backend, this.state.focusedField === 0),
      "",
      ...this.formatDropdown(
        "Auth Mode",
        authModes,
        this.state.config.builder.auth_mode,
        this.state.dropdownOpen && this.state.focusedField === 1,
        this.state.focusedField === 1,
      ),
      "",
    ];

    this.contentArea.setContent(lines.join("\n"));
  }

  /**
   * Reviewer tab - enable, backend, auth
   */
  private renderReviewerTab(): void {
    const lines: string[] = [
      "",
      `{${BLESSED_COLORS.coral}-fg}REVIEWER CONFIGURATION{/}`,
      "",
      this.formatToggle("Enable Reviewer", this.state.config.reviewer.enabled, this.state.focusedField === 0),
      "",
    ];

    if (this.state.config.reviewer.enabled) {
      const backend = BACKENDS.find(b => b.id === this.state.config.reviewer.backend);
      const authModes = backend?.authModes.map(am => ({ id: am, label: am })) || [];

      lines.push(
        ...this.formatProviderCards(this.state.config.reviewer.backend, this.state.focusedField === 1),
        "",
        ...this.formatDropdown(
          "Auth Mode",
          authModes,
          this.state.config.reviewer.auth_mode,
          this.state.dropdownOpen && this.state.focusedField === 2,
          this.state.focusedField === 2,
        ),
        "",
      );
    }

    this.contentArea.setContent(lines.join("\n"));
  }

  /**
   * Architect tab - enable, backend, auth
   */
  private renderArchitectTab(): void {
    const lines: string[] = [
      "",
      `{${BLESSED_COLORS.coral}-fg}ARCHITECT CONFIGURATION{/}`,
      "",
      this.formatToggle("Enable Architect", this.state.config.architect.enabled, this.state.focusedField === 0),
      "",
    ];

    if (this.state.config.architect.enabled) {
      const backend = BACKENDS.find(b => b.id === this.state.config.architect.backend);
      const authModes = backend?.authModes.map(am => ({ id: am, label: am })) || [];

      lines.push(
        ...this.formatProviderCards(this.state.config.architect.backend, this.state.focusedField === 1),
        "",
        ...this.formatDropdown(
          "Auth Mode",
          authModes,
          this.state.config.architect.auth_mode,
          this.state.dropdownOpen && this.state.focusedField === 2,
          this.state.focusedField === 2,
        ),
        "",
      );
    }

    this.contentArea.setContent(lines.join("\n"));
  }

  /**
   * Loop tab - max iterations, completion, escalation
   */
  private renderLoopTab(): void {
    // Title
    blessed.box({
      parent: this.contentArea,
      top: 1,
      left: 2,
      width: "100%-4",
      height: 1,
      content: `{${BLESSED_COLORS.coral}-fg}LOOP CONFIGURATION{/}`,
      tags: true,
    });

    // Max iterations input
    const maxIterValue = this.state.config.max_iterations === 0 ? "" : String(this.state.config.max_iterations);
    this.maxIterInput = this.createTextInput(
      3,
      "Max Iterations",
      maxIterValue,
      "0 for infinite",
      (value) => {
        const num = parseInt(value, 10);
        if (this.onStateUpdate) {
          this.onStateUpdate((s) => ({
            ...s,
            config: { ...s.config, max_iterations: isNaN(num) ? 0 : num },
          }));
        }
      },
    );

    // Field indicator for max iterations
    const maxIterIndicator = this.state.focusedField === 0 ? `{${BLESSED_COLORS.coral}-fg}>{/}` : " ";
    blessed.box({
      parent: this.contentArea,
      top: 3,
      left: 0,
      width: 2,
      height: 1,
      content: maxIterIndicator,
      tags: true,
    });

    // Toggle fields as static text
    const completionLine = this.formatToggle("Completion Detection", this.state.config.completion_enabled, this.state.focusedField === 1);
    const escalationLine = this.formatToggle("Escalation", this.state.config.escalation.enabled, this.state.focusedField === 2);

    blessed.box({
      parent: this.contentArea,
      top: 5,
      left: 0,
      width: "100%",
      height: 1,
      content: completionLine,
      tags: true,
    });

    blessed.box({
      parent: this.contentArea,
      top: 7,
      left: 0,
      width: "100%",
      height: 1,
      content: escalationLine,
      tags: true,
    });
  }

  /**
   * Summary tab - review and action buttons
   */
  private renderSummaryTab(): void {
    const cfg = this.state.config;
    const action = this.isNewProject ? "Create" : "Update";

    const lines: string[] = [
      "",
      `{${BLESSED_COLORS.coral}-fg}CONFIGURATION SUMMARY{/}`,
      "",
      `  {${BLESSED_COLORS.muted}-fg}Name:{/} ${cfg.name || "(not set)"}`,
      `  {${BLESSED_COLORS.muted}-fg}Description:{/} ${cfg.description || "(not set)"}`,
      "",
      `  {${BLESSED_COLORS.muted}-fg}Builder:{/}`,
      `    Backend: {${BLESSED_COLORS.coral}-fg}${cfg.builder.backend}{/}`,
      `    Auth: ${cfg.builder.auth_mode}`,
      "",
    ];

    if (cfg.reviewer.enabled) {
      lines.push(
        `  {${BLESSED_COLORS.muted}-fg}Reviewer:{/}`,
        `    Backend: {${BLESSED_COLORS.coral}-fg}${cfg.reviewer.backend}{/}`,
        `    Auth: ${cfg.reviewer.auth_mode}`,
        "",
      );
    } else {
      lines.push(`  {${BLESSED_COLORS.muted}-fg}Reviewer: disabled{/}`, "");
    }

    if (cfg.architect.enabled) {
      lines.push(
        `  {${BLESSED_COLORS.muted}-fg}Architect:{/}`,
        `    Backend: {${BLESSED_COLORS.coral}-fg}${cfg.architect.backend}{/}`,
        `    Auth: ${cfg.architect.auth_mode}`,
        "",
      );
    } else {
      lines.push(`  {${BLESSED_COLORS.muted}-fg}Architect: disabled{/}`, "");
    }

    const maxIter = cfg.max_iterations === 0 ? "infinite" : String(cfg.max_iterations);
    const completion = cfg.completion_enabled
      ? `{${BLESSED_COLORS.success}-fg}enabled{/}`
      : `{${BLESSED_COLORS.muted}-fg}disabled{/}`;
    const escalation = cfg.escalation.enabled
      ? `{${BLESSED_COLORS.success}-fg}enabled{/}`
      : `{${BLESSED_COLORS.muted}-fg}disabled{/}`;

    lines.push(
      `  {${BLESSED_COLORS.muted}-fg}Loop:{/}`,
      `    Max iterations: ${maxIter}`,
      `    Completion: ${completion}`,
      `    Escalation: ${escalation}`,
      "",
      "",
    );

    // Action buttons
    const createBtn = this.state.summaryButton === 0
      ? `{${BLESSED_COLORS.coral}-fg}[ ${action} Project ]{/}`
      : `{${BLESSED_COLORS.muted}-fg}[ ${action} Project ]{/}`;
    const cancelBtn = this.state.summaryButton === 1
      ? `{${BLESSED_COLORS.coral}-fg}[ Cancel ]{/}`
      : `{${BLESSED_COLORS.muted}-fg}[ Cancel ]{/}`;

    lines.push(`  ${createBtn}    ${cancelBtn}`, "");

    this.contentArea.setContent(lines.join("\n"));
  }

  /**
   * Update status bar with current position and hints
   */
  private updateStatusBar(): void {
    const tabIndex = ["project", "builder", "reviewer", "architect", "loop", "summary"].indexOf(this.state.activeTab) + 1;
    const fieldCount = getFieldCount(this.state);
    const fieldIndex = this.state.focusedField + 1;

    const tabNames: Record<TabName, string> = {
      project: "Project Details",
      builder: "Builder Config",
      reviewer: "Reviewer Config",
      architect: "Architect Config",
      loop: "Loop Settings",
      summary: "Summary",
    };

    const infoLine = `{${BLESSED_COLORS.coral}-fg}Tab ${tabIndex}/6{/} {${BLESSED_COLORS.dimmed}-fg}|{/} {${BLESSED_COLORS.muted}-fg}Field ${fieldIndex}/${fieldCount}{/} {${BLESSED_COLORS.dimmed}-fg}|{/} {${BLESSED_COLORS.cream}-fg}${tabNames[this.state.activeTab]}{/}`;

    let keysLine: string;
    if (this.state.activeTab === "project" || (this.state.activeTab === "loop" && this.state.focusedField === 0)) {
      keysLine = `{${BLESSED_COLORS.muted}-fg}Enter Edit Field | Tab Next Tab | Esc Cancel/Back{/}`;
    } else if (this.state.activeTab === "summary") {
      keysLine = `{${BLESSED_COLORS.muted}-fg}Left/Right Select Button | Enter Confirm | Esc Back{/}`;
    } else if (this.state.dropdownOpen) {
      keysLine = `{${BLESSED_COLORS.muted}-fg}Up/Down Navigate | Enter Select | Esc Close{/}`;
    } else {
      keysLine = `{${BLESSED_COLORS.muted}-fg}Up/Down Navigate | Tab Next Tab | Enter/Space Edit | Esc Back{/}`;
    }

    this.statusBar.setContent(`${infoLine}\n${keysLine}`);
  }
}
