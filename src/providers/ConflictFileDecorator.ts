import * as vscode from 'vscode';
import { GitConflictDetector } from '../utils/GitConflictDetector';

export class ConflictFileDecorator implements vscode.FileDecorationProvider {
    private readonly detector = new GitConflictDetector();
    private readonly _onDidChangeFileDecorations = new vscode.EventEmitter<vscode.Uri | vscode.Uri[]>();

    readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

    async provideFileDecoration(uri: vscode.Uri): Promise<vscode.FileDecoration | undefined> {
        // Only check files, not directories
        if (uri.scheme !== 'file') {
            return undefined;
        }

        try {
            const hasConflicts = await this.detector.hasConflictMarkers(uri.fsPath);

            if (hasConflicts) {
                const stats = await this.detector.getConflictStats(uri.fsPath);

                return new vscode.FileDecoration(
                    '⚡',  // Badge
                    `${stats.count} merge conflict${stats.count > 1 ? 's' : ''}`,  // Tooltip
                    new vscode.ThemeColor('gitDecoration.conflictingResourceForeground')
                );
            }
        } catch {
            // Ignore errors
        }

        return undefined;
    }

    refresh(uri?: vscode.Uri): void {
        if (uri) {
            this._onDidChangeFileDecorations.fire(uri);
        } else {
            this._onDidChangeFileDecorations.fire([]);
        }
    }
}
