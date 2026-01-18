/**
 * Config Validation
 */

import type { ProjectConfig, Backend, AuthMode } from "./schema.js";
import { BACKENDS, getBackendInfo } from "./schema.js";

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

function isValidBackend(backend: string): backend is Backend {
  return BACKENDS.some((b) => b.id === backend);
}

function isValidAuthMode(authMode: string, backend: Backend): boolean {
  const info = getBackendInfo(backend);
  return info ? info.authModes.includes(authMode as AuthMode) : false;
}

export function validateConfig(config: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!config || typeof config !== "object") {
    return { valid: false, errors: [{ path: "", message: "Config must be an object" }] };
  }

  const cfg = config as Record<string, unknown>;

  // Required fields
  if (typeof cfg.name !== "string" || !cfg.name.trim()) {
    errors.push({ path: "name", message: "Project name is required" });
  }

  if (typeof cfg.description !== "string" || !cfg.description.trim()) {
    errors.push({ path: "description", message: "Project description is required" });
  }

  if (typeof cfg.version !== "string" || !cfg.version.trim()) {
    errors.push({ path: "version", message: "Project version is required" });
  } else if (!/^\d+\.\d+\.\d+/.test(cfg.version as string)) {
    errors.push({ path: "version", message: "Version must be in semver format (e.g., 1.0.0)" });
  }

  if (typeof cfg.knowledge_dir !== "string" || !cfg.knowledge_dir.trim()) {
    errors.push({ path: "knowledge_dir", message: "knowledge_dir is required" });
  }

  // Prompts validation
  if (!cfg.prompts || typeof cfg.prompts !== "object") {
    errors.push({ path: "prompts", message: "Prompts configuration is required" });
  } else {
    const prompts = cfg.prompts as Record<string, unknown>;
    if (typeof prompts.dir !== "string" || !prompts.dir) {
      errors.push({ path: "prompts.dir", message: "prompts.dir is required" });
    }
    if (typeof prompts.goal !== "string" || !prompts.goal) {
      errors.push({ path: "prompts.goal", message: "prompts.goal is required" });
    }
    if (typeof prompts.builder !== "string" || !prompts.builder) {
      errors.push({ path: "prompts.builder", message: "prompts.builder is required" });
    }
    if (typeof prompts.reviewer !== "string" || !prompts.reviewer) {
      errors.push({ path: "prompts.reviewer", message: "prompts.reviewer is required" });
    }
    if (typeof prompts.architect !== "string" || !prompts.architect) {
      errors.push({ path: "prompts.architect", message: "prompts.architect is required" });
    }
  }

  // Builder validation
  if (!cfg.builder || typeof cfg.builder !== "object") {
    errors.push({ path: "builder", message: "Builder configuration is required" });
  } else {
    const builder = cfg.builder as Record<string, unknown>;
    if (!isValidBackend(builder.backend as string)) {
      errors.push({ path: "builder.backend", message: `Invalid backend: ${builder.backend}` });
    } else if (!isValidAuthMode(builder.auth_mode as string, builder.backend as Backend)) {
      errors.push({
        path: "builder.auth_mode",
        message: `Invalid auth mode for ${builder.backend}: ${builder.auth_mode}`,
      });
    }
    if (builder.session_mode && !["fresh", "resume"].includes(builder.session_mode as string)) {
      errors.push({
        path: "builder.session_mode",
        message: 'session_mode must be "fresh" or "resume"',
      });
    }
  }

  // Reviewer validation (if enabled)
  if (cfg.reviewer && typeof cfg.reviewer === "object") {
    const reviewer = cfg.reviewer as Record<string, unknown>;
    if (reviewer.enabled) {
      if (!isValidBackend(reviewer.backend as string)) {
        errors.push({ path: "reviewer.backend", message: `Invalid backend: ${reviewer.backend}` });
      } else if (!isValidAuthMode(reviewer.auth_mode as string, reviewer.backend as Backend)) {
        errors.push({
          path: "reviewer.auth_mode",
          message: `Invalid auth mode for ${reviewer.backend}: ${reviewer.auth_mode}`,
        });
      }
      if (reviewer.session_mode && !["fresh", "resume"].includes(reviewer.session_mode as string)) {
        errors.push({
          path: "reviewer.session_mode",
          message: 'session_mode must be "fresh" or "resume"',
        });
      }
    }
  }

  // Architect validation (if enabled)
  if (cfg.architect && typeof cfg.architect === "object") {
    const architect = cfg.architect as Record<string, unknown>;
    if (architect.enabled) {
      if (!isValidBackend(architect.backend as string)) {
        errors.push({
          path: "architect.backend",
          message: `Invalid backend: ${architect.backend}`,
        });
      } else if (!isValidAuthMode(architect.auth_mode as string, architect.backend as Backend)) {
        errors.push({
          path: "architect.auth_mode",
          message: `Invalid auth mode for ${architect.backend}: ${architect.auth_mode}`,
        });
      }
      if (
        architect.session_mode &&
        !["fresh", "resume"].includes(architect.session_mode as string)
      ) {
        errors.push({
          path: "architect.session_mode",
          message: 'session_mode must be "fresh" or "resume"',
        });
      }
    }
  }

  // Max iterations validation
  if (cfg.max_iterations !== undefined) {
    const maxIter = cfg.max_iterations as number;
    if (typeof maxIter !== "number" || maxIter < 0 || !Number.isInteger(maxIter)) {
      errors.push({
        path: "max_iterations",
        message: "max_iterations must be a non-negative integer",
      });
    }
  }

  return { valid: errors.length === 0, errors };
}
