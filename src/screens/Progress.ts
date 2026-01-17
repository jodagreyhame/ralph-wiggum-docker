/**
 * Progress screen - Detailed phase progress breakdown
 */

import * as fs from 'fs';
import * as path from 'path';
import { theme, providerBadge, complexityBadge } from '../theme/theme.js';
import { renderProgressBar, renderAllPhasesProgress, type PhaseProgress } from '../components/ProgressBar.js';
import { loadSummary, type SummaryData } from './Dashboard.js';
import { loadPhases } from './Tasks.js';

/**
 * Render the progress screen
 */
export function renderProgress(projectDir: string): string {
    const summary = loadSummary(projectDir);
    const phases = loadPhases(projectDir);

    const lines: string[] = [];

    // Header
    lines.push('');
    lines.push(theme.header('═══════════════════════════════════════════════════════════'));
    lines.push(theme.header('                      PROGRESS                             '));
    lines.push(theme.header('═══════════════════════════════════════════════════════════'));
    lines.push('');

    if (!summary) {
        lines.push(theme.warning('  No task specs found.'));
        return lines.join('\n');
    }

    // Overall progress
    const percentage = summary.total_tasks > 0
        ? Math.round((summary.completed_tasks / summary.total_tasks) * 100)
        : 0;

    lines.push(theme.header('Overall Progress'));
    lines.push('');
    lines.push(`  ${renderProgressBar(summary.completed_tasks, summary.total_tasks, { width: 40 })}`);
    lines.push('');
    lines.push(`  ${theme.success(summary.completed_tasks.toString())} / ${theme.text(summary.total_tasks.toString())} tasks completed`);
    lines.push('');

    // Phase breakdown
    lines.push(theme.header('Phase Breakdown'));
    lines.push('');

    for (const phaseProgress of summary.phases) {
        const phase = phases.find(p => `phase-${String(p.phase).padStart(2, '0')}-${p.name.toLowerCase()}` === phaseProgress.id ||
            phaseProgress.id.includes(p.name.toLowerCase()));

        const phasePercent = phaseProgress.tasks > 0
            ? Math.round((phaseProgress.completed / phaseProgress.tasks) * 100)
            : 0;

        const statusIcon = phaseProgress.completed === phaseProgress.tasks
            ? theme.success('✓')
            : phaseProgress.completed > 0
                ? theme.warning('◐')
                : theme.muted('○');

        lines.push(`  ${statusIcon} ${theme.text(phaseProgress.name.padEnd(20))} ${renderProgressBar(phaseProgress.completed, phaseProgress.tasks, { width: 25 })}`);

        // Show task breakdown for incomplete phases
        if (phase && phaseProgress.completed < phaseProgress.tasks) {
            const pending = phase.tasks.filter(t => t.status === 'pending').length;
            const inProgress = phase.tasks.filter(t => t.status === 'in_progress').length;
            const blocked = phase.tasks.filter(t => t.status === 'blocked').length;

            const breakdown: string[] = [];
            if (inProgress > 0) breakdown.push(theme.warning(`${inProgress} in progress`));
            if (pending > 0) breakdown.push(theme.muted(`${pending} pending`));
            if (blocked > 0) breakdown.push(theme.error(`${blocked} blocked`));

            if (breakdown.length > 0) {
                lines.push(`      ${breakdown.join(', ')}`);
            }
        }
    }
    lines.push('');

    // Provider distribution
    if (summary.by_provider && Object.keys(summary.by_provider).length > 0) {
        lines.push(theme.header('By Provider'));
        lines.push('');

        for (const [provider, count] of Object.entries(summary.by_provider)) {
            const completed = countCompletedByProvider(phases, provider);
            lines.push(`  ${providerBadge(provider)} ${renderProgressBar(completed, count, { width: 20 })}`);
        }
        lines.push('');
    }

    // Complexity distribution
    if (summary.by_complexity && Object.keys(summary.by_complexity).length > 0) {
        lines.push(theme.header('By Complexity'));
        lines.push('');

        for (const [complexity, count] of Object.entries(summary.by_complexity)) {
            const completed = countCompletedByComplexity(phases, complexity);
            lines.push(`  ${complexityBadge(complexity)} ${renderProgressBar(completed, count, { width: 20 })}`);
        }
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Count completed tasks by provider
 */
function countCompletedByProvider(phases: ReturnType<typeof loadPhases>, provider: string): number {
    let count = 0;
    for (const phase of phases) {
        count += phase.tasks.filter(t => t.provider === provider && t.status === 'completed').length;
    }
    return count;
}

/**
 * Count completed tasks by complexity
 */
function countCompletedByComplexity(phases: ReturnType<typeof loadPhases>, complexity: string): number {
    let count = 0;
    for (const phase of phases) {
        count += phase.tasks.filter(t => t.complexity === complexity && t.status === 'completed').length;
    }
    return count;
}
