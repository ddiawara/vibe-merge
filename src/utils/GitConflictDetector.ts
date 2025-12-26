import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class GitConflictDetector {
    private readonly CONFLICT_MARKERS = /^(<{7}|={7}|>{7})/m;

    /**
     * Detects all files with merge conflicts in the given directory
     */
    async detectConflicts(workspacePath: string): Promise<string[]> {
        const conflictFiles: string[] = [];

        try {
            // First, try to use git to find conflicted files
            const gitConflicts = await this.getGitConflictedFiles(workspacePath);
            if (gitConflicts.length > 0) {
                return gitConflicts;
            }

            // Fallback: scan files for conflict markers
            await this.scanDirectoryForConflicts(workspacePath, conflictFiles);
        } catch (error) {
            console.error('Error detecting conflicts:', error);
        }

        return conflictFiles;
    }

    /**
     * Uses git to find files with unresolved conflicts
     */
    private async getGitConflictedFiles(workspacePath: string): Promise<string[]> {
        try {
            const { stdout } = await execAsync('git diff --name-only --diff-filter=U', {
                cwd: workspacePath
            });

            return stdout
                .split('\n')
                .filter(line => line.trim() !== '')
                .map(file => path.join(workspacePath, file));
        } catch {
            return [];
        }
    }

    /**
     * Scans directory recursively for files containing conflict markers
     */
    private async scanDirectoryForConflicts(
        dir: string,
        results: string[],
        depth = 0
    ): Promise<void> {
        // Limit recursion depth
        if (depth > 10) return;

        const ignorePatterns = ['node_modules', '.git', 'dist', 'out', 'build', '.next'];

        try {
            const entries = await fs.promises.readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    if (!ignorePatterns.includes(entry.name)) {
                        await this.scanDirectoryForConflicts(fullPath, results, depth + 1);
                    }
                } else if (entry.isFile()) {
                    // Only check text files
                    if (this.isTextFile(entry.name)) {
                        const hasConflicts = await this.hasConflictMarkers(fullPath);
                        if (hasConflicts) {
                            results.push(fullPath);
                        }
                    }
                }
            }
        } catch (error) {
            // Ignore permission errors
        }
    }

    /**
     * Checks if a file contains conflict markers
     */
    async hasConflictMarkers(filePath: string): Promise<boolean> {
        try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            return this.CONFLICT_MARKERS.test(content);
        } catch {
            return false;
        }
    }

    /**
     * Determines if a file is likely a text file based on extension
     */
    private isTextFile(filename: string): boolean {
        const textExtensions = [
            '.js', '.ts', '.jsx', '.tsx', '.json', '.md', '.txt', '.html', '.css',
            '.scss', '.sass', '.less', '.vue', '.svelte', '.py', '.rb', '.php',
            '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.rs', '.swift',
            '.kt', '.scala', '.yml', '.yaml', '.xml', '.sql', '.sh', '.bash',
            '.zsh', '.fish', '.ps1', '.bat', '.cmd', '.ini', '.cfg', '.conf',
            '.toml', '.lock', '.gitignore', '.env', '.editorconfig'
        ];

        const ext = path.extname(filename).toLowerCase();
        return textExtensions.includes(ext) || !ext; // Include files without extension
    }

    /**
     * Gets conflict statistics for a file
     */
    async getConflictStats(filePath: string): Promise<{ count: number; lines: number[] }> {
        try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            const lines = content.split('\n');
            const conflictLines: number[] = [];
            let count = 0;

            for (let i = 0; i < lines.length; i++) {
                if (lines[i].startsWith('<<<<<<<')) {
                    count++;
                    conflictLines.push(i + 1);
                }
            }

            return { count, lines: conflictLines };
        } catch {
            return { count: 0, lines: [] };
        }
    }
}
