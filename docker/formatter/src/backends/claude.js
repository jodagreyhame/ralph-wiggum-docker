// backends/claude.js - Claude CLI event formatter
import { colors } from '../colors.js';
import { formatToolCall, formatToolResult, formatThinking, formatStats } from '../output.js';
import { showThinking } from '../detector.js';

/**
 * Format Claude CLI events
 * @param {Object} event - Parsed JSON event
 * @returns {string|null} - Formatted output or null to skip
 */
export function formatClaude(event) {
  const showThink = showThinking();

  switch (event.type) {
    // Skip metadata events
    case 'system':
    case 'init':
    case 'thread.started':
    case 'turn.started':
    case 'turn.completed':
    case 'message_start':
    case 'message_stop':
    case 'message_delta':
    case 'content_block_stop':
      return null;

    // Content block start (thinking or tool_use)
    case 'content_block_start':
      if (event.content_block) {
        if (event.content_block.type === 'thinking') {
          return showThink ? colors.dim('◆ Thinking...') : null;
        }
        if (event.content_block.type === 'tool_use') {
          return formatToolCall(event.content_block.name, event.content_block.input);
        }
      }
      return null;

    // Content block delta (streaming text or thinking)
    case 'content_block_delta':
      if (event.delta) {
        if (event.delta.type === 'text_delta') {
          return event.delta.text;
        }
        if (event.delta.type === 'thinking_delta' && showThink) {
          return colors.dim(event.delta.thinking);
        }
      }
      return null;

    // Full assistant message
    case 'assistant':
      if (!event.message || !event.message.content) return null;

      const outputs = [];
      for (const item of event.message.content) {
        if (item.type === 'text') {
          outputs.push(item.text);
        } else if (item.type === 'tool_use') {
          outputs.push(formatToolCall(item.name, item.input));
        } else if (item.type === 'thinking' && showThink) {
          outputs.push(formatThinking(item.thinking));
        }
      }
      return outputs.length > 0 ? outputs.join('\n') : null;

    // User message (tool results)
    case 'user':
      if (!event.message || !event.message.content) return null;

      for (const item of event.message.content) {
        if (item.type === 'tool_result') {
          if (item.is_error === true) {
            const content = Array.isArray(item.content)
              ? item.content.map(c => c.text || '').join('\n')
              : (item.content || 'Error');
            return formatToolResult(content, true);
          }
          // Skip verbose success results
          return null;
        }
      }
      return null;

    // Session result
    case 'result':
      if (event.subtype === 'success') {
        return formatStats({ ...event, success: true });
      } else if (event.subtype === 'error') {
        return formatStats({ ...event, success: false });
      }
      return null;

    default:
      // Fallback for text content
      if (event.content && typeof event.content === 'string') {
        return event.content;
      }
      return null;
  }
}
