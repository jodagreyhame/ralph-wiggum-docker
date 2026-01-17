/**
 * Validate Config Command
 */

import * as fs from 'node:fs';
import chalk from 'chalk';
import { validateConfig } from '../../config/validate.js';

export function validateCommand(configPath: string): void {
    if (!fs.existsSync(configPath)) {
        console.error(chalk.red(`Error: File not found: ${configPath}`));
        process.exit(1);
    }

    let content: string;
    try {
        content = fs.readFileSync(configPath, 'utf-8');
    } catch (err) {
        console.error(chalk.red(`Error reading file: ${(err as Error).message}`));
        process.exit(1);
    }

    let config: unknown;
    try {
        config = JSON.parse(content);
    } catch (err) {
        console.error(chalk.red(`Error parsing JSON: ${(err as Error).message}`));
        process.exit(1);
    }

    const result = validateConfig(config);

    if (result.valid) {
        console.log(chalk.green('✓ Configuration is valid'));
    } else {
        console.error(chalk.red('✗ Configuration has errors:'));
        for (const err of result.errors) {
            console.error(chalk.red(`  ${err.path ? err.path + ': ' : ''}${err.message}`));
        }
        process.exit(1);
    }
}
