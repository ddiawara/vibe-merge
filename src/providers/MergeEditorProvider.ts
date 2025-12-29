import * as vscode from 'vscode';
import * as path from 'path';
import { ConflictParser, ParsedConflict } from '../utils/ConflictParser';
import { getWebviewContent } from '../webview/MergeEditorWebview';
import { hasMojibake, fixMojibake, countMojibakePatterns, analyzeEncoding, detectLineEnding, normalizeLineEndings, EncodingInfo } from '../utils/EncodingUtils';
import { analyzeConflict, autoResolveConflict } from '../utils/DiffUtils';

export class MergeEditorProvider implements vscode.Disposable {
    private panel: vscode.WebviewPanel | undefined;
    private currentFile: vscode.Uri | undefined;
    private parsedConflict: ParsedConflict | undefined;
    private disposables: vscode.Disposable[] = [];
    private statusBarItem: vscode.StatusBarItem | undefined;

    // Encoding tracking - preserve original file characteristics
    private originalLineEnding: 'LF' | 'CRLF' = 'LF';
    private originalEncoding: string = 'utf-8';
    private hadMojibake: boolean = false;

    constructor(private readonly context: vscode.ExtensionContext) {
        // Create status bar item for encoding info
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.disposables.push(this.statusBarItem);
    }

    async openMergeEditor(fileUri: vscode.Uri): Promise<void> {
        this.currentFile = fileUri;

        // Read the file content
        const document = await vscode.workspace.openTextDocument(fileUri);
        let content = document.getText();

        // Analyze encoding and store original characteristics
        const encodingInfo = analyzeEncoding(content);
        this.originalLineEnding = encodingInfo.lineEnding === 'CRLF' ? 'CRLF' : 'LF';
        this.originalEncoding = encodingInfo.encoding;
        this.updateEncodingStatusBar(encodingInfo);

        // Check for encoding issues (mojibake) - AUTO-FIX to prevent corruption
        if (hasMojibake(content)) {
            this.hadMojibake = true;
            const patternCount = countMojibakePatterns(content);

            // Auto-fix mojibake to prevent propagating corruption
            content = fixMojibake(content);
            const fixedEncodingInfo = analyzeEncoding(content);
            this.updateEncodingStatusBar(fixedEncodingInfo);

            // Notify user
            vscode.window.showWarningMessage(
                `VibeMerge: Fixed ${patternCount} encoding issue(s) in file. Will save as clean UTF-8.`
            );
        } else {
            this.hadMojibake = false;
        }

        // Parse conflicts
        const parser = new ConflictParser();
        this.parsedConflict = parser.parse(content);

        if (this.parsedConflict.conflicts.length === 0) {
            vscode.window.showInformationMessage('No merge conflicts found in this file');
            return;
        }

        // Create or reveal the webview panel
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.One);
        } else {
            this.panel = vscode.window.createWebviewPanel(
                'vibeMerge.mergeEditor',
                `Merge: ${path.basename(fileUri.fsPath)}`,
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [
                        vscode.Uri.joinPath(this.context.extensionUri, 'media')
                    ]
                }
            );

            // Handle panel disposal
            this.panel.onDidDispose(() => {
                this.panel = undefined;
                vscode.commands.executeCommand('setContext', 'vibeMerge.editorActive', false);
            }, null, this.disposables);

            // Handle messages from the webview
            this.panel.webview.onDidReceiveMessage(
                message => this.handleWebviewMessage(message),
                null,
                this.disposables
            );
        }

        // Set context for keybindings
        vscode.commands.executeCommand('setContext', 'vibeMerge.editorActive', true);

        // Get language ID for syntax highlighting
        const languageId = document.languageId;

        // Update the webview content
        this.panel.webview.html = getWebviewContent(
            this.panel.webview,
            this.context.extensionUri,
            this.parsedConflict,
            languageId,
            path.basename(fileUri.fsPath)
        );
    }

    private async handleWebviewMessage(message: any): Promise<void> {
        // Guard against messages received before conflicts are parsed
        if (!this.parsedConflict && message.command !== 'cancel') {
            console.warn('VibeMerge: Received message before conflicts were parsed');
            return;
        }

        switch (message.command) {
            case 'acceptChange':
                await this.applyChange(message.conflictIndex, message.side);
                break;
            case 'acceptAllNonConflicting':
                await this.acceptAllNonConflicting();
                break;
            case 'save':
                await this.saveResult(message.content);
                break;
            case 'updateResult':
                // Update the parsed conflict with manual edits
                if (this.parsedConflict && message.conflictIndex !== undefined) {
                    this.parsedConflict.conflicts[message.conflictIndex].result = message.content;
                }
                break;
            case 'saveAndClose':
                await this.saveResult(message.content);
                this.panel?.dispose();
                break;
            case 'cancel':
                this.panel?.dispose();
                break;
        }
    }

    private async applyChange(conflictIndex: number, side: 'left' | 'right' | 'both'): Promise<void> {
        if (!this.parsedConflict) return;

        const conflict = this.parsedConflict.conflicts[conflictIndex];

        switch (side) {
            case 'left':
                conflict.result = conflict.current;
                conflict.winner = 'left';
                break;
            case 'right':
                conflict.result = conflict.incoming;
                conflict.winner = 'right';
                break;
            case 'both':
                conflict.result = conflict.current + '\n' + conflict.incoming;
                conflict.winner = 'both';
                break;
        }

        conflict.resolved = true;

        // Notify webview of the change
        this.panel?.webview.postMessage({
            command: 'conflictResolved',
            conflictIndex,
            result: conflict.result,
            winner: conflict.winner,
            allResolved: this.parsedConflict.conflicts.every(c => c.resolved)
        });
    }

    private async acceptAllNonConflicting(): Promise<void> {
        if (!this.parsedConflict) return;

        let autoResolvedCount = 0;
        const resolutionDetails: string[] = [];

        // Use advanced conflict analysis (KDiff3/IntelliJ inspired)
        this.parsedConflict.conflicts.forEach((conflict, index) => {
            if (!conflict.resolved) {
                // Use base if available (diff3 style) for better analysis
                const analysis = analyzeConflict(conflict.current, conflict.incoming, conflict.base);

                // Only auto-resolve if confidence is high enough (> 0.6)
                if (analysis.type !== 'real-conflict' && analysis.confidence > 0.6) {
                    const resolved = autoResolveConflict(conflict.current, conflict.incoming, conflict.base);
                    if (resolved !== null) {
                        conflict.result = resolved;
                        conflict.resolved = true;
                        autoResolvedCount++;

                        // Track winner for UI feedback
                        if (analysis.suggestion === 'left') {
                            conflict.winner = 'left';
                        } else if (analysis.suggestion === 'right') {
                            conflict.winner = 'right';
                        } else if (analysis.suggestion === 'both') {
                            conflict.winner = 'both';
                        }

                        resolutionDetails.push(`Conflict ${index + 1}: ${analysis.reason} (${Math.round(analysis.confidence * 100)}% confidence)`);
                    }
                }
            }
        });

        // Show summary notification
        if (autoResolvedCount > 0) {
            const remaining = this.parsedConflict.conflicts.filter(c => !c.resolved).length;
            if (remaining > 0) {
                vscode.window.showInformationMessage(
                    `Auto-resolved ${autoResolvedCount} conflict(s). ${remaining} conflict(s) require manual resolution.`
                );
            } else {
                vscode.window.showInformationMessage(
                    `All ${autoResolvedCount} conflict(s) auto-resolved!`
                );
            }
        } else {
            vscode.window.showInformationMessage(
                'No conflicts could be auto-resolved. Manual resolution required for all conflicts.'
            );
        }

        // Update webview
        this.panel?.webview.postMessage({
            command: 'bulkUpdate',
            conflicts: this.parsedConflict.conflicts,
            allResolved: this.parsedConflict.conflicts.every(c => c.resolved),
            resolutionDetails
        });
    }

    private async saveResult(content: string): Promise<void> {
        if (!this.currentFile) return;

        // Check for unresolved conflicts
        const unresolvedCount = this.parsedConflict?.conflicts.filter(c => !c.resolved).length ?? 0;
        if (unresolvedCount > 0) {
            const choice = await vscode.window.showWarningMessage(
                `${unresolvedCount} conflict(s) are not resolved. Save anyway?`,
                'Save Anyway', 'Cancel'
            );
            if (choice !== 'Save Anyway') return;
        }

        try {
            // CRITICAL: Auto-fix any mojibake before saving to prevent corruption
            let cleanContent = content;
            if (hasMojibake(cleanContent)) {
                const fixedCount = countMojibakePatterns(cleanContent);
                cleanContent = fixMojibake(cleanContent);
                console.log(`VibeMerge: Auto-fixed ${fixedCount} mojibake patterns before save`);
            }

            // Normalize to consistent line endings (preserve original style)
            cleanContent = normalizeLineEndings(cleanContent, this.originalLineEnding);

            // Save as clean UTF-8 (TextEncoder always produces valid UTF-8)
            const encoder = new TextEncoder();
            await vscode.workspace.fs.writeFile(this.currentFile, encoder.encode(cleanContent));

            if (unresolvedCount > 0) {
                vscode.window.showWarningMessage(`File saved with ${unresolvedCount} unresolved conflict(s)`);
            } else {
                vscode.window.showInformationMessage('Merge conflicts resolved and saved!');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save: ${error}`);
        }
    }

    acceptChanges(side: 'left' | 'right' | 'both'): void {
        this.panel?.webview.postMessage({
            command: 'acceptCurrentConflict',
            side
        });
    }

    private updateEncodingStatusBar(info: EncodingInfo): void {
        if (!this.statusBarItem) return;

        // Build status bar text
        const confidencePercent = Math.round(info.confidence * 100);
        let icon = '$(file-code)';

        if (info.mojibakeCount > 0) {
            icon = '$(warning)';
        } else if (confidencePercent >= 95) {
            icon = '$(check)';
        }

        this.statusBarItem.text = `${icon} ${info.encoding.toUpperCase()} (${confidencePercent}%)`;

        // Build tooltip with details
        const tooltipLines = [
            `Encoding: ${info.encoding}`,
            `Confidence: ${confidencePercent}%`,
            `Line Endings: ${info.lineEnding}`,
            `Has BOM: ${info.hasBOM ? 'Yes' : 'No'}`,
        ];

        if (info.mojibakeCount > 0) {
            tooltipLines.push(`Mojibake Characters: ${info.mojibakeCount}`);
        }

        this.statusBarItem.tooltip = tooltipLines.join('\n');

        // Set color based on confidence
        if (info.mojibakeCount > 0) {
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        } else {
            this.statusBarItem.backgroundColor = undefined;
        }

        this.statusBarItem.show();
    }

    private hideEncodingStatusBar(): void {
        this.statusBarItem?.hide();
    }

    dispose(): void {
        this.hideEncodingStatusBar();
        this.panel?.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}
