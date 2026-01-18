/**
 * TUI State Management (no React)
 * Clawdbot-compatible
 */

import type { ProjectConfig, Backend, AuthMode } from "../config/schema.js";
import { createDefaultConfig } from "../config/defaults.js";

export type TabName = "project" | "builder" | "reviewer" | "architect" | "loop" | "summary";

export const TABS: TabName[] = ["project", "builder", "reviewer", "architect", "loop", "summary"];

export interface AppState {
  activeTab: TabName;
  config: ProjectConfig;
  isEditing: boolean;
  focusedField: number;
  dropdownOpen: boolean;
  summaryButton: number;
  message: { text: string; type: "success" | "error" } | null;
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
