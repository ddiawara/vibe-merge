import * as vscode from 'vscode';
import * as path from 'path';
import { ConflictParser, ParsedConflict } from '../utils/ConflictParser';
import { getWebviewContent } from '../webview/MergeEditorWebview';

export class MergeEditorProvider implements vscode.Disposable {
    private panel: vscode.WebviewPanel | undefined;
    private currentFile: vscode.Uri | undefined;
    private parsedConflict: ParsedConflict | undefined;
    private disposables: vscode.Disposable[] = [];

    constructor(private readonly context: vscode.ExtensionContext) {}

    async openMergeEditor(fileUri: vscode.Uri): Promise<void> {
        this.currentFile = fileUri;

        // Read the file content
        const document = await vscode.workspace.openTextDocument(fileUri);
        const content = document.getText();

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
                'gitMergeWizard.mergeEditor',
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
                vscode.commands.executeCommand('setContext', 'gitMergeWizard.editorActive', false);
            }, null, this.disposables);

            // Handle messages from the webview
            this.panel.webview.onDidReceiveMessage(
                message => this.handleWebviewMessage(message),
                null,
                this.disposables
            );
        }

        // Set context for keybindings
        vscode.commands.executeCommand('setContext', 'gitMergeWizard.editorActive', true);

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
                break;
            case 'right':
                conflict.result = conflict.incoming;
                break;
            case 'both':
                conflict.result = conflict.current + '\n' + conflict.incoming;
                break;
        }

        conflict.resolved = true;

        // Notify webview of the change
        this.panel?.webview.postMessage({
            command: 'conflictResolved',
            conflictIndex,
            result: conflict.result,
            allResolved: this.parsedConflict.conflicts.every(c => c.resolved)
        });
    }

    private async acceptAllNonConflicting(): Promise<void> {
        if (!this.parsedConflict) return;

        // For simple conflicts where one side is empty or identical, auto-resolve
        this.parsedConflict.conflicts.forEach((conflict, index) => {
            if (!conflict.resolved) {
                if (conflict.current.trim() === '') {
                    conflict.result = conflict.incoming;
                    conflict.resolved = true;
                } else if (conflict.incoming.trim() === '') {
                    conflict.result = conflict.current;
                    conflict.resolved = true;
                } else if (conflict.current === conflict.incoming) {
                    conflict.result = conflict.current;
                    conflict.resolved = true;
                }
            }
        });

        // Update webview
        this.panel?.webview.postMessage({
            command: 'bulkUpdate',
            conflicts: this.parsedConflict.conflicts,
            allResolved: this.parsedConflict.conflicts.every(c => c.resolved)
        });
    }

    private async saveResult(content: string): Promise<void> {
        if (!this.currentFile) return;

        try {
            const encoder = new TextEncoder();
            await vscode.workspace.fs.writeFile(this.currentFile, encoder.encode(content));
            vscode.window.showInformationMessage('Merge conflicts resolved and saved!');
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

    dispose(): void {
        this.panel?.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}
