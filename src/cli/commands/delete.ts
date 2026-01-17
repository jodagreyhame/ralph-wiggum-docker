/**
 * Delete Project Command
 */

import chalk from 'chalk';
import * as readline from 'node:readline';
import { projectExists, deleteProject, getProjectDir } from '../../utils/project.js';

export async function deleteCommand(projectName: string, options: { force?: boolean }): Promise<void> {
    if (!projectExists(projectName)) {
        console.error(chalk.red(`Error: Project '${projectName}' not found`));
        process.exit(1);
    }

    if (!options.force) {
        const confirmed = await confirm(
            `Are you sure you want to delete project '${projectName}'? This cannot be undone.`
        );
        if (!confirmed) {
            console.log(chalk.yellow('Cancelled.'));
            return;
        }
    }

    const projectDir = getProjectDir(projectName);
    const deleted = deleteProject(projectName);

    if (deleted) {
        console.log(chalk.green(`✓ Deleted project: ${projectName}`));
        console.log(chalk.dim(`  Removed: ${projectDir}`));
    } else {
        console.error(chalk.red(`Failed to delete project: ${projectName}`));
        process.exit(1);
    }
}

function confirm(question: string): Promise<boolean> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(`${question} [y/N] `, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
    });
}
