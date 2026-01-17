#!/usr/bin/env node
// index.js - CLI entry point for ralph-formatter
// Usage: cat stream.ndjson | node index.js

import { createInterface } from 'readline';
import { format } from './formatter.js';

/**
 * Process NDJSON stream from input and write formatted output
 * @param {NodeJS.ReadableStream} input
 * @param {NodeJS.WritableStream} output
 */
async function processStream(input, output) {
  const rl = createInterface({
    input: input,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const event = JSON.parse(line);
      const result = format(event);

      if (result !== null && result !== undefined) {
        output.write(result + '\n');
      }
    } catch (e) {
      // Skip invalid JSON lines silently
    }
  }
}

// Main entry point
processStream(process.stdin, process.stdout).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
