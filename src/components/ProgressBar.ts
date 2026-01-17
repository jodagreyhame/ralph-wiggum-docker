/**
 * ProgressBar component - Phase progress visualization
 */

import { theme, LOBSTER_PALETTE } from '../theme/theme.js';
import chalk from 'chalk';

export interface PhaseProgress {
    id: string;
    name: string;
    tasks: number;
    completed: number;
}

interface ProgressBarOptions {
    width?: number;
    showLabel?: boolean;
    showPercentage?: boolean;
}

/**
 * Render a single progress bar
 */
export function renderProgressBar(
    current: number,
    total: number,
    options: ProgressBarOptions = {}
): string {
    const { width = 20, showPercentage = true } = options;

    const percentage = total > 0 ? current / total : 0;
    const filled = Math.round(width * percentage);
    const empty = width - filled;

    // Use gradient from dimmed to success based on percentage
    let barColor = theme.success;
    if (percentage < 0.25) {
        barColor = theme.error;
    } else if (percentage < 0.5) {
        barColor = theme.warning;
    } else if (percentage < 0.75) {
        barColor = theme.info;
    }

    const filledBar = barColor('█'.repeat(filled));
    const emptyBar = theme.dimmed('░'.repeat(empty));

    let result = `${filledBar}${emptyBar}`;

    if (showPercentage) {
        const percent = `${Math.round(percentage * 100)}%`.padStart(4);
        result += ` ${theme.text(percent)}`;
    }

    return result;
}

/**
 * Render phase progress with label
 */
export function renderPhaseProgress(phase: PhaseProgress, options: ProgressBarOptions = {}): string {
    const { width = 25, showLabel = true } = options;

    const bar = renderProgressBar(phase.completed, phase.tasks, { width, showPercentage: true });

    if (showLabel) {
        const label = `${phase.name}`.padEnd(15);
        const count = theme.muted(`${phase.completed}/${phase.tasks}`);
        return `${theme.text(label)} ${bar} ${count}`;
    }

    return bar;
}

/**
 * Render all phases progress
 */
export function renderAllPhasesProgress(phases: PhaseProgress[]): string {
    const lines = phases.map(phase => renderPhaseProgress(phase));

    // Calculate totals
    const totalTasks = phases.reduce((sum, p) => sum + p.tasks, 0);
    const totalCompleted = phases.reduce((sum, p) => sum + p.completed, 0);

    // Overall progress
    const overallBar = renderProgressBar(totalCompleted, totalTasks, { width: 30 });
    const overallLabel = theme.header('Overall Progress');

    return [
        overallLabel,
        `${''.padEnd(15)} ${overallBar} ${theme.muted(`${totalCompleted}/${totalTasks}`)}`,
        '',
        theme.subheader('By Phase:'),
        ...lines,
    ].join('\n');
}

/**
 * Render a mini progress indicator (for status bars)
 */
export function renderMiniProgress(current: number, total: number): string {
    const chars = ['░', '▒', '▓', '█'];
    const percentage = total > 0 ? current / total : 0;
    const charIndex = Math.min(Math.floor(percentage * 4), 3);

    let color = theme.error;
    if (percentage >= 0.75) {
        color = theme.success;
    } else if (percentage >= 0.5) {
        color = theme.info;
    } else if (percentage >= 0.25) {
        color = theme.warning;
    }

    return color(`${chars[charIndex]} ${Math.round(percentage * 100)}%`);
}
