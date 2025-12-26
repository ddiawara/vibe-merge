import * as vscode from 'vscode';
import { MergeEditorProvider } from './providers/MergeEditorProvider';
import { GitConflictDetector } from './utils/GitConflictDetector';
import { ConflictFileDecorator } from './providers/ConflictFileDecorator';

let mergeEditorProvider: MergeEditorProvider;
let conflictDetector: GitConflictDetector;
let conflictDecorator: ConflictFileDecorator;

export function activate(context: vscode.ExtensionContext) {
    console.log('Git Merge Wizard is now active!');

    // Initialize providers
    mergeEditorProvider = new MergeEditorProvider(context);
    conflictDetector = new GitConflictDetector();
    conflictDecorator = new ConflictFileDecorator();

    // Register commands
    const openMergeEditor = vscode.commands.registerCommand(
        'gitMergeWizard.openMergeEditor',
        async (uri?: vscode.Uri) => {
            const fileUri = uri || vscode.window.activeTextEditor?.document.uri;
            if (!fileUri) {
                vscode.window.showWarningMessage('No file selected for merge resolution');
                return;
            }
            await mergeEditorProvider.openMergeEditor(fileUri);
        }
    );

    const resolveConflicts = vscode.commands.registerCommand(
        'gitMergeWizard.resolveConflicts',
        async () => {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                vscode.window.showWarningMessage('No workspace folder open');
                return;
            }

            const conflicts = await conflictDetector.detectConflicts(workspaceFolders[0].uri.fsPath);
            if (conflicts.length === 0) {
                vscode.window.showInformationMessage('No merge conflicts detected');
                return;
            }

            const items = conflicts.map(file => ({
                label: vscode.workspace.asRelativePath(file),
                uri: vscode.Uri.file(file)
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a file with conflicts to resolve',
                canPickMany: false
            });

            if (selected) {
                await mergeEditorProvider.openMergeEditor(selected.uri);
            }
        }
    );

    const acceptLeft = vscode.commands.registerCommand(
        'gitMergeWizard.acceptLeft',
        () => mergeEditorProvider.acceptChanges('left')
    );

    const acceptRight = vscode.commands.registerCommand(
        'gitMergeWizard.acceptRight',
        () => mergeEditorProvider.acceptChanges('right')
    );

    const acceptBoth = vscode.commands.registerCommand(
        'gitMergeWizard.acceptBoth',
        () => mergeEditorProvider.acceptChanges('both')
    );

    // Register file system watcher for conflict detection
    const watcher = vscode.workspace.createFileSystemWatcher('**/*');
    watcher.onDidChange(async (uri) => {
        const hasConflicts = await conflictDetector.hasConflictMarkers(uri.fsPath);
        vscode.commands.executeCommand('setContext', 'gitMergeWizard.hasConflicts', hasConflicts);
    });

    // Register decorations provider
    context.subscriptions.push(
        vscode.window.registerFileDecorationProvider(conflictDecorator)
    );

    // Add all disposables
    context.subscriptions.push(
        openMergeEditor,
        resolveConflicts,
        acceptLeft,
        acceptRight,
        acceptBoth,
        watcher,
        mergeEditorProvider
    );

    // Initial conflict detection
    detectInitialConflicts();
}

async function detectInitialConflicts() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;

    const conflicts = await conflictDetector.detectConflicts(workspaceFolders[0].uri.fsPath);
    vscode.commands.executeCommand('setContext', 'gitMergeWizard.hasConflicts', conflicts.length > 0);

    if (conflicts.length > 0) {
        const action = await vscode.window.showInformationMessage(
            `Found ${conflicts.length} file(s) with merge conflicts`,
            'Resolve Now',
            'Later'
        );
        if (action === 'Resolve Now') {
            vscode.commands.executeCommand('gitMergeWizard.resolveConflicts');
        }
    }
}

export function deactivate() {
    console.log('Git Merge Wizard is now deactivated');
}
