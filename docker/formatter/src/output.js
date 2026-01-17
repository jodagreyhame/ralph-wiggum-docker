// output.js - Claude-style formatters
// → for tool calls, ← for results, ● for file ops, ◆ for thinking
import { colors, truncate } from './colors.js';

/**
 * Format tool arguments - extract most relevant arg for display
 */
export function formatArgs(input) {
  if (!input) return '';

  if (input.command) {
    const cmd = input.command.split('\n')[0];
    return JSON.stringify(truncate(cmd, 60));
  }
  if (input.file_path) return JSON.stringify(input.file_path);
  if (input.filePath) return JSON.stringify(input.filePath);
  if (input.pattern) return JSON.stringify(input.pattern);
  if (input.query) return JSON.stringify(input.query);
  if (input.url) return JSON.stringify(input.url);
  if (input.prompt) {
    const p = input.prompt.split('\n')[0];
    return JSON.stringify(truncate(p, 40));
  }
  if (input.description) {
    return JSON.stringify(truncate(input.description, 40));
  }

  return '';
}

/**
 * Format Edit tool with diff display
 * ● Update(filepath)
 * └ Added X lines, removed Y lines
 *   - removed line
 *   + added line
 */
export function formatEdit(input) {
  if (!input || !input.file_path) return null;

  const lines = [];
  lines.push(colors.boldYellow(`● Update(${input.file_path})`));

  const oldLines = input.old_string ? input.old_string.split('\n') : [];
  const newLines = input.new_string ? input.new_string.split('\n') : [];
  const added = newLines.length;
  const removed = oldLines.length;

  lines.push(colors.dim(`└ Added ${added} lines, removed ${removed} line${removed !== 1 ? 's' : ''}`));

  const maxDiffLines = 10;
  let diffCount = 0;

  // Show removed lines (red)
  for (const line of oldLines.slice(0, 5)) {
    if (diffCount >= maxDiffLines) break;
    lines.push(colors.red(`  - ${truncate(line, 80)}`));
    diffCount++;
  }
  if (oldLines.length > 5) {
    lines.push(colors.dim(`  ... (${oldLines.length - 5} more removed)`));
  }

  // Show added lines (green)
  for (const line of newLines.slice(0, 5)) {
    if (diffCount >= maxDiffLines) break;
    lines.push(colors.green(`  + ${truncate(line, 80)}`));
    diffCount++;
  }
  if (newLines.length > 5) {
    lines.push(colors.dim(`  ... (${newLines.length - 5} more added)`));
  }

  return lines.join('\n');
}

/**
 * Format Write tool
 * ● Write(filepath)
 * └ X lines
 */
export function formatWrite(input) {
  if (!input || !input.file_path) return null;

  const lines = [];
  lines.push(colors.boldYellow(`● Write(${input.file_path})`));

  if (input.content) {
    const contentLines = input.content.split('\n');
    lines.push(colors.dim(`└ ${contentLines.length} lines`));
  }

  return lines.join('\n');
}

/**
 * Format Read tool
 * ● Read(filepath)
 */
export function formatRead(input) {
  if (!input) return null;
  const path = input.file_path || input.filePath;
  if (!path) return null;
  return colors.boldYellow(`● Read(${path})`);
}

/**
 * Format tool call
 * → ToolName("arg")
 */
export function formatToolCall(name, input) {
  // Special handling for Edit, Write, Read
  if (name === 'Edit' && input && input.old_string !== undefined) {
    return formatEdit(input);
  }
  if (name === 'Write' && input && input.content !== undefined) {
    return formatWrite(input);
  }
  if (name === 'Read') {
    return formatRead(input);
  }

  const args = formatArgs(input);
  const formatted = args ? `→ ${name}(${args})` : `→ ${name}`;
  return colors.boldYellow(formatted);
}

/**
 * Format tool result
 * ← Result:
 *     content line 1
 *     content line 2
 */
export function formatToolResult(content, isError = false) {
  if (!content) return null;

  const lines = content.split('\n');
  const maxLines = 8;
  const truncated = lines.length > maxLines;
  const displayLines = lines.slice(0, maxLines);

  const header = isError
    ? colors.boldRed('← Error:')
    : colors.dim('← Result:');

  const formattedLines = displayLines.map(line => {
    const truncLine = truncate(line, 100);
    return '    ' + (isError ? colors.red(truncLine) : colors.dim(truncLine));
  });

  if (truncated) {
    formattedLines.push(colors.dim(`    ... (${lines.length - maxLines} more lines)`));
  }

  return header + '\n' + formattedLines.join('\n');
}

/**
 * Format thinking block
 * ◆ Thinking:
 *     thinking text...
 */
export function formatThinking(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const maxLines = 6;
  const displayLines = lines.slice(0, maxLines);

  const header = colors.dim('◆ Thinking:');
  const formattedLines = displayLines.map(line =>
    colors.dim('    ' + truncate(line, 80))
  );

  if (lines.length > maxLines) {
    formattedLines.push(colors.dim('    ...'));
  }

  return header + '\n' + formattedLines.join('\n');
}

/**
 * Format completion stats
 * ---
 * Success: true
 * Turns: 5
 * Cost: $0.0234
 * Tokens: 1200 in, 800 out
 */
export function formatStats(data) {
  const parts = [colors.cyanBright('---')];

  if (data.success !== undefined) {
    parts.push(colors.dim(`Success: ${data.success}`));
  }
  if (data.num_turns) {
    parts.push(colors.dim(`Turns: ${data.num_turns}`));
  }
  if (data.duration_ms) {
    parts.push(colors.dim(`Duration: ${(data.duration_ms / 1000).toFixed(1)}s`));
  }
  if (data.total_cost_usd) {
    parts.push(colors.dim(`Cost: $${data.total_cost_usd.toFixed(6)}`));
  }
  if (data.usage) {
    const input = data.usage.input_tokens || 0;
    const output = data.usage.output_tokens || 0;
    parts.push(colors.dim(`Tokens: ${input} in, ${output} out`));
  }
  // Gemini/Codex stats format
  if (data.stats) {
    if (data.stats.tool_calls) {
      parts.push(colors.dim(`Tools: ${data.stats.tool_calls}`));
    }
    if (data.stats.total_tokens) {
      parts.push(colors.dim(`Tokens: ${data.stats.total_tokens}`));
    }
  }

  return parts.join('\n');
}
