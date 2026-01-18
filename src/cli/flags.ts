/**
 * CLI Flag Definitions
 */

import type { Backend, AuthMode, SessionMode } from "../config/schema.js";
import type { PresetName } from "../config/presets.js";

export interface NewCommandOptions {
  // Project
  description?: string;
  preset?: PresetName;
  interactive?: boolean;

  // Builder
  builderBackend?: Backend;
  builderAuth?: AuthMode;
  builderModel?: string;
  builderSession?: SessionMode;

  // Reviewer
  reviewerEnabled?: boolean;
  noReviewer?: boolean;
  reviewerBackend?: Backend;
  reviewerAuth?: AuthMode;
  reviewerModel?: string;
  reviewerSession?: SessionMode;

  // Architect
  architectEnabled?: boolean;
  noArchitect?: boolean;
  architectBackend?: Backend;
  architectAuth?: AuthMode;
  architectModel?: string;
  architectSession?: SessionMode;

  // Escalation
  escalationEnabled?: boolean;
  noEscalation?: boolean;
  escalationFailures?: number;

  // Provider Fallback
  fallbackEnabled?: boolean;
  noFallback?: boolean;
  fallbackThreshold?: number;
  fallbackSequence?: string;

  // Loop Settings
  maxIterations?: number;
  completionEnabled?: boolean;
  noCompletion?: boolean;
}

export function parseBoolean(enabled?: boolean, disabled?: boolean, defaultValue = false): boolean {
  if (enabled) return true;
  if (disabled) return false;
  return defaultValue;
}
