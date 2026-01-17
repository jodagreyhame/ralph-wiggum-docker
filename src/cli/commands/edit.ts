/**
 * Edit Project Command
 */

import chalk from 'chalk';
import { projectExists, loadProjectConfig, slugify } from '../../utils/project.js';

export async function editCommand(projectName: string): Promise<void> {
    const slug = slugify(projectName);

    if (!projectExists(slug)) {
        console.error(chalk.red(`Error: Project '${slug}' not found`));
        console.log(chalk.dim('Run "ralph list" to see available projects'));
        process.exit(1);
    }

    const config = loadProjectConfig(slug);
    if (!config) {
        console.error(chalk.red(`Error: Failed to load config for '${slug}'`));
        process.exit(1);
    }

    console.log(chalk.cyan(`Editing project: ${slug}`));

    // Launch TUI with existing config
    const { launchTUI } = await import('../../tui/index.js');
    await launchTUI(config);
}
