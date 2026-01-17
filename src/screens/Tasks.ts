/**
 * Tasks screen - Task list by phase with filtering
 */

import * as fs from 'fs';
import * as path from 'path';
import { theme } from '../theme/theme.js';
import { renderTaskListBox, type Phase, type Task } from '../components/TaskList.js';

/**
 * Load all phases from project
 */
export function loadPhases(projectDir: string): Phase[] {
    const specsDir = path.join(projectDir, '.project', 'specs', 'tasks');
    const phases: Phase[] = [];

    try {
        const files = fs.readdirSync(specsDir)
            .filter(f => f.startsWith('phase-') && f.endsWith('.json'))
            .sort();

        for (const file of files) {
            const content = fs.readFileSync(path.join(specsDir, file), 'utf-8');
            phases.push(JSON.parse(content));
        }
    } catch {
        // No phases found
    }

    return phases;
}

interface TasksScreenOptions {
    filterStatus?: Task['status'] | 'all';
    filterPhase?: number;
    showDescription?: boolean;
}

/**
 * Render the tasks screen
 */
export function renderTasks(projectDir: string, options: TasksScreenOptions = {}): string {
    const phases = loadPhases(projectDir);
    const { filterStatus = 'all', filterPhase, showDescription = false } = options;

    const lines: string[] = [];

    // Header
    lines.push('');
    lines.push(theme.header('═══════════════════════════════════════════════════════════'));
    lines.push(theme.header('                       TASKS                               '));
    lines.push(theme.header('═══════════════════════════════════════════════════════════'));
    lines.push('');

    if (phases.length === 0) {
        lines.push(theme.warning('  No task phases found.'));
        lines.push(theme.muted('  Create .project/specs/tasks/phase-*.json files.'));
        lines.push('');
        return lines.join('\n');
    }

    // Filter legend
    lines.push(theme.subheader('Status: ') +
        theme.muted('○ pending') + '  ' +
        theme.warning('◐ in_progress') + '  ' +
        theme.success('● completed') + '  ' +
        theme.error('✕ blocked')
    );
    lines.push('');

    // Render each phase
    for (const phase of phases) {
        // Skip if filtering by phase
        if (filterPhase !== undefined && phase.phase !== filterPhase) {
            continue;
        }

        // Apply status filter
        let filteredPhase = phase;
        if (filterStatus !== 'all') {
            filteredPhase = {
                ...phase,
                tasks: phase.tasks.filter(t => t.status === filterStatus),
            };

            // Skip empty phases
            if (filteredPhase.tasks.length === 0) {
                continue;
            }
        }

        lines.push(renderTaskListBox(filteredPhase, { showDescription }));
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Get task by ID from loaded phases
 */
export function getTaskById(phases: Phase[], taskId: string): Task | null {
    for (const phase of phases) {
        const task = phase.tasks.find(t => t.id === taskId);
        if (task) return task;
    }
    return null;
}

/**
 * Render task detail view
 */
export function renderTaskDetail(projectDir: string, taskId: string): string {
    const phases = loadPhases(projectDir);
    const task = getTaskById(phases, taskId);

    const lines: string[] = [];

    if (!task) {
        lines.push(theme.error(`Task not found: ${taskId}`));
        return lines.join('\n');
    }

    lines.push('');
    lines.push(theme.header(`Task ${task.id}: ${task.name}`));
    lines.push('');
    lines.push(theme.text('Description:'));
    lines.push(`  ${theme.muted(task.description)}`);
    lines.push('');
    lines.push(theme.text('Status: ') + theme[task.status === 'completed' ? 'success' :
        task.status === 'in_progress' ? 'warning' :
            task.status === 'blocked' ? 'error' : 'muted'](task.status));
    lines.push(theme.text('Provider: ') + theme.info(task.provider));
    lines.push(theme.text('Complexity: ') + theme.warning(task.complexity));

    if (task.depends_on.length > 0) {
        lines.push('');
        lines.push(theme.text('Dependencies:'));
        for (const dep of task.depends_on) {
            const depTask = getTaskById(phases, dep);
            const status = depTask ? depTask.status : 'unknown';
            const icon = status === 'completed' ? theme.success('●') : theme.muted('○');
            lines.push(`  ${icon} ${dep}`);
        }
    }

    if (task.acceptance_criteria && task.acceptance_criteria.length > 0) {
        lines.push('');
        lines.push(theme.text('Acceptance Criteria:'));
        for (const criteria of task.acceptance_criteria) {
            lines.push(`  ${theme.muted('•')} ${criteria}`);
        }
    }

    if (task.files_to_create && task.files_to_create.length > 0) {
        lines.push('');
        lines.push(theme.text('Files to Create:'));
        for (const file of task.files_to_create) {
            lines.push(`  ${theme.success('+')} ${file}`);
        }
    }

    if (task.files_to_modify && task.files_to_modify.length > 0) {
        lines.push('');
        lines.push(theme.text('Files to Modify:'));
        for (const file of task.files_to_modify) {
            lines.push(`  ${theme.warning('~')} ${file}`);
        }
    }

    if (task.blocked_reason) {
        lines.push('');
        lines.push(theme.error('Blocked Reason:'));
        lines.push(`  ${theme.error(task.blocked_reason)}`);
    }

    lines.push('');

    return lines.join('\n');
}
