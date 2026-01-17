/**
 * Project File Operations
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ProjectConfig } from '../config/schema.js';

// Default projects directory
export const PROJECTS_DIR = '.projects';

export function getProjectsDir(): string {
    return path.resolve(process.cwd(), PROJECTS_DIR);
}

export function getProjectDir(projectName: string): string {
    const slug = slugify(projectName);
    return path.join(getProjectsDir(), slug);
}

export function slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/_/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

export function projectExists(projectName: string): boolean {
    const projectDir = getProjectDir(projectName);
    const configPath = path.join(projectDir, 'config.json');
    return fs.existsSync(configPath);
}

export function listProjects(): string[] {
    const projectsDir = getProjectsDir();
    if (!fs.existsSync(projectsDir)) {
        return [];
    }

    const entries = fs.readdirSync(projectsDir, { withFileTypes: true });
    return entries
        .filter((entry) => {
            if (!entry.isDirectory()) return false;
            // Skip hidden directories
            if (entry.name.startsWith('_')) return false;
            const configPath = path.join(projectsDir, entry.name, 'config.json');
            return fs.existsSync(configPath);
        })
        .map((entry) => entry.name);
}

export function loadProjectConfig(projectName: string): ProjectConfig | null {
    const projectDir = getProjectDir(projectName);
    const configPath = path.join(projectDir, 'config.json');

    if (!fs.existsSync(configPath)) {
        return null;
    }

    try {
        const content = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(content) as ProjectConfig;
    } catch {
        return null;
    }
}

export function saveProjectConfig(projectName: string, config: ProjectConfig): void {
    const projectDir = getProjectDir(projectName);
    const configPath = path.join(projectDir, 'config.json');

    // Ensure directory exists
    if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export function deleteProject(projectName: string): boolean {
    const projectDir = getProjectDir(projectName);
    if (!fs.existsSync(projectDir)) {
        return false;
    }

    fs.rmSync(projectDir, { recursive: true, force: true });
    return true;
}
