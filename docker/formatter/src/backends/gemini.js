// backends/gemini.js - Gemini CLI event formatter
import { formatToolCall, formatToolResult, formatStats } from '../output.js';

/**
 * Format Gemini CLI events
 * @param {Object} event - Parsed JSON event
 * @returns {string|null} - Formatted output or null to skip
 */
export function formatGemini(event) {
  switch (event.type) {
    // Assistant message
    case 'message':
      if (event.role === 'assistant' && !event.delta) {
        return event.content;
      }
      if (event.delta === true) {
        return event.content;
      }
      return null;

    // Tool use
    case 'tool_use':
      if (event.tool_name) {
        return formatToolCall(event.tool_name, event.parameters);
      }
      return null;

    // Tool result
    case 'tool_result':
      if (event.status === 'error') {
        return formatToolResult(event.output || 'Error', true);
      }
      // Skip verbose success results
      return null;

    // Session result
    case 'result':
      return formatStats({ stats: event.stats, success: true });

    default:
      return null;
  }
}
