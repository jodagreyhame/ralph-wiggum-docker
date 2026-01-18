/**
 * Comprehensive Config Editor Tests
 *
 * Tests all state functions and helper logic for the TUI config editor.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  createAppState,
  setActiveTab,
  nextTab,
  prevTab,
  setFocusedField,
  toggleDropdown,
  setReviewerEnabled,
  setArchitectEnabled,
  setCompletionEnabled,
  setEscalationEnabled,
  setBuilderAuth,
  setReviewerAuth,
  setArchitectAuth,
  setSummaryButton,
  getFieldCount,
  type AppState,
} from "../../src/tui/state.js";
import { createDefaultConfig } from "../../src/config/defaults.js";

describe("Config Editor State", () => {
  let state: AppState;

  beforeEach(() => {
    state = createAppState();
    state.config = createDefaultConfig("test-project");
    state.activeTab = "project";
    state.focusedField = 0;
    state.dropdownOpen = false;
  });

  describe("Tab Navigation", () => {
    it("should switch to builder tab when setActiveTab called with 'builder'", () => {
      const newState = setActiveTab(state, "builder");
      expect(newState.activeTab).toBe("builder");
    });

    it("should switch to all tabs correctly", () => {
      const tabs = ["project", "builder", "reviewer", "architect", "loop", "summary"] as const;
      for (const tab of tabs) {
        const newState = setActiveTab(state, tab);
        expect(newState.activeTab).toBe(tab);
      }
    });

    it("should cycle to next tab", () => {
      state.activeTab = "project";
      const newState = nextTab(state);
      expect(newState.activeTab).toBe("builder");
    });

    it("should stay at summary when nextTab called from summary (no wrap)", () => {
      state.activeTab = "summary";
      const newState = nextTab(state);
      expect(newState.activeTab).toBe("summary"); // Clamped, doesn't wrap
    });

    it("should cycle to previous tab", () => {
      state.activeTab = "builder";
      const newState = prevTab(state);
      expect(newState.activeTab).toBe("project");
    });

    it("should stay at project when prevTab called from project (no wrap)", () => {
      state.activeTab = "project";
      const newState = prevTab(state);
      expect(newState.activeTab).toBe("project"); // Clamped, doesn't wrap
    });

    it("should reset focusedField to 0 when switching tabs", () => {
      state.focusedField = 1;
      const newState = setActiveTab(state, "builder");
      expect(newState.focusedField).toBe(0);
    });

    it("should close dropdown when switching tabs", () => {
      state.dropdownOpen = true;
      const newState = setActiveTab(state, "builder");
      expect(newState.dropdownOpen).toBe(false);
    });
  });

  describe("Field Navigation", () => {
    it("should return correct field count for project tab (2 fields)", () => {
      state.activeTab = "project";
      expect(getFieldCount(state)).toBe(2);
    });

    it("should return correct field count for builder tab (2 fields)", () => {
      state.activeTab = "builder";
      expect(getFieldCount(state)).toBe(2);
    });

    it("should return 1 field for reviewer tab when disabled", () => {
      state.activeTab = "reviewer";
      state.config.reviewer.enabled = false;
      expect(getFieldCount(state)).toBe(1);
    });

    it("should return 3 fields for reviewer tab when enabled", () => {
      state.activeTab = "reviewer";
      state.config.reviewer.enabled = true;
      expect(getFieldCount(state)).toBe(3);
    });

    it("should return 1 field for architect tab when disabled", () => {
      state.activeTab = "architect";
      state.config.architect.enabled = false;
      expect(getFieldCount(state)).toBe(1);
    });

    it("should return 3 fields for architect tab when enabled", () => {
      state.activeTab = "architect";
      state.config.architect.enabled = true;
      expect(getFieldCount(state)).toBe(3);
    });

    it("should return 3 fields for loop tab", () => {
      state.activeTab = "loop";
      expect(getFieldCount(state)).toBe(3);
    });

    it("should return 2 fields for summary tab (buttons)", () => {
      state.activeTab = "summary";
      expect(getFieldCount(state)).toBe(2);
    });

    it("should update focusedField with setFocusedField", () => {
      const newState = setFocusedField(state, 1);
      expect(newState.focusedField).toBe(1);
    });
  });

  describe("Toggle Fields", () => {
    it("should toggle reviewer enabled from false to true", () => {
      state.config.reviewer.enabled = false;
      const newState = setReviewerEnabled(state, true);
      expect(newState.config.reviewer.enabled).toBe(true);
    });

    it("should toggle reviewer enabled from true to false", () => {
      state.config.reviewer.enabled = true;
      const newState = setReviewerEnabled(state, false);
      expect(newState.config.reviewer.enabled).toBe(false);
    });

    it("should toggle architect enabled", () => {
      const initial = state.config.architect.enabled;
      const newState = setArchitectEnabled(state, !initial);
      expect(newState.config.architect.enabled).toBe(!initial);
    });

    it("should toggle completion enabled", () => {
      const initial = state.config.completion_enabled;
      const newState = setCompletionEnabled(state, !initial);
      expect(newState.config.completion_enabled).toBe(!initial);
    });

    it("should toggle escalation enabled", () => {
      const initial = state.config.escalation.enabled;
      const newState = setEscalationEnabled(state, !initial);
      expect(newState.config.escalation.enabled).toBe(!initial);
    });
  });

  describe("Dropdown State", () => {
    it("should toggle dropdown from closed to open", () => {
      state.dropdownOpen = false;
      const newState = toggleDropdown(state);
      expect(newState.dropdownOpen).toBe(true);
    });

    it("should toggle dropdown from open to closed", () => {
      state.dropdownOpen = true;
      const newState = toggleDropdown(state);
      expect(newState.dropdownOpen).toBe(false);
    });
  });

  describe("Auth Mode Selection", () => {
    it("should update builder auth mode", () => {
      const newState = setBuilderAuth(state, "anthropic-api");
      expect(newState.config.builder.auth_mode).toBe("anthropic-api");
    });

    it("should update reviewer auth mode", () => {
      const newState = setReviewerAuth(state, "gemini-oauth");
      expect(newState.config.reviewer.auth_mode).toBe("gemini-oauth");
    });

    it("should update architect auth mode", () => {
      const newState = setArchitectAuth(state, "openai-oauth");
      expect(newState.config.architect.auth_mode).toBe("openai-oauth");
    });
  });

  describe("Summary Tab", () => {
    it("should update summary button selection", () => {
      state.summaryButton = 0;
      const newState = setSummaryButton(state, 1);
      expect(newState.summaryButton).toBe(1);
    });

    it("should toggle between Create and Cancel buttons", () => {
      state.summaryButton = 0;
      let newState = setSummaryButton(state, 1);
      expect(newState.summaryButton).toBe(1);
      newState = setSummaryButton(newState, 0);
      expect(newState.summaryButton).toBe(0);
    });
  });
});

describe("isTextInputField Helper Logic", () => {
  /**
   * This tests the logic that should be in the isTextInputField() method.
   * The method determines if the current field accepts text input.
   */
  const isTextInputField = (activeTab: string, focusedField: number): boolean => {
    // Project tab: name (0), description (1)
    if (activeTab === "project") {
      return focusedField === 0 || focusedField === 1;
    }

    // Loop tab: max_iterations (0)
    if (activeTab === "loop" && focusedField === 0) {
      return true;
    }

    return false;
  };

  describe("Project Tab", () => {
    it("should return true for project tab field 0 (name)", () => {
      expect(isTextInputField("project", 0)).toBe(true);
    });

    it("should return true for project tab field 1 (description)", () => {
      expect(isTextInputField("project", 1)).toBe(true);
    });
  });

  describe("Loop Tab", () => {
    it("should return true for loop tab field 0 (max iterations)", () => {
      expect(isTextInputField("loop", 0)).toBe(true);
    });

    it("should return false for loop tab field 1 (completion toggle)", () => {
      expect(isTextInputField("loop", 1)).toBe(false);
    });

    it("should return false for loop tab field 2 (escalation toggle)", () => {
      expect(isTextInputField("loop", 2)).toBe(false);
    });
  });

  describe("Non-Text-Input Tabs", () => {
    it("should return false for builder tab field 0 (backend cards)", () => {
      expect(isTextInputField("builder", 0)).toBe(false);
    });

    it("should return false for builder tab field 1 (auth dropdown)", () => {
      expect(isTextInputField("builder", 1)).toBe(false);
    });

    it("should return false for reviewer tab field 0 (enable toggle)", () => {
      expect(isTextInputField("reviewer", 0)).toBe(false);
    });

    it("should return false for reviewer tab field 1 (backend cards)", () => {
      expect(isTextInputField("reviewer", 1)).toBe(false);
    });

    it("should return false for architect tab", () => {
      expect(isTextInputField("architect", 0)).toBe(false);
      expect(isTextInputField("architect", 1)).toBe(false);
      expect(isTextInputField("architect", 2)).toBe(false);
    });

    it("should return false for summary tab", () => {
      expect(isTextInputField("summary", 0)).toBe(false);
      expect(isTextInputField("summary", 1)).toBe(false);
    });
  });
});

describe("isDropdownField Helper Logic", () => {
  /**
   * This tests the logic that should be in the isDropdownField() method.
   * The method determines if the current field is a dropdown.
   */
  const isDropdownField = (
    activeTab: string,
    focusedField: number,
    reviewerEnabled: boolean,
    architectEnabled: boolean,
  ): boolean => {
    if (activeTab === "builder" && focusedField === 1) {
      return true;
    }
    if (activeTab === "reviewer" && reviewerEnabled && focusedField === 2) {
      return true;
    }
    if (activeTab === "architect" && architectEnabled && focusedField === 2) {
      return true;
    }
    return false;
  };

  it("should return true for builder tab field 1 (auth dropdown)", () => {
    expect(isDropdownField("builder", 1, false, false)).toBe(true);
  });

  it("should return false for builder tab field 0 (backend cards)", () => {
    expect(isDropdownField("builder", 0, false, false)).toBe(false);
  });

  it("should return true for reviewer tab field 2 when enabled", () => {
    expect(isDropdownField("reviewer", 2, true, false)).toBe(true);
  });

  it("should return false for reviewer tab field 2 when disabled", () => {
    expect(isDropdownField("reviewer", 2, false, false)).toBe(false);
  });

  it("should return true for architect tab field 2 when enabled", () => {
    expect(isDropdownField("architect", 2, false, true)).toBe(true);
  });

  it("should return false for architect tab field 2 when disabled", () => {
    expect(isDropdownField("architect", 2, false, false)).toBe(false);
  });

  it("should return false for project tab", () => {
    expect(isDropdownField("project", 0, false, false)).toBe(false);
    expect(isDropdownField("project", 1, false, false)).toBe(false);
  });

  it("should return false for loop tab", () => {
    expect(isDropdownField("loop", 0, false, false)).toBe(false);
    expect(isDropdownField("loop", 1, false, false)).toBe(false);
  });

  it("should return false for summary tab", () => {
    expect(isDropdownField("summary", 0, false, false)).toBe(false);
    expect(isDropdownField("summary", 1, false, false)).toBe(false);
  });
});

describe("State Immutability", () => {
  let state: AppState;

  beforeEach(() => {
    state = createAppState();
    state.config = createDefaultConfig("test-project");
    state.activeTab = "project";
  });

  it("should not mutate original state when setting active tab", () => {
    const originalTab = state.activeTab;
    setActiveTab(state, "builder");
    expect(state.activeTab).toBe(originalTab);
  });

  it("should not mutate original state when toggling reviewer", () => {
    const originalEnabled = state.config.reviewer.enabled;
    setReviewerEnabled(state, !originalEnabled);
    expect(state.config.reviewer.enabled).toBe(originalEnabled);
  });

  it("should not mutate original state when toggling dropdown", () => {
    const originalOpen = state.dropdownOpen;
    toggleDropdown(state);
    expect(state.dropdownOpen).toBe(originalOpen);
  });
});

describe("Edge Cases", () => {
  let state: AppState;

  beforeEach(() => {
    state = createAppState();
    state.config = createDefaultConfig("test-project");
  });

  it("should handle rapid tab cycling without errors", () => {
    let currentState = state;
    for (let i = 0; i < 20; i++) {
      currentState = nextTab(currentState);
    }
    // After 20 next tabs (tabs don't wrap), should be clamped at "summary" (index 5)
    expect(currentState.activeTab).toBe("summary");
  });

  it("should handle setting same auth mode multiple times", () => {
    let currentState = state;
    for (let i = 0; i < 5; i++) {
      currentState = setBuilderAuth(currentState, "glm");
    }
    expect(currentState.config.builder.auth_mode).toBe("glm");
  });

  it("should handle toggling same boolean multiple times", () => {
    let currentState = state;
    const initial = currentState.config.reviewer.enabled;

    for (let i = 0; i < 10; i++) {
      currentState = setReviewerEnabled(currentState, !currentState.config.reviewer.enabled);
    }

    // 10 toggles should end up same as initial
    expect(currentState.config.reviewer.enabled).toBe(initial);
  });
});
