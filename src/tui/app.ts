/**
 * Main TUI Application (chalk + readline, no React)
 * Clawdbot-compatible
 */

import { theme } from '../theme/theme.js';
import { BACKENDS, type Backend, type ProjectConfig } from '../config/schema.js';
import { validateConfig } from '../config/validate.js';
import { getProjectDir, projectExists, saveProjectConfig, slugify } from '../utils/project.js';
import { copyTemplate, initGitRepo } from '../utils/template.js';

import {
    startInput,
    stopInput,
    clearScreen,
    hideCursor,
    showCursor,
    type KeyEvent,
} from './input.js';

import {
    createAppState,
    setActiveTab,
    nextTab,
    prevTab,
    setFocusedField,
    toggleDropdown,
    setSummaryButton,
    setMessage,
    clearMessage,
    setProjectName,
    setBuilderBackend,
    setBuilderAuth,
    setReviewerEnabled,
    setReviewerBackend,
    setReviewerAuth,
    setArchitectEnabled,
    setArchitectBackend,
    setArchitectAuth,
    setEscalationEnabled,
    setCompletionEnabled,
    getFieldCount,
    TABS,
    type AppState,
    type TabName,
} from './state.js';

import { renderTabs } from './components/tabs.js';
import { renderHelpBar } from './components/help-bar.js';
import {
    renderProjectScreen,
    renderBuilderScreen,
    renderReviewerScreen,
    renderArchitectScreen,
    renderLoopScreen,
    renderSummaryScreen,
} from './screens/index.js';

export class TUIApp {
    private state: AppState;
    private running = false;
    private onExit: (() => void) | null = null;

    constructor(initialConfig?: ProjectConfig) {
        this.state = createAppState(initialConfig);
    }

    async run(): Promise<void> {
        this.running = true;

        hideCursor();
        this.render();

        startInput((key) => this.handleKey(key));

        // Wait for exit
        await new Promise<void>((resolve) => {
            this.onExit = resolve;
        });

        stopInput();
        showCursor();
        clearScreen();
    }

    private exit(): void {
        this.running = false;
        if (this.onExit) {
            this.onExit();
        }
    }

    private render(): void {
        if (!this.running) return;

        clearScreen();

        const lines: string[] = [];

        // Header
        lines.push('');
        lines.push(theme.heading('  ════════════════════════════════════════'));
        lines.push(theme.heading('        RALPH PROJECT CONFIGURATOR'));
        lines.push(theme.heading('  ════════════════════════════════════════'));

        // Tabs
        lines.push(renderTabs(TABS, this.state.activeTab));

        // Screen content
        lines.push('  ────────────────────────────────────────');
        lines.push(this.renderCurrentScreen());
        lines.push('  ────────────────────────────────────────');

        // Message
        if (this.state.message) {
            const icon = this.state.message.type === 'success' ? '✓' : '✗';
            const color = this.state.message.type === 'success' ? theme.success : theme.error;
            lines.push('');
            lines.push(`  ${color(icon)} ${color(this.state.message.text)}`);
        }

        // Help bar
        lines.push(renderHelpBar());

        console.log(lines.join('\n'));
    }

    private renderCurrentScreen(): string {
        switch (this.state.activeTab) {
            case 'project':
                return renderProjectScreen(this.state);
            case 'builder':
                return renderBuilderScreen(this.state);
            case 'reviewer':
                return renderReviewerScreen(this.state);
            case 'architect':
                return renderArchitectScreen(this.state);
            case 'loop':
                return renderLoopScreen(this.state);
            case 'summary':
                return renderSummaryScreen(this.state);
            default:
                return '';
        }
    }

    private handleKey(key: KeyEvent): void {
        // Clear message on any input
        if (this.state.message) {
            this.state = clearMessage(this.state);
        }

        // Quit
        if (key.name === 'q' && !this.state.dropdownOpen) {
            this.exit();
            return;
        }

        // Escape closes dropdown
        if (key.name === 'escape' && this.state.dropdownOpen) {
            this.state = toggleDropdown(this.state);
            this.render();
            return;
        }

        // Tab navigation with left/right arrows
        if (key.name === 'left' && !this.state.dropdownOpen) {
            this.state = prevTab(this.state);
            this.render();
            return;
        }
        if (key.name === 'right' && !this.state.dropdownOpen) {
            this.state = nextTab(this.state);
            this.render();
            return;
        }

        // Tab shortcuts (1-6)
        const tabNum = parseInt(key.name);
        if (!isNaN(tabNum) && tabNum >= 1 && tabNum <= 6 && !this.state.dropdownOpen) {
            this.state = setActiveTab(this.state, TABS[tabNum - 1]);
            this.render();
            return;
        }

        // Jump to summary with 's'
        if (key.name === 's' && !this.state.dropdownOpen) {
            this.state = setActiveTab(this.state, 'summary');
            this.render();
            return;
        }

        const fieldCount = getFieldCount(this.state);

        // Field navigation with up/down arrows
        if (key.name === 'up') {
            if (this.state.activeTab === 'summary') {
                this.state = setSummaryButton(this.state, Math.max(0, this.state.summaryButton - 1));
            } else {
                this.state = setFocusedField(this.state, Math.max(0, this.state.focusedField - 1));
            }
            this.render();
            return;
        }
        if (key.name === 'down') {
            if (this.state.activeTab === 'summary') {
                this.state = setSummaryButton(this.state, Math.min(1, this.state.summaryButton + 1));
            } else {
                this.state = setFocusedField(this.state, Math.min(fieldCount - 1, this.state.focusedField + 1));
            }
            this.render();
            return;
        }

        // Space toggles
        if (key.name === 'space') {
            this.handleSpace();
            this.render();
            return;
        }

        // Enter for selection/action
        if (key.name === 'return') {
            this.handleEnter();
            return;
        }

        // Backend selection with number keys for provider cards
        this.handleBackendSelection(key);
    }

    private handleSpace(): void {
        const tab = this.state.activeTab;
        const field = this.state.focusedField;

        if (tab === 'reviewer' && field === 0) {
            this.state = setReviewerEnabled(this.state, !this.state.config.reviewer.enabled);
        } else if (tab === 'architect' && field === 0) {
            this.state = setArchitectEnabled(this.state, !this.state.config.architect.enabled);
        } else if (tab === 'loop') {
            if (field === 1) {
                this.state = setCompletionEnabled(this.state, !this.state.config.completion_enabled);
            } else if (field === 2) {
                this.state = setEscalationEnabled(this.state, !this.state.config.escalation.enabled);
            }
        }
    }

    private handleEnter(): void {
        const tab = this.state.activeTab;
        const field = this.state.focusedField;

        if (tab === 'summary') {
            if (this.state.summaryButton === 0) {
                this.handleCreate();
            } else {
                this.exit();
            }
            return;
        }

        // Toggle dropdown for auth mode fields
        if ((tab === 'builder' && field === 1) ||
            (tab === 'reviewer' && field === 2 && this.state.config.reviewer.enabled) ||
            (tab === 'architect' && field === 2 && this.state.config.architect.enabled)) {
            this.state = toggleDropdown(this.state);
            this.render();
        }
    }

    private handleBackendSelection(key: KeyEvent): void {
        // Check for number keys 1-5 when focused on backend field
        const num = parseInt(key.sequence);
        if (isNaN(num) || num < 1 || num > 5) return;

        const backendIndex = num - 1;
        if (backendIndex >= BACKENDS.length) return;

        const backend = BACKENDS[backendIndex].id as Backend;
        const tab = this.state.activeTab;
        const field = this.state.focusedField;

        if (tab === 'builder' && field === 0) {
            this.state = setBuilderBackend(this.state, backend);
            this.state = setBuilderAuth(this.state, BACKENDS[backendIndex].authModes[0]);
        } else if (tab === 'reviewer' && field === 1 && this.state.config.reviewer.enabled) {
            this.state = setReviewerBackend(this.state, backend);
            this.state = setReviewerAuth(this.state, BACKENDS[backendIndex].authModes[0]);
        } else if (tab === 'architect' && field === 1 && this.state.config.architect.enabled) {
            this.state = setArchitectBackend(this.state, backend);
            this.state = setArchitectAuth(this.state, BACKENDS[backendIndex].authModes[0]);
        }

        this.render();
    }

    private handleCreate(): void {
        const slug = slugify(this.state.config.name);

        if (!slug) {
            this.state = setMessage(this.state, { text: 'Invalid project name', type: 'error' });
            this.render();
            return;
        }

        if (projectExists(slug) && !this.state.isEditing) {
            this.state = setMessage(this.state, { text: `Project '${slug}' already exists`, type: 'error' });
            this.render();
            return;
        }

        const validation = validateConfig(this.state.config);
        if (!validation.valid) {
            this.state = setMessage(this.state, {
                text: validation.errors[0]?.message || 'Invalid config',
                type: 'error'
            });
            this.render();
            return;
        }

        try {
            const projectDir = getProjectDir(slug);

            if (!this.state.isEditing) {
                copyTemplate(projectDir);
            }

            saveProjectConfig(slug, this.state.config);

            if (!this.state.isEditing) {
                initGitRepo(projectDir);
            }

            this.state = setMessage(this.state, {
                text: `Project '${slug}' ${this.state.isEditing ? 'updated' : 'created'} successfully!`,
                type: 'success'
            });
            this.render();

            // Exit after delay
            setTimeout(() => this.exit(), 1500);
        } catch (err) {
            this.state = setMessage(this.state, {
                text: `Failed: ${(err as Error).message}`,
                type: 'error'
            });
            this.render();
        }
    }
}
