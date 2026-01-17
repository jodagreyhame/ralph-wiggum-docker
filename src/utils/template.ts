/**
 * Template Copying Operations
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

// Get the template directory from the main project
function getTemplateDir(): string {
    const cwd = process.cwd();
    const possiblePaths = [
        path.join(cwd, 'template'),
        path.join(cwd, 'reference', 'template'),
    ];

    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            return p;
        }
    }

    // Fallback to CWD template
    return path.join(cwd, 'template');
}

export function copyTemplate(targetDir: string): boolean {
    const templateDir = getTemplateDir();

    if (!fs.existsSync(templateDir)) {
        console.error(`Template directory not found: ${templateDir}`);
        return false;
    }

    // Ensure target directory exists
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    // Copy all template files recursively
    copyDirRecursive(templateDir, targetDir);

    // Create logs directory
    const logsDir = path.join(targetDir, 'logs');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }

    return true;
}

function copyDirRecursive(src: string, dest: string): void {
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            if (!fs.existsSync(destPath)) {
                fs.mkdirSync(destPath, { recursive: true });
            }
            copyDirRecursive(srcPath, destPath);
        } else {
            // Don't overwrite config.json - it will be written separately
            if (entry.name !== 'config.json') {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }
}

export function initGitRepo(projectDir: string): boolean {
    const gitDir = path.join(projectDir, '.git');
    if (fs.existsSync(gitDir)) {
        return true; // Already initialized
    }

    try {
        execSync('git init', { cwd: projectDir, stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}
