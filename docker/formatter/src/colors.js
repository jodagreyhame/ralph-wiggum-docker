// colors.js - Chalk wrapper with utilities
import chalk from 'chalk';

// Check NO_COLOR environment variable (no-color.org standard)
const useColors = !process.env.NO_COLOR;

// Color functions (no-op if NO_COLOR is set)
export const colors = {
  bold: (s) => useColors ? chalk.bold(s) : s,
  dim: (s) => useColors ? chalk.dim(s) : s,
  red: (s) => useColors ? chalk.red(s) : s,
  green: (s) => useColors ? chalk.green(s) : s,
  yellow: (s) => useColors ? chalk.yellow(s) : s,
  blue: (s) => useColors ? chalk.blue(s) : s,
  magenta: (s) => useColors ? chalk.magenta(s) : s,
  cyan: (s) => useColors ? chalk.cyan(s) : s,
  gray: (s) => useColors ? chalk.gray(s) : s,
  white: (s) => useColors ? chalk.white(s) : s,

  // Bright variants
  yellowBright: (s) => useColors ? chalk.yellowBright(s) : s,
  cyanBright: (s) => useColors ? chalk.cyanBright(s) : s,

  // Compound styles
  boldYellow: (s) => useColors ? chalk.bold.yellowBright(s) : s,
  boldRed: (s) => useColors ? chalk.bold.red(s) : s,
  boldCyan: (s) => useColors ? chalk.bold.cyanBright(s) : s,
};

// Truncate string to max length
export function truncate(str, maxLen = 80) {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '...';
}

// Shorten file path for display
export function shortenPath(path, maxLen = 60) {
  if (!path) return '';
  if (path.length <= maxLen) return path;

  // Try to keep filename visible
  const parts = path.split('/');
  const filename = parts.pop();

  if (filename.length >= maxLen - 4) {
    return '.../' + filename.slice(0, maxLen - 4);
  }

  return '.../' + filename;
}
