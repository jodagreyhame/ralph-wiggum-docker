// formatter.js - Main routing logic
import { detectBackend } from './detector.js';
import { formatClaude } from './backends/claude.js';
import { formatGemini } from './backends/gemini.js';
import { formatCodex } from './backends/codex.js';
import { formatOpenCode } from './backends/opencode.js';

/**
 * Format an event based on detected backend
 * @param {Object} event - Parsed JSON event
 * @returns {string|null} - Formatted output or null to skip
 */
export function format(event) {
  if (!event || !event.type) return null;

  const backend = detectBackend(event);

  switch (backend) {
    case 'claude':
      return formatClaude(event);
    case 'gemini':
      return formatGemini(event);
    case 'codex':
      return formatCodex(event);
    case 'opencode':
      return formatOpenCode(event);
    default:
      // Fallback: output raw content if present
      if (event.content && typeof event.content === 'string') {
        return event.content;
      }
      return null;
  }
}
