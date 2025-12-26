import * as vscode from 'vscode';
import { ParsedConflict } from '../utils/ConflictParser';

export function getWebviewContent(
    webview: vscode.Webview,
    extensionUri: vscode.Uri,
    parsed: ParsedConflict,
    languageId: string,
    fileName: string
): string {
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>Merge Editor - ${fileName}</title>
    <style>
        ${getStyles()}
    </style>
</head>
<body>
    <div class="merge-editor">
        <!-- Header Toolbar -->
        <div class="toolbar">
            <div class="toolbar-left">
                <span class="file-name">
                    <span class="icon">$(git-merge)</span>
                    ${fileName}
                </span>
                <span class="conflict-count" id="conflictCount">
                    <span class="badge">${parsed.conflicts.length}</span> conflict${parsed.conflicts.length > 1 ? 's' : ''}
                </span>
            </div>
            <div class="toolbar-center">
                <button class="btn btn-secondary" id="prevConflict" title="Previous conflict (Alt+↑)">
                    <span class="codicon">↑</span> Prev
                </button>
                <span class="conflict-navigator" id="conflictNavigator">1 / ${parsed.conflicts.length}</span>
                <button class="btn btn-secondary" id="nextConflict" title="Next conflict (Alt+↓)">
                    Next <span class="codicon">↓</span>
                </button>
            </div>
            <div class="toolbar-right">
                <button class="btn btn-secondary" id="acceptAllNonConflicting" title="Apply all non-conflicting changes">
                    <span class="codicon">⚡</span> Auto-merge Simple
                </button>
                <button class="btn btn-primary" id="saveBtn" title="Save resolved file">
                    <span class="codicon">💾</span> Save
                </button>
                <button class="btn btn-danger" id="cancelBtn" title="Cancel and close">
                    Cancel
                </button>
            </div>
        </div>

        <!-- Panel Headers -->
        <div class="panel-headers">
            <div class="panel-header left">
                <span class="label">Current (Yours)</span>
                <span class="branch-label">${parsed.conflicts[0]?.currentLabel || 'HEAD'}</span>
            </div>
            <div class="panel-header center">
                <span class="label">Result</span>
                <span class="hint">Editable - Final merged output</span>
            </div>
            <div class="panel-header right">
                <span class="label">Incoming (Theirs)</span>
                <span class="branch-label">${parsed.conflicts[0]?.incomingLabel || 'incoming'}</span>
            </div>
        </div>

        <!-- Three-Way Panels -->
        <div class="panels-container">
            <!-- Left Panel: Current/Ours -->
            <div class="panel left-panel" id="leftPanel">
                <div class="panel-content" id="leftContent"></div>
            </div>

            <!-- Center Panel: Result -->
            <div class="panel center-panel" id="centerPanel">
                <div class="panel-content editable" id="centerContent" contenteditable="true"></div>
            </div>

            <!-- Right Panel: Incoming/Theirs -->
            <div class="panel right-panel" id="rightPanel">
                <div class="panel-content" id="rightContent"></div>
            </div>
        </div>

        <!-- Footer Status -->
        <div class="footer">
            <div class="status-left">
                <span class="resolved-count" id="resolvedCount">0 / ${parsed.conflicts.length} resolved</span>
            </div>
            <div class="status-center">
                <span class="hint">Click arrows to accept changes • Edit result directly • Ctrl+S to save</span>
            </div>
            <div class="status-right">
                <span class="language">${languageId}</span>
            </div>
        </div>
    </div>

    <script nonce="${nonce}">
        ${getScript(parsed)}
    </script>
</body>
</html>`;
}

function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

function getStyles(): string {
    return `
        :root {
            --bg-color: var(--vscode-editor-background);
            --text-color: var(--vscode-editor-foreground);
            --border-color: var(--vscode-panel-border);
            --header-bg: var(--vscode-sideBarSectionHeader-background);
            --toolbar-bg: var(--vscode-titleBar-activeBackground);
            --btn-bg: var(--vscode-button-secondaryBackground);
            --btn-fg: var(--vscode-button-secondaryForeground);
            --btn-primary-bg: var(--vscode-button-background);
            --btn-primary-fg: var(--vscode-button-foreground);
            --conflict-current: rgba(64, 200, 174, 0.2);
            --conflict-current-border: #40c8ae;
            --conflict-incoming: rgba(64, 156, 255, 0.2);
            --conflict-incoming-border: #409cff;
            --conflict-result: rgba(255, 200, 50, 0.15);
            --conflict-line-added: rgba(35, 134, 54, 0.3);
            --conflict-line-removed: rgba(248, 81, 73, 0.3);
            --conflict-line-modified: rgba(210, 153, 34, 0.3);
            --line-number-color: var(--vscode-editorLineNumber-foreground);
            --selection-bg: var(--vscode-editor-selectionBackground);
            --hover-bg: var(--vscode-list-hoverBackground);
            --focus-border: var(--vscode-focusBorder);
            --scrollbar-bg: var(--vscode-scrollbarSlider-background);
            --scrollbar-hover: var(--vscode-scrollbarSlider-hoverBackground);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--text-color);
            background: var(--bg-color);
            height: 100vh;
            overflow: hidden;
        }

        .merge-editor {
            display: flex;
            flex-direction: column;
            height: 100vh;
        }

        /* Toolbar */
        .toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 16px;
            background: var(--toolbar-bg);
            border-bottom: 1px solid var(--border-color);
            flex-shrink: 0;
        }

        .toolbar-left, .toolbar-center, .toolbar-right {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .file-name {
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .conflict-count {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .badge {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 600;
        }

        .conflict-navigator {
            font-size: 12px;
            opacity: 0.8;
            min-width: 60px;
            text-align: center;
        }

        .btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-family: inherit;
            transition: all 0.15s ease;
        }

        .btn-secondary {
            background: var(--btn-bg);
            color: var(--btn-fg);
        }

        .btn-secondary:hover {
            background: var(--hover-bg);
        }

        .btn-primary {
            background: var(--btn-primary-bg);
            color: var(--btn-primary-fg);
        }

        .btn-primary:hover {
            opacity: 0.9;
        }

        .btn-danger {
            background: rgba(248, 81, 73, 0.2);
            color: #f85149;
        }

        .btn-danger:hover {
            background: rgba(248, 81, 73, 0.3);
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        /* Panel Headers */
        .panel-headers {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            border-bottom: 1px solid var(--border-color);
            flex-shrink: 0;
        }

        .panel-header {
            padding: 10px 16px;
            background: var(--header-bg);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .panel-header.left {
            border-right: 1px solid var(--border-color);
        }

        .panel-header.center {
            background: linear-gradient(to right, var(--conflict-current), var(--conflict-incoming));
        }

        .panel-header.right {
            border-left: 1px solid var(--border-color);
        }

        .panel-header .label {
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .panel-header .branch-label {
            font-size: 11px;
            opacity: 0.7;
            font-family: var(--vscode-editor-font-family);
            background: var(--bg-color);
            padding: 2px 8px;
            border-radius: 4px;
        }

        .panel-header .hint {
            font-size: 11px;
            opacity: 0.6;
        }

        /* Panels Container */
        .panels-container {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            flex: 1;
            overflow: hidden;
        }

        .panel {
            display: flex;
            flex-direction: column;
            overflow: hidden;
            position: relative;
        }

        .left-panel {
            border-right: 2px solid var(--conflict-current-border);
        }

        .right-panel {
            border-left: 2px solid var(--conflict-incoming-border);
        }

        .panel-content {
            flex: 1;
            overflow: auto;
            padding: 0;
            font-family: var(--vscode-editor-font-family);
            font-size: 13px;
            line-height: 1.5;
            white-space: pre;
            scrollbar-width: thin;
        }

        .panel-content::-webkit-scrollbar {
            width: 10px;
            height: 10px;
        }

        .panel-content::-webkit-scrollbar-track {
            background: transparent;
        }

        .panel-content::-webkit-scrollbar-thumb {
            background: var(--scrollbar-bg);
            border-radius: 5px;
        }

        .panel-content::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-hover);
        }

        .panel-content.editable {
            background: var(--conflict-result);
            outline: none;
        }

        .panel-content.editable:focus {
            box-shadow: inset 0 0 0 1px var(--focus-border);
        }

        /* Conflict Blocks */
        .conflict-block {
            margin: 0;
            position: relative;
        }

        .conflict-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 4px 12px;
            background: var(--header-bg);
            border-bottom: 1px solid var(--border-color);
            font-size: 11px;
            position: sticky;
            top: 0;
            z-index: 10;
        }

        .conflict-header .conflict-label {
            font-weight: 600;
            color: var(--vscode-descriptionForeground);
        }

        .conflict-actions {
            display: flex;
            gap: 4px;
        }

        .action-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 24px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            background: transparent;
            color: var(--text-color);
            transition: all 0.15s ease;
        }

        .action-btn:hover {
            background: var(--hover-bg);
        }

        .action-btn.accept-left {
            color: var(--conflict-current-border);
        }

        .action-btn.accept-right {
            color: var(--conflict-incoming-border);
        }

        .action-btn.accept-both {
            color: #d29922;
        }

        .action-btn:hover.accept-left {
            background: var(--conflict-current);
        }

        .action-btn:hover.accept-right {
            background: var(--conflict-incoming);
        }

        .code-block {
            padding: 8px 12px;
            min-height: 40px;
        }

        .left-panel .code-block {
            background: var(--conflict-current);
        }

        .right-panel .code-block {
            background: var(--conflict-incoming);
        }

        .line {
            display: flex;
        }

        .line-number {
            min-width: 40px;
            padding-right: 12px;
            text-align: right;
            color: var(--line-number-color);
            user-select: none;
            opacity: 0.6;
        }

        .line-content {
            flex: 1;
        }

        .line.added {
            background: var(--conflict-line-added);
        }

        .line.removed {
            background: var(--conflict-line-removed);
        }

        .line.modified {
            background: var(--conflict-line-modified);
        }

        /* Arrow indicators */
        .arrow-indicator {
            position: absolute;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 30px;
            height: 30px;
            background: var(--btn-primary-bg);
            color: var(--btn-primary-fg);
            border-radius: 50%;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            z-index: 20;
            transition: transform 0.15s ease, box-shadow 0.15s ease;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .arrow-indicator:hover {
            transform: scale(1.1);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }

        .arrow-indicator.left-arrow {
            right: -15px;
            top: 50%;
            transform: translateY(-50%);
        }

        .arrow-indicator.right-arrow {
            left: -15px;
            top: 50%;
            transform: translateY(-50%);
        }

        .arrow-indicator.left-arrow:hover {
            transform: translateY(-50%) scale(1.1);
        }

        .arrow-indicator.right-arrow:hover {
            transform: translateY(-50%) scale(1.1);
        }

        /* Resolution status */
        .conflict-block.resolved .conflict-header {
            background: rgba(35, 134, 54, 0.2);
        }

        .conflict-block.resolved .code-block {
            opacity: 0.6;
        }

        /* Footer */
        .footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 16px;
            background: var(--toolbar-bg);
            border-top: 1px solid var(--border-color);
            font-size: 12px;
            flex-shrink: 0;
        }

        .status-left, .status-center, .status-right {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .resolved-count {
            color: var(--vscode-descriptionForeground);
        }

        .hint {
            opacity: 0.6;
        }

        .language {
            background: var(--header-bg);
            padding: 2px 8px;
            border-radius: 4px;
        }

        /* Non-conflict sections */
        .non-conflict {
            padding: 8px 12px;
            opacity: 0.8;
            background: var(--bg-color);
            border-bottom: 1px solid var(--border-color);
        }

        /* Keyboard shortcuts hint */
        .keyboard-hint {
            position: fixed;
            bottom: 60px;
            right: 20px;
            background: var(--toolbar-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 12px 16px;
            font-size: 11px;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s ease;
            z-index: 100;
        }

        .keyboard-hint.visible {
            opacity: 1;
        }

        .keyboard-hint kbd {
            background: var(--header-bg);
            padding: 2px 6px;
            border-radius: 3px;
            border: 1px solid var(--border-color);
            font-family: inherit;
        }
    `;
}

function getScript(parsed: ParsedConflict): string {
    return `
        (function() {
            const vscode = acquireVsCodeApi();

            // State
            let conflicts = ${JSON.stringify(parsed.conflicts)};
            let nonConflictingParts = ${JSON.stringify(parsed.nonConflictingParts)};
            let currentConflictIndex = 0;
            let syncScroll = true;

            // DOM Elements
            const leftPanel = document.getElementById('leftContent');
            const centerPanel = document.getElementById('centerContent');
            const rightPanel = document.getElementById('rightContent');
            const conflictNavigator = document.getElementById('conflictNavigator');
            const conflictCount = document.getElementById('conflictCount');
            const resolvedCount = document.getElementById('resolvedCount');
            const prevBtn = document.getElementById('prevConflict');
            const nextBtn = document.getElementById('nextConflict');
            const saveBtn = document.getElementById('saveBtn');
            const cancelBtn = document.getElementById('cancelBtn');
            const acceptAllBtn = document.getElementById('acceptAllNonConflicting');

            // Initialize panels
            function renderPanels() {
                renderLeftPanel();
                renderRightPanel();
                renderCenterPanel();
                updateNavigator();
                updateResolvedCount();
            }

            function renderLeftPanel() {
                let html = '';

                conflicts.forEach((conflict, index) => {
                    html += renderConflictBlock(conflict, index, 'left');
                });

                leftPanel.innerHTML = html;
                attachLeftPanelEvents();
            }

            function renderRightPanel() {
                let html = '';

                conflicts.forEach((conflict, index) => {
                    html += renderConflictBlock(conflict, index, 'right');
                });

                rightPanel.innerHTML = html;
                attachRightPanelEvents();
            }

            function renderCenterPanel() {
                let html = '';

                conflicts.forEach((conflict, index) => {
                    const content = conflict.resolved ? conflict.result : '';
                    html += \`
                        <div class="conflict-block \${conflict.resolved ? 'resolved' : ''}" data-index="\${index}">
                            <div class="conflict-header">
                                <span class="conflict-label">
                                    \${conflict.resolved ? '✓ Resolved' : 'Conflict #' + (index + 1)}
                                </span>
                                <div class="conflict-actions">
                                    <button class="action-btn accept-left" data-index="\${index}" data-side="left" title="Accept current (yours)">
                                        ← Use Left
                                    </button>
                                    <button class="action-btn accept-both" data-index="\${index}" data-side="both" title="Accept both">
                                        ⇄ Both
                                    </button>
                                    <button class="action-btn accept-right" data-index="\${index}" data-side="right" title="Accept incoming (theirs)">
                                        Use Right →
                                    </button>
                                </div>
                            </div>
                            <div class="code-block result-block" contenteditable="true" data-index="\${index}">\${escapeHtml(content)}</div>
                        </div>
                    \`;
                });

                centerPanel.innerHTML = html;
                attachCenterPanelEvents();
            }

            function renderConflictBlock(conflict, index, side) {
                const content = side === 'left' ? conflict.current : conflict.incoming;
                const lines = content.split('\\n');

                let linesHtml = lines.map((line, lineIndex) => \`
                    <div class="line">
                        <span class="line-number">\${lineIndex + 1}</span>
                        <span class="line-content">\${escapeHtml(line)}</span>
                    </div>
                \`).join('');

                const arrowClass = side === 'left' ? 'left-arrow' : 'right-arrow';
                const arrowSymbol = side === 'left' ? '→' : '←';
                const arrowTitle = side === 'left' ? 'Accept current changes' : 'Accept incoming changes';

                return \`
                    <div class="conflict-block \${conflict.resolved ? 'resolved' : ''}" data-index="\${index}">
                        <div class="conflict-header">
                            <span class="conflict-label">
                                \${side === 'left' ? conflict.currentLabel : conflict.incomingLabel}
                            </span>
                        </div>
                        <div class="code-block">
                            \${linesHtml}
                            <div class="arrow-indicator \${arrowClass}"
                                 data-index="\${index}"
                                 data-side="\${side}"
                                 title="\${arrowTitle}">
                                \${arrowSymbol}
                            </div>
                        </div>
                    </div>
                \`;
            }

            function attachLeftPanelEvents() {
                leftPanel.querySelectorAll('.arrow-indicator').forEach(arrow => {
                    arrow.addEventListener('click', (e) => {
                        const index = parseInt(e.target.dataset.index);
                        acceptChange(index, 'left');
                    });
                });
            }

            function attachRightPanelEvents() {
                rightPanel.querySelectorAll('.arrow-indicator').forEach(arrow => {
                    arrow.addEventListener('click', (e) => {
                        const index = parseInt(e.target.dataset.index);
                        acceptChange(index, 'right');
                    });
                });
            }

            function attachCenterPanelEvents() {
                centerPanel.querySelectorAll('.action-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const index = parseInt(e.target.dataset.index);
                        const side = e.target.dataset.side;
                        acceptChange(index, side);
                    });
                });

                centerPanel.querySelectorAll('.result-block').forEach(block => {
                    block.addEventListener('input', (e) => {
                        const index = parseInt(e.target.dataset.index);
                        conflicts[index].result = e.target.textContent || '';
                        conflicts[index].resolved = true;
                        updateResolvedCount();
                        vscode.postMessage({
                            command: 'updateResult',
                            conflictIndex: index,
                            content: conflicts[index].result
                        });
                    });
                });
            }

            function acceptChange(index, side) {
                const conflict = conflicts[index];

                switch (side) {
                    case 'left':
                        conflict.result = conflict.current;
                        break;
                    case 'right':
                        conflict.result = conflict.incoming;
                        break;
                    case 'both':
                        conflict.result = conflict.current + '\\n' + conflict.incoming;
                        break;
                }

                conflict.resolved = true;

                vscode.postMessage({
                    command: 'acceptChange',
                    conflictIndex: index,
                    side: side
                });

                renderPanels();

                // Move to next unresolved conflict
                const nextUnresolved = conflicts.findIndex((c, i) => i > index && !c.resolved);
                if (nextUnresolved !== -1) {
                    currentConflictIndex = nextUnresolved;
                    scrollToConflict(nextUnresolved);
                }
            }

            function updateNavigator() {
                conflictNavigator.textContent = \`\${currentConflictIndex + 1} / \${conflicts.length}\`;
                prevBtn.disabled = currentConflictIndex === 0;
                nextBtn.disabled = currentConflictIndex === conflicts.length - 1;
            }

            function updateResolvedCount() {
                const resolved = conflicts.filter(c => c.resolved).length;
                resolvedCount.textContent = \`\${resolved} / \${conflicts.length} resolved\`;

                if (resolved === conflicts.length) {
                    resolvedCount.style.color = '#3fb950';
                    saveBtn.classList.add('pulse');
                } else {
                    resolvedCount.style.color = '';
                    saveBtn.classList.remove('pulse');
                }
            }

            function scrollToConflict(index) {
                const blocks = document.querySelectorAll('.conflict-block[data-index="' + index + '"]');
                blocks.forEach(block => {
                    block.scrollIntoView({ behavior: 'smooth', block: 'center' });
                });
                updateNavigator();
            }

            function getReconstructedContent() {
                let result = '';
                let conflictIndex = 0;

                // Sort non-conflicting parts by start position
                const sortedParts = [...nonConflictingParts].sort((a, b) => a.start - b.start);

                // Interleave non-conflicting parts with resolved conflicts
                let lastEnd = 0;

                for (const part of sortedParts) {
                    // Add any resolved conflicts that come before this part
                    while (conflictIndex < conflicts.length &&
                           conflicts[conflictIndex].startLine < part.start) {
                        const conflict = conflicts[conflictIndex];
                        if (conflict.resolved && conflict.result) {
                            result += conflict.result + '\\n';
                        }
                        conflictIndex++;
                    }

                    result += part.content + '\\n';
                }

                // Add remaining conflicts
                while (conflictIndex < conflicts.length) {
                    const conflict = conflicts[conflictIndex];
                    if (conflict.resolved && conflict.result) {
                        result += conflict.result + '\\n';
                    }
                    conflictIndex++;
                }

                return result.trim();
            }

            function escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }

            // Event Listeners
            prevBtn.addEventListener('click', () => {
                if (currentConflictIndex > 0) {
                    currentConflictIndex--;
                    scrollToConflict(currentConflictIndex);
                }
            });

            nextBtn.addEventListener('click', () => {
                if (currentConflictIndex < conflicts.length - 1) {
                    currentConflictIndex++;
                    scrollToConflict(currentConflictIndex);
                }
            });

            saveBtn.addEventListener('click', () => {
                const content = getReconstructedContent();
                vscode.postMessage({
                    command: 'save',
                    content: content
                });
            });

            cancelBtn.addEventListener('click', () => {
                vscode.postMessage({ command: 'cancel' });
            });

            acceptAllBtn.addEventListener('click', () => {
                vscode.postMessage({ command: 'acceptAllNonConflicting' });
            });

            // Synchronized scrolling
            function syncScrollHandler(source, ...targets) {
                if (!syncScroll) return;

                const scrollPercentage = source.scrollTop / (source.scrollHeight - source.clientHeight);

                targets.forEach(target => {
                    const targetScrollTop = scrollPercentage * (target.scrollHeight - target.clientHeight);
                    target.scrollTop = targetScrollTop;
                });
            }

            leftPanel.addEventListener('scroll', () => {
                syncScrollHandler(leftPanel, centerPanel, rightPanel);
            });

            centerPanel.addEventListener('scroll', () => {
                syncScrollHandler(centerPanel, leftPanel, rightPanel);
            });

            rightPanel.addEventListener('scroll', () => {
                syncScrollHandler(rightPanel, leftPanel, centerPanel);
            });

            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                if (e.altKey && e.key === 'ArrowUp') {
                    e.preventDefault();
                    prevBtn.click();
                } else if (e.altKey && e.key === 'ArrowDown') {
                    e.preventDefault();
                    nextBtn.click();
                } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    e.preventDefault();
                    saveBtn.click();
                } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'ArrowLeft') {
                    e.preventDefault();
                    acceptChange(currentConflictIndex, 'left');
                } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'ArrowRight') {
                    e.preventDefault();
                    acceptChange(currentConflictIndex, 'right');
                }
            });

            // Handle messages from extension
            window.addEventListener('message', event => {
                const message = event.data;

                switch (message.command) {
                    case 'conflictResolved':
                        conflicts[message.conflictIndex].result = message.result;
                        conflicts[message.conflictIndex].resolved = true;
                        renderPanels();
                        break;
                    case 'bulkUpdate':
                        conflicts = message.conflicts;
                        renderPanels();
                        break;
                    case 'acceptCurrentConflict':
                        acceptChange(currentConflictIndex, message.side);
                        break;
                }
            });

            // Initialize
            renderPanels();
        })();
    `;
}
