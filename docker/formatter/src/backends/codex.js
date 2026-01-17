// backends/codex.js - Codex CLI event formatter
import { colors } from '../colors.js';
import { formatToolCall, formatToolResult, formatThinking } from '../output.js';
import { showThinking } from '../detector.js';

/**
 * Format Codex CLI events
 * @param {Object} event - Parsed JSON event
 * @returns {string|null} - Formatted output or null to skip
 */
export function formatCodex(event) {
  const showThink = showThinking();

  switch (event.type) {
    // Item started (command execution or reasoning)
    case 'item.started':
      if (event.item) {
        if (event.item.type === 'command_execution') {
          return formatToolCall('Bash', { command: event.item.command });
        }
        if (event.item.type === 'reasoning' && showThink) {
          return colors.dim('◆ Thinking...');
        }
      }
      return null;

    // Item completed
    case 'item.completed':
      if (!event.item) return null;

      // Command execution result
      if (event.item.type === 'command_execution') {
        if (event.item.exit_code !== 0) {
          const output = event.item.aggregated_output || `exit ${event.item.exit_code}`;
          return formatToolResult(output, true);
        }
        if (event.item.aggregated_output) {
          const firstLine = event.item.aggregated_output.split('\n')[0];
          const exitInfo = event.item.exit_code !== undefined ? ` (exit ${event.item.exit_code})` : '';
          return colors.dim(`← ${firstLine}${exitInfo}`);
        }
        return null;
      }

      // Reasoning/thinking
      if (event.item.type === 'reasoning' && showThink) {
        return formatThinking(event.item.text || event.item.content || '');
      }

      // Message
      if (event.item.type === 'message') {
        return event.item.text || null;
      }

      // File changes
      if (event.item.type === 'file_change' && event.item.changes) {
        return event.item.changes.map(c =>
          colors.yellowBright(`→ File ${c.kind}: ${c.path}`)
        ).join('\n');
      }

      return null;

    default:
      return null;
  }
}
