/**
 * Default Configuration Values
 *
 * The canonical source of defaults is template/config.json.
 * This file provides fallback values if template cannot be loaded.
 */

import type { ProjectConfig, PromptsConfig } from "./schema.js";
import { loadTemplateConfig } from "../utils/template.js";

// Prompts config (rarely changes)
export const DEFAULT_PROMPTS: PromptsConfig = {
  dir: ".project/prompts",
  goal: "GOAL.md",
  builder: "BUILDER.md",
  reviewer: "REVIEWER.md",
  architect: "ARCHITECT.md",
};

/**
 * Create a default config for a new project.
 * Loads from template/config.json if available, otherwise uses minimal fallback.
 */
export function createDefaultConfig(name: string): ProjectConfig {
  // Try to load from template first (canonical source)
  const templateConfig = loadTemplateConfig();

  if (templateConfig) {
    return {
      ...templateConfig,
      name,
      description: "",
    };
  }

  // Fallback if template not available (shouldn't happen in normal usage)
  return {
    name,
    description: "",
    version: "0.1.0",
    prompts: { ...DEFAULT_PROMPTS },
    builder: {
      backend: "claude",
      auth_mode: "anthropic-oauth",
      model: null,
      session_mode: "fresh",
    },
    reviewer: {
      enabled: false,
      backend: "claude",
      auth_mode: "anthropic-oauth",
      model: null,
      session_mode: "fresh",
    },
    architect: {
      enabled: false,
      backend: "gemini",
      auth_mode: "gemini-oauth",
      model: null,
      session_mode: "resume",
    },
    escalation: {
      enabled: false,
      max_builder_failures: 3,
    },
    max_iterations: 0,
    completion_enabled: true,
    knowledge_dir: ".project",
  };
}
