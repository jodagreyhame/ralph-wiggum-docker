// detector.js - Backend detection from event structure

// Claude event types
const CLAUDE_TYPES = new Set([
  'assistant', 'content_block_delta', 'content_block_start', 'content_block_stop',
  'user', 'message_start', 'message_stop', 'message_delta', 'system'
]);

/**
 * Detect backend from event structure
 * @param {Object} event - Parsed JSON event
 * @returns {'claude'|'gemini'|'codex'|'opencode'|'unknown'}
 */
export function detectBackend(event) {
  if (!event || !event.type) return 'unknown';

  const type = event.type;

  // Claude events
  if (CLAUDE_TYPES.has(type)) return 'claude';
  if (type === 'result' && (event.subtype === 'success' || event.subtype === 'error')) return 'claude';

  // Gemini events
  if (type === 'message' && event.role !== undefined) return 'gemini';
  if (type === 'tool_use' && event.tool_name !== undefined) return 'gemini';
  if (type === 'tool_result' && event.output !== undefined) return 'gemini';
  if (type === 'result' && event.stats !== undefined) return 'gemini';

  // Codex events (item.*)
  if (type.startsWith('item.')) return 'codex';

  // OpenCode events
  if (type === 'text' && event.part !== undefined) return 'opencode';
  if (type === 'tool_use' && event.part !== undefined) return 'opencode';
  if (type === 'tool_result' && event.part !== undefined) return 'opencode';
  if (type === 'step_finish') return 'opencode';

  return 'unknown';
}

/**
 * Check if thinking should be shown
 * @returns {boolean}
 */
export function showThinking() {
  return process.env.RALPH_SHOW_THINKING === 'true' ||
         process.env.UNIFIED_SHOW_THINKING === 'true';
}
