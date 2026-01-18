/**
 * Preset Configurations
 */

import type { ProjectConfig } from "./schema.js";
import { createDefaultConfig } from "./defaults.js";

export type PresetName = "minimal" | "standard" | "three-tier" | "full";

export interface PresetInfo {
  name: PresetName;
  description: string;
}

export const PRESETS: PresetInfo[] = [
  { name: "minimal", description: "Builder only, no review" },
  { name: "standard", description: "Builder + Reviewer" },
  { name: "three-tier", description: "Builder + Reviewer + Architect" },
  { name: "full", description: "All features enabled with fallback" },
];

export function applyPreset(config: ProjectConfig, preset: PresetName): ProjectConfig {
  const result = { ...config };

  switch (preset) {
    case "minimal":
      result.reviewer.enabled = false;
      result.architect.enabled = false;
      result.escalation.enabled = false;
      break;

    case "standard":
      result.reviewer.enabled = true;
      result.architect.enabled = false;
      result.escalation.enabled = false;
      break;

    case "three-tier":
      result.reviewer.enabled = true;
      result.architect.enabled = true;
      result.architect.backend = "gemini";
      result.architect.auth_mode = "gemini-oauth";
      result.escalation.enabled = true;
      break;

    case "full":
      result.reviewer.enabled = true;
      result.architect.enabled = true;
      result.architect.backend = "gemini";
      result.architect.auth_mode = "gemini-oauth";
      result.escalation.enabled = true;
      result.escalation.max_builder_failures = 3;
      result.provider_fallback = {
        enabled: true,
        failure_threshold: 10,
        sequence: [
          { name: "glm", backend: "claude", auth_mode: "glm", model: "glm-4.7" },
          { name: "claude", backend: "claude", auth_mode: "anthropic-oauth", model: "opus" },
          { name: "gemini", backend: "gemini", auth_mode: "gemini-oauth", model: "gemini-2.5-pro" },
        ],
      };
      break;
  }

  return result;
}

export function createPresetConfig(name: string, preset: PresetName): ProjectConfig {
  return applyPreset(createDefaultConfig(name), preset);
}
