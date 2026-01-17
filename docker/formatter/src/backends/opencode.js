// backends/opencode.js - OpenCode CLI event formatter
import { colors } from '../colors.js';
import { formatToolCall, formatToolResult, formatThinking, formatStats } from '../output.js';
import { showThinking } from '../detector.js';

/**
 * Format OpenCode CLI events
 * @param {Object} event - Parsed JSON event
 * @returns {string|null} - Formatted output or null to skip
 */
export function formatOpenCode(event) {
  const showThink = showThinking();

  switch (event.type) {
    // Text output
    case 'text':
      if (event.part && event.part.text) {
        return event.part.text;
      }
      return null;

    // Tool use
    case 'tool_use':
      if (!event.part) return null;

      // Handle reasoning as thinking
      if (event.part.type === 'reasoning' && showThink) {
        return formatThinking(event.part.text || '');
      }

      if (event.part.tool) {
        // Tool running
        if (event.part.state && event.part.state.status === 'running') {
          return formatToolCall(event.part.tool, event.part.state.input);
        }
        // Tool completed
        if (event.part.state && event.part.state.status === 'completed' && event.part.state.output) {
          const firstLine = event.part.state.output.split('\n')[0];
          return colors.dim(`← ${firstLine}`);
        }
        // Tool error
        if (event.part.state && event.part.state.status === 'error') {
          return formatToolResult(event.part.state.error || 'Error', true);
        }
      }
      return null;

    // Tool result
    case 'tool_result':
      if (!event.part) return null;

      if (event.part.status === 'error') {
        return formatToolResult(event.part.error || 'Error', true);
      }
      // Skip verbose success results
      return null;

    // Step finish (completion)
    case 'step_finish':
      if (event.part) {
        const data = {
          success: true,
          usage: event.part.tokens,
          total_cost_usd: event.part.cost
        };
        const reason = event.part.reason ? ` (${event.part.reason})` : '';
        return formatStats(data) + reason;
      }
      return null;

    default:
      return null;
  }
}
