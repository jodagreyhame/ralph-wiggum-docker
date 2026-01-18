/**
 * TUI State Management (no React)
 * Clawdbot-compatible
 */

import type { ProjectConfig, Backend, AuthMode } from "../config/schema.js";
import { createDefaultConfig } from "../config/defaults.js";
import type { ProjectInfo } from "../utils/project-status.js";

// Config editor tabs (existing)
export type TabName = "project" | "builder" | "reviewer" | "architect" | "loop" | "summary";

export const TABS: TabName[] = ["project", "builder", "reviewer", "architect", "loop", "summary"];

// Screen types for navigation
export type ScreenType = "projects-list" | "project-detail" | "config-editor";

// Project detail tabs
export type DetailTabName = "overview" | "tasks" | "logs" | "history" | "config";

export const DETAIL_TABS: DetailTabName[] = ["overview", "tasks", "logs", "history", "config"];

// List view modes
export type ListViewMode = "compact" | "expanded";

export interface AppState {
  // === Existing config editor fields (keep for backward compatibility) ===
  activeTab: TabName;
  config: ProjectConfig;
  isEditing: boolean;
  focusedField: number;
  dropdownOpen: boolean;
  summaryButton: number;
  message: { text: string; type: "success" | "error" } | null;

  // === New dashboard fields ===
  // Screen navigation
  currentScreen: ScreenType;
  navigationStack: ScreenType[];

  // Projects list screen
  projects?: ProjectInfo[];
  selectedProjectIndex?: number;
  listViewMode?: ListViewMode;

  // Project detail screen
  selectedProject?: ProjectInfo;
  detailTab?: DetailTabName;

  // Tasks tab state
  taskFilter?: { status: string; phase: string; provider: string };
  selectedTaskIndex?: number;
  taskDetailOpen?: boolean;

  // Logs tab state
  logBuffer?: string[];
  logPosition?: number;
  logAutoScroll?: boolean;

  // History tab state
  selectedIterationIndex?: number;

  // Modal state
  helpOpen?: boolean;
  deleteConfirmOpen?: boolean;
  filterDropdownOpen?: boolean;

  // Auto-refresh
  autoRefresh?: boolean;
}

export function createAppState(initialConfig?: ProjectConfig): AppState {
  return {
    activeTab: "project",
    config: initialConfig || createDefaultConfig("my-project"),
    isEditing: !!initialConfig,
    focusedField: 0,
    dropdownOpen: false,
    summaryButton: 0,
    message: null,

    // New dashboard fields
    currentScreen: "projects-list",
    navigationStack: [],
    projects: [],
    selectedProjectIndex: 0,
    listViewMode: "compact",
    selectedProject: undefined,
    detailTab: "overview",
    taskFilter: { status: "all", phase: "all", provider: "all" },
    selectedTaskIndex: 0,
    taskDetailOpen: false,
    logBuffer: [],
    logPosition: 0,
    logAutoScroll: true,
    selectedIterationIndex: 0,
    helpOpen: false,
    deleteConfirmOpen: false,
    filterDropdownOpen: false,
    autoRefresh: true,
  };
}

// State mutation functions
export function setActiveTab(state: AppState, tab: TabName): AppState {
  return { ...state, activeTab: tab, focusedField: 0, dropdownOpen: false };
}

export function nextTab(state: AppState): AppState {
  const idx = TABS.indexOf(state.activeTab);
  const next = TABS[Math.min(idx + 1, TABS.length - 1)];
  return { ...state, activeTab: next, focusedField: 0, dropdownOpen: false };
}

export function prevTab(state: AppState): AppState {
  const idx = TABS.indexOf(state.activeTab);
  const prev = TABS[Math.max(idx - 1, 0)];
  return { ...state, activeTab: prev, focusedField: 0, dropdownOpen: false };
}

export function setFocusedField(state: AppState, field: number): AppState {
  return { ...state, focusedField: field };
}

export function toggleDropdown(state: AppState): AppState {
  return { ...state, dropdownOpen: !state.dropdownOpen };
}

export function setSummaryButton(state: AppState, button: number): AppState {
  return { ...state, summaryButton: button };
}

export function setMessage(state: AppState, message: AppState["message"]): AppState {
  return { ...state, message };
}

export function clearMessage(state: AppState): AppState {
  return { ...state, message: null };
}

// Config mutations
export function setProjectName(state: AppState, name: string): AppState {
  return {
    ...state,
    config: { ...state.config, name },
  };
}

export function setProjectDescription(state: AppState, description: string): AppState {
  return {
    ...state,
    config: { ...state.config, description },
  };
}

export function setBuilderBackend(state: AppState, backend: Backend): AppState {
  return {
    ...state,
    config: {
      ...state.config,
      builder: { ...state.config.builder, backend },
    },
  };
}

export function setBuilderAuth(state: AppState, auth_mode: AuthMode): AppState {
  return {
    ...state,
    config: {
      ...state.config,
      builder: { ...state.config.builder, auth_mode },
    },
  };
}

export function setReviewerEnabled(state: AppState, enabled: boolean): AppState {
  return {
    ...state,
    config: {
      ...state.config,
      reviewer: { ...state.config.reviewer, enabled },
    },
  };
}

export function setReviewerBackend(state: AppState, backend: Backend): AppState {
  return {
    ...state,
    config: {
      ...state.config,
      reviewer: { ...state.config.reviewer, backend },
    },
  };
}

export function setReviewerAuth(state: AppState, auth_mode: AuthMode): AppState {
  return {
    ...state,
    config: {
      ...state.config,
      reviewer: { ...state.config.reviewer, auth_mode },
    },
  };
}

export function setArchitectEnabled(state: AppState, enabled: boolean): AppState {
  return {
    ...state,
    config: {
      ...state.config,
      architect: { ...state.config.architect, enabled },
    },
  };
}

export function setArchitectBackend(state: AppState, backend: Backend): AppState {
  return {
    ...state,
    config: {
      ...state.config,
      architect: { ...state.config.architect, backend },
    },
  };
}

export function setArchitectAuth(state: AppState, auth_mode: AuthMode): AppState {
  return {
    ...state,
    config: {
      ...state.config,
      architect: { ...state.config.architect, auth_mode },
    },
  };
}

export function setEscalationEnabled(state: AppState, enabled: boolean): AppState {
  return {
    ...state,
    config: {
      ...state.config,
      escalation: { ...state.config.escalation, enabled },
    },
  };
}

export function setMaxIterations(state: AppState, max_iterations: number): AppState {
  return {
    ...state,
    config: { ...state.config, max_iterations },
  };
}

export function setCompletionEnabled(state: AppState, completion_enabled: boolean): AppState {
  return {
    ...state,
    config: { ...state.config, completion_enabled },
  };
}

// Field count per tab
export function getFieldCount(state: AppState): number {
  switch (state.activeTab) {
    case "project":
      return 2;
    case "builder":
      return 2;
    case "reviewer":
      return state.config.reviewer.enabled ? 3 : 1;
    case "architect":
      return state.config.architect.enabled ? 3 : 1;
    case "loop":
      return 3;
    case "summary":
      return 2;
    default:
      return 1;
  }
}

// === New state mutation functions for dashboard ===

// Screen navigation
export function setScreen(state: AppState, screen: ScreenType): AppState {
  return {
    ...state,
    currentScreen: screen,
    navigationStack: [...state.navigationStack, screen],
    helpOpen: false,
    deleteConfirmOpen: false,
    filterDropdownOpen: false,
  };
}

export function pushScreen(state: AppState, screen: ScreenType): AppState {
  return {
    ...state,
    currentScreen: screen,
    navigationStack: [...state.navigationStack, screen],
  };
}

export function popScreen(state: AppState): AppState {
  const stack = [...state.navigationStack];
  stack.pop();
  const previousScreen = stack[stack.length - 1] || "projects-list";
  return {
    ...state,
    currentScreen: previousScreen,
    navigationStack: stack,
    helpOpen: false,
    deleteConfirmOpen: false,
    filterDropdownOpen: false,
  };
}

// Projects list
export function setProjects(state: AppState, projects: ProjectInfo[]): AppState {
  return { ...state, projects };
}

export function setSelectedProjectIndex(state: AppState, index: number): AppState {
  return { ...state, selectedProjectIndex: index };
}

export function toggleListView(state: AppState): AppState {
  return {
    ...state,
    listViewMode: state.listViewMode === "compact" ? "expanded" : "compact",
  };
}

export function navigateProjects(state: AppState, direction: "up" | "down"): AppState {
  const maxIndex = (state.projects?.length || 1) - 1;
  const currentIndex = state.selectedProjectIndex || 0;

  let newIndex: number;
  if (direction === "up") {
    newIndex = Math.max(0, currentIndex - 1);
  } else {
    newIndex = Math.min(maxIndex, currentIndex + 1);
  }

  return { ...state, selectedProjectIndex: newIndex };
}

// Project detail
export function setSelectedProject(state: AppState, project: ProjectInfo): AppState {
  return {
    ...state,
    selectedProject: project,
    detailTab: "overview",
    logBuffer: [],
    logPosition: 0,
  };
}

export function setDetailTab(state: AppState, tab: DetailTabName): AppState {
  return {
    ...state,
    detailTab: tab,
    filterDropdownOpen: false,
  };
}

export function nextDetailTab(state: AppState): AppState {
  const idx = DETAIL_TABS.indexOf(state.detailTab || "overview");
  const next = DETAIL_TABS[(idx + 1) % DETAIL_TABS.length];
  return { ...state, detailTab: next, filterDropdownOpen: false };
}

export function prevDetailTab(state: AppState): AppState {
  const idx = DETAIL_TABS.indexOf(state.detailTab || "overview");
  const prev = DETAIL_TABS[idx === 0 ? DETAIL_TABS.length - 1 : idx - 1];
  return { ...state, detailTab: prev, filterDropdownOpen: false };
}

// Logs
export function appendLogs(state: AppState, lines: string[]): AppState {
  const maxLogLines = 500;
  const newBuffer = [...(state.logBuffer || []), ...lines];
  if (newBuffer.length > maxLogLines) {
    return { ...state, logBuffer: newBuffer.slice(-maxLogLines) };
  }
  return { ...state, logBuffer: newBuffer };
}

export function setLogPosition(state: AppState, position: number): AppState {
  return { ...state, logPosition: position };
}

export function toggleAutoScroll(state: AppState): AppState {
  return { ...state, logAutoScroll: !state.logAutoScroll };
}

// Tasks
export function setTaskFilter(state: AppState, filterType: string, value: string): AppState {
  return {
    ...state,
    taskFilter: { ...state.taskFilter!, [filterType]: value },
  };
}

export function setSelectedTaskIndex(state: AppState, index: number): AppState {
  return { ...state, selectedTaskIndex: index };
}

export function navigateTasks(state: AppState, direction: "up" | "down"): AppState {
  // This will be called with actual task count from render
  return {
    ...state,
    selectedTaskIndex: Math.max(0, (state.selectedTaskIndex || 0) + (direction === "up" ? -1 : 1)),
  };
}

export function toggleTaskDetail(state: AppState): AppState {
  return { ...state, taskDetailOpen: !state.taskDetailOpen };
}

// History
export function setSelectedIterationIndex(state: AppState, index: number): AppState {
  return { ...state, selectedIterationIndex: index };
}

// Modals
export function toggleHelp(state: AppState): AppState {
  return { ...state, helpOpen: !state.helpOpen };
}

export function toggleDeleteConfirm(state: AppState): AppState {
  return { ...state, deleteConfirmOpen: !state.deleteConfirmOpen };
}

export function toggleFilterDropdown(state: AppState): AppState {
  return { ...state, filterDropdownOpen: !state.filterDropdownOpen };
}

// Auto-refresh
export function toggleAutoRefresh(state: AppState): AppState {
  return { ...state, autoRefresh: !state.autoRefresh };
}
