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
    const styles = getStyles();
    const script = getScript(parsed, languageId);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>Merge Editor - ${fileName}</title>
    <style>${styles}</style>
</head>
<body>
    <div class="merge-editor">
        <div class="ambient-glow ambient-left"></div>
        <div class="ambient-glow ambient-right"></div>

        <header class="toolbar">
            <div class="toolbar-section toolbar-left">
                <div class="file-info">
                    <svg class="icon-merge" viewBox="0 0 16 16" fill="none">
                        <path d="M5 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM5 9a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM11 9a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" fill="currentColor" opacity="0.7"/>
                        <path d="M5 7v2M5 5V3M11 11V7c0-1.5-1-3-3-3H7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                    <span class="file-name">${fileName}</span>
                </div>
                <div class="conflict-badge">
                    <span class="badge-count">${parsed.conflicts.length}</span>
                    <span class="badge-label">conflit${parsed.conflicts.length > 1 ? 's' : ''}</span>
                </div>
            </div>

            <nav class="toolbar-section toolbar-center">
                <button class="nav-btn" id="prevConflict" title="Précédent (Alt+↑)">
                    <svg viewBox="0 0 16 16" fill="none"><path d="M8 4L4 8l4 4M12 4L8 8l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
                <div class="conflict-navigator">
                    <span class="nav-current" id="navCurrent">1</span>
                    <span class="nav-separator">/</span>
                    <span class="nav-total">${parsed.conflicts.length}</span>
                </div>
                <button class="nav-btn" id="nextConflict" title="Suivant (Alt+↓)">
                    <svg viewBox="0 0 16 16" fill="none"><path d="M8 12l4-4-4-4M4 12l4-4-4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
            </nav>

            <div class="toolbar-section toolbar-right">
                <button class="action-btn auto-merge" id="acceptAllNonConflicting" title="Auto-résoudre les conflits simples">
                    <svg viewBox="0 0 16 16" fill="none">
                        <path d="M13 3L6 10l-3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M13 7L6 14l-3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"/>
                    </svg>
                    <span>Auto-fusion</span>
                </button>
                <button class="action-btn save-btn" id="saveBtn" title="Sauvegarder (Ctrl+S)">
                    <svg viewBox="0 0 16 16" fill="none">
                        <path d="M13 16H3a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h7l4 4v10a2 2 0 0 1-2 2z" stroke="currentColor" stroke-width="1.5"/>
                        <path d="M10 0v4h4M5 9h6M5 12h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                    <span>Sauver</span>
                </button>
                <button class="action-btn cancel-btn" id="cancelBtn" title="Annuler">
                    <svg viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                </button>
            </div>
        </header>

        <div class="panel-headers">
            <div class="panel-header panel-header-left">
                <div class="header-content">
                    <div class="header-icon yours">
                        <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M8 5v6M5 8h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                    </div>
                    <div class="header-text">
                        <span class="header-title">Actuel</span>
                        <span class="header-subtitle">Votre version</span>
                    </div>
                </div>
                <code class="branch-tag">${parsed.conflicts[0]?.currentLabel || 'HEAD'}</code>
            </div>

            <div class="panel-header panel-header-center">
                <div class="header-content">
                    <div class="header-icon result">
                        <svg viewBox="0 0 16 16" fill="none"><path d="M8 2l6 4v4l-6 4-6-4V6l6-4z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="8" cy="8" r="2" fill="currentColor"/></svg>
                    </div>
                    <div class="header-text">
                        <span class="header-title">Résultat</span>
                        <span class="header-subtitle">Sortie finale</span>
                    </div>
                </div>
                <span class="editable-hint">
                    <svg viewBox="0 0 16 16" fill="none" width="12" height="12"><path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
                    Modifiable
                </span>
            </div>

            <div class="panel-header panel-header-right">
                <div class="header-content">
                    <div class="header-icon theirs">
                        <svg viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8l6-6 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </div>
                    <div class="header-text">
                        <span class="header-title">Changements</span>
                        <span class="header-subtitle">Version entrante</span>
                    </div>
                </div>
                <code class="branch-tag">${parsed.conflicts[0]?.incomingLabel || 'incoming'}</code>
            </div>
        </div>

        <main class="panels-container">
            <div class="sync-indicator" id="syncIndicator"></div>
            <div class="panel panel-left" id="leftPanel">
                <div class="panel-content" id="leftContent"></div>
                <div class="panel-fade panel-fade-bottom"></div>
            </div>
            <div class="panel panel-center" id="centerPanel">
                <div class="panel-glow"></div>
                <div class="panel-content" id="centerContent"></div>
                <div class="panel-fade panel-fade-bottom"></div>
            </div>
            <div class="panel panel-right" id="rightPanel">
                <div class="panel-content" id="rightContent"></div>
                <div class="panel-fade panel-fade-bottom"></div>
            </div>
        </main>

        <footer class="footer">
            <div class="footer-section">
                <div class="progress-container">
                    <div class="progress-bar"><div class="progress-fill" id="progressFill" style="width: 0%"></div></div>
                    <span class="progress-text" id="resolvedCount">0 sur ${parsed.conflicts.length} résolu</span>
                </div>
            </div>
            <div class="footer-section footer-hints">
                <kbd>Alt</kbd><span>+</span><kbd>↑↓</kbd><span class="hint-text">Naviguer</span>
                <span class="hint-separator">·</span>
                <kbd>Ctrl</kbd><span>+</span><kbd>S</kbd><span class="hint-text">Sauver</span>
            </div>
            <div class="footer-section">
                <span class="language-tag">${languageId}</span>
            </div>
        </footer>
    </div>
    <script nonce="${nonce}">${script}</script>
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
    --bg-primary: var(--vscode-editor-background);
    --bg-secondary: var(--vscode-sideBar-background);
    --bg-tertiary: var(--vscode-editorWidget-background);
    --text-primary: var(--vscode-editor-foreground);
    --text-secondary: var(--vscode-descriptionForeground);
    --text-muted: var(--vscode-disabledForeground);
    --border-primary: var(--vscode-panel-border);
    --border-subtle: var(--vscode-widget-border);
    --yours-hue: 168;
    --yours-color: hsl(var(--yours-hue), 70%, 50%);
    --yours-bg: hsla(var(--yours-hue), 70%, 50%, 0.08);
    --yours-bg-solid: hsla(var(--yours-hue), 70%, 50%, 0.15);
    --yours-border: hsla(var(--yours-hue), 70%, 50%, 0.4);
    --yours-glow: hsla(var(--yours-hue), 70%, 50%, 0.2);
    --theirs-hue: 270;
    --theirs-color: hsl(var(--theirs-hue), 70%, 65%);
    --theirs-bg: hsla(var(--theirs-hue), 70%, 60%, 0.08);
    --theirs-bg-solid: hsla(var(--theirs-hue), 70%, 60%, 0.15);
    --theirs-border: hsla(var(--theirs-hue), 70%, 60%, 0.4);
    --theirs-glow: hsla(var(--theirs-hue), 70%, 60%, 0.2);
    --result-hue: 45;
    --result-color: hsl(var(--result-hue), 90%, 60%);
    --result-bg: hsla(var(--result-hue), 90%, 50%, 0.06);
    --result-border: hsla(var(--result-hue), 90%, 50%, 0.3);
    --success-color: hsl(142, 70%, 50%);
    --success-bg: hsla(142, 70%, 50%, 0.12);
    --danger-color: hsl(0, 70%, 60%);
    --danger-bg: hsla(0, 70%, 60%, 0.12);
    --font-ui: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    --font-mono: var(--vscode-editor-font-family, 'SF Mono', 'Fira Code', monospace);
    --radius-sm: 4px;
    --radius-md: 6px;
    --shadow-md: 0 4px 12px rgba(0,0,0,0.15);
    --shadow-lg: 0 8px 24px rgba(0,0,0,0.2);
    --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
    --transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);

    /* Syntax Highlighting - VS Code Theme Colors */
    --syntax-keyword: var(--vscode-symbolIcon-keywordForeground, #569cd6);
    --syntax-string: var(--vscode-symbolIcon-stringForeground, #ce9178);
    --syntax-number: var(--vscode-symbolIcon-numberForeground, #b5cea8);
    --syntax-comment: var(--vscode-symbolIcon-commentForeground, #6a9955);
    --syntax-function: var(--vscode-symbolIcon-functionForeground, #dcdcaa);
    --syntax-variable: var(--vscode-symbolIcon-variableForeground, #9cdcfe);
    --syntax-type: var(--vscode-symbolIcon-classForeground, #4ec9b0);
    --syntax-operator: var(--vscode-symbolIcon-operatorForeground, #d4d4d4);
    --syntax-punctuation: #808080;
    --syntax-property: #9cdcfe;
    --syntax-constant: #4fc1ff;
    --syntax-regex: #d16969;
    --syntax-tag: #569cd6;
    --syntax-attribute: #9cdcfe;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font-ui); font-size: 13px; color: var(--text-primary); background: var(--bg-primary); height: 100vh; overflow: hidden; -webkit-font-smoothing: antialiased; }
.merge-editor { display: flex; flex-direction: column; height: 100vh; position: relative; overflow: hidden; }
.ambient-glow { position: absolute; width: 40%; height: 60%; border-radius: 50%; filter: blur(120px); opacity: 0.4; pointer-events: none; z-index: 0; }
.ambient-left { left: -10%; top: 20%; background: var(--yours-glow); }
.ambient-right { right: -10%; top: 20%; background: var(--theirs-glow); }
.toolbar { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; background: var(--bg-secondary); border-bottom: 1px solid var(--border-primary); position: relative; z-index: 10; gap: 16px; }
.toolbar-section { display: flex; align-items: center; gap: 12px; }
.toolbar-left { flex: 1; }
.toolbar-center { flex: 0 0 auto; }
.toolbar-right { flex: 1; justify-content: flex-end; }
.file-info { display: flex; align-items: center; gap: 8px; }
.icon-merge { width: 18px; height: 18px; color: var(--text-secondary); }
.file-name { font-weight: 600; font-size: 13px; color: var(--text-primary); }
.conflict-badge { display: flex; align-items: center; gap: 4px; padding: 4px 8px; background: var(--danger-bg); border-radius: var(--radius-md); border: 1px solid hsla(0, 70%, 60%, 0.2); }
.badge-count { font-weight: 700; font-size: 11px; color: var(--danger-color); }
.badge-label { font-size: 10px; color: var(--danger-color); opacity: 0.8; text-transform: uppercase; letter-spacing: 0.05em; }
.conflict-navigator { display: flex; align-items: center; gap: 2px; padding: 4px 12px; background: var(--bg-tertiary); border-radius: var(--radius-md); }
.nav-current { font-weight: 700; color: var(--text-primary); font-size: 14px; }
.nav-separator { color: var(--text-muted); margin: 0 2px; }
.nav-total { color: var(--text-secondary); font-size: 11px; }
.nav-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: none; border-radius: var(--radius-md); background: transparent; color: var(--text-secondary); cursor: pointer; transition: all var(--transition-fast); }
.nav-btn:hover { background: var(--bg-tertiary); color: var(--text-primary); }
.nav-btn:active { transform: scale(0.95); }
.nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.nav-btn svg { width: 16px; height: 16px; }
.action-btn { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border: 1px solid transparent; border-radius: var(--radius-md); background: var(--bg-tertiary); color: var(--text-secondary); font-family: var(--font-ui); font-size: 11px; font-weight: 500; cursor: pointer; transition: all var(--transition-fast); }
.action-btn svg { width: 14px; height: 14px; }
.action-btn:hover { background: var(--bg-primary); color: var(--text-primary); border-color: var(--border-subtle); }
.action-btn.save-btn { background: var(--success-bg); color: var(--success-color); border-color: hsla(142, 70%, 50%, 0.2); }
.action-btn.save-btn:hover { background: hsla(142, 70%, 50%, 0.2); border-color: hsla(142, 70%, 50%, 0.4); }
.action-btn.save-btn.pulse { animation: pulse-success 1.5s ease-in-out infinite; }
@keyframes pulse-success { 0%, 100% { box-shadow: 0 0 0 0 hsla(142, 70%, 50%, 0.4); } 50% { box-shadow: 0 0 0 8px hsla(142, 70%, 50%, 0); } }
.action-btn.cancel-btn { padding: 8px; }
.action-btn.cancel-btn:hover { background: var(--danger-bg); color: var(--danger-color); border-color: hsla(0, 70%, 60%, 0.2); }
.action-btn.auto-merge { background: hsla(var(--result-hue), 90%, 50%, 0.1); color: var(--result-color); border-color: hsla(var(--result-hue), 90%, 50%, 0.2); }
.action-btn.auto-merge:hover { background: hsla(var(--result-hue), 90%, 50%, 0.15); }
.panel-headers { display: grid; grid-template-columns: 1fr 1fr 1fr; background: var(--bg-secondary); border-bottom: 1px solid var(--border-primary); position: relative; z-index: 5; }
.panel-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; position: relative; }
.panel-header::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px; opacity: 0.6; }
.panel-header-left::after { background: linear-gradient(90deg, var(--yours-color), transparent); }
.panel-header-center::after { background: linear-gradient(90deg, var(--yours-color), var(--result-color), var(--theirs-color)); }
.panel-header-right::after { background: linear-gradient(90deg, transparent, var(--theirs-color)); }
.header-content { display: flex; align-items: center; gap: 12px; }
.header-icon { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: var(--radius-md); }
.header-icon svg { width: 16px; height: 16px; }
.header-icon.yours { background: var(--yours-bg-solid); color: var(--yours-color); }
.header-icon.theirs { background: var(--theirs-bg-solid); color: var(--theirs-color); }
.header-icon.result { background: hsla(var(--result-hue), 90%, 50%, 0.15); color: var(--result-color); }
.header-text { display: flex; flex-direction: column; gap: 1px; }
.header-title { font-weight: 600; font-size: 11px; color: var(--text-primary); letter-spacing: 0.02em; text-transform: uppercase; }
.header-subtitle { font-size: 10px; color: var(--text-muted); }
.branch-tag { font-family: var(--font-mono); font-size: 10px; padding: 4px 8px; background: var(--bg-primary); border-radius: var(--radius-sm); color: var(--text-secondary); border: 1px solid var(--border-subtle); }
.editable-hint { display: flex; align-items: center; gap: 4px; font-size: 10px; color: var(--text-muted); padding: 4px 8px; background: var(--result-bg); border-radius: var(--radius-sm); }
.panels-container { display: grid; grid-template-columns: 1fr 1fr 1fr; flex: 1; overflow: hidden; position: relative; z-index: 1; }
.panel { position: relative; display: flex; flex-direction: column; overflow: hidden; }
.panel-left { border-right: 1px solid var(--yours-border); background: var(--yours-bg); }
.panel-center { background: var(--bg-primary); border-left: 1px solid var(--border-subtle); border-right: 1px solid var(--border-subtle); }
.panel-glow { position: absolute; inset: 0; background: linear-gradient(180deg, var(--result-bg) 0%, transparent 30%, transparent 70%, var(--result-bg) 100%); pointer-events: none; z-index: 0; }
.panel-right { border-left: 1px solid var(--theirs-border); background: var(--theirs-bg); }
.panel-content { flex: 1; overflow: auto; font-family: var(--font-mono); font-size: 13px; line-height: 1.6; position: relative; z-index: 1; scroll-behavior: auto; }
.panel-content.syncing { scroll-behavior: smooth; }
.scroll-spacer-top { height: 150px; pointer-events: none; }
.scroll-spacer-bottom { height: 200px; pointer-events: none; }
.panel-content::-webkit-scrollbar { width: 8px; height: 8px; }
.panel-content::-webkit-scrollbar-track { background: transparent; }
.panel-content::-webkit-scrollbar-thumb { background: var(--border-primary); border-radius: 4px; }
.panel-content::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
.panel-fade { position: absolute; left: 0; right: 0; height: 40px; pointer-events: none; z-index: 2; }
.panel-fade-bottom { bottom: 0; background: linear-gradient(to top, var(--bg-primary), transparent); }
.panel-left .panel-fade-bottom { background: linear-gradient(to top, hsla(var(--yours-hue), 70%, 50%, 0.08), transparent); }
.panel-right .panel-fade-bottom { background: linear-gradient(to top, hsla(var(--theirs-hue), 70%, 60%, 0.08), transparent); }
.conflict-block { margin: 0; animation: fadeIn var(--transition-base) ease-out; cursor: pointer; }
.conflict-block:hover .conflict-header { background: var(--bg-tertiary); }
@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
.conflict-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--bg-secondary); border-bottom: 1px solid var(--border-subtle); position: sticky; top: 0; z-index: 5; }
.conflict-label { display: flex; align-items: center; gap: 8px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
.conflict-label .status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--danger-color); }
.conflict-block.resolved .conflict-label .status-dot { background: var(--success-color); }
.conflict-block.resolved .conflict-header { background: var(--success-bg); }
.conflict-actions { display: flex; align-items: center; gap: 4px; }
.merge-btn { display: flex; align-items: center; justify-content: center; gap: 4px; padding: 4px 8px; border: none; border-radius: var(--radius-sm); font-family: var(--font-ui); font-size: 10px; font-weight: 600; cursor: pointer; transition: all var(--transition-fast); background: var(--bg-tertiary); color: var(--text-secondary); }
.merge-btn:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
.merge-btn:active { transform: translateY(0); }
.merge-btn.accept-left { color: var(--yours-color); }
.merge-btn.accept-left:hover { background: var(--yours-bg-solid); }
.merge-btn.accept-right { color: var(--theirs-color); }
.merge-btn.accept-right:hover { background: var(--theirs-bg-solid); }
.merge-btn.accept-both { color: var(--result-color); }
.merge-btn.accept-both:hover { background: hsla(var(--result-hue), 90%, 50%, 0.15); }
.merge-btn svg { width: 12px; height: 12px; }
.code-block { padding: 12px; padding-bottom: 56px; min-height: 80px; position: relative; }
.code-block.result-block { background: var(--result-bg); outline: none; cursor: text; white-space: pre-wrap; min-height: 100px; }
.code-block.result-block:focus { background: hsla(var(--result-hue), 90%, 50%, 0.1); box-shadow: inset 0 0 0 1px var(--result-border); }
.code-block.result-block:empty::before { content: 'Cliquez pour modifier ou utilisez les boutons ← →'; color: var(--text-muted); font-style: italic; }
.line { display: flex; min-height: 22px; padding: 0 4px; margin: 0 -8px; border-radius: 2px; }
.line:hover { background: rgba(255,255,255,0.03); }
.line-number { min-width: 36px; padding-right: 12px; text-align: right; color: var(--text-muted); user-select: none; font-size: 11px; opacity: 0.5; }
.line-content { flex: 1; white-space: pre; }
/* Transfer buttons on side panels - positioned at bottom of code blocks */
.transfer-btn { position: absolute; bottom: 12px; display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: none; border-radius: var(--radius-md); cursor: pointer; font-family: var(--font-ui); font-size: 11px; font-weight: 600; z-index: 10; transition: all var(--transition-fast); box-shadow: var(--shadow-md); text-transform: uppercase; letter-spacing: 0.03em; }
.transfer-btn:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
.transfer-btn:active { transform: translateY(0); }
.transfer-btn svg { width: 14px; height: 14px; }
.transfer-btn.use-left { right: 12px; background: linear-gradient(135deg, var(--yours-color), hsl(var(--yours-hue), 60%, 40%)); color: white; }
.transfer-btn.use-left:hover { box-shadow: 0 4px 20px var(--yours-glow); }
.transfer-btn.use-right { left: 12px; background: linear-gradient(135deg, var(--theirs-color), hsl(var(--theirs-hue), 60%, 50%)); color: white; }
.transfer-btn.use-right:hover { box-shadow: 0 4px 20px var(--theirs-glow); }
/* Central merge-both button */
.merge-both-btn { position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 6px; padding: 8px 16px; border: none; border-radius: var(--radius-md); cursor: pointer; font-family: var(--font-ui); font-size: 11px; font-weight: 600; z-index: 10; transition: all var(--transition-fast); box-shadow: var(--shadow-md); background: linear-gradient(135deg, var(--result-color), hsl(var(--result-hue), 70%, 45%)); color: #1a1a1a; text-transform: uppercase; letter-spacing: 0.03em; }
.merge-both-btn:hover { transform: translateX(-50%) translateY(-2px); box-shadow: 0 4px 20px hsla(var(--result-hue), 90%, 50%, 0.4); }
.merge-both-btn:active { transform: translateX(-50%) translateY(0); }
.merge-both-btn svg { width: 14px; height: 14px; }
.conflict-block.resolved .code-block { opacity: 0.7; }
/* Resolved state - elegant green buttons */
.conflict-block.resolved .transfer-btn,
.conflict-block.resolved .merge-both-btn {
    opacity: 0.7;
    background: linear-gradient(135deg, var(--success-color), hsl(142, 50%, 35%));
    color: white;
    box-shadow: 0 2px 8px hsla(142, 70%, 50%, 0.2);
}
.conflict-block.resolved .transfer-btn:hover,
.conflict-block.resolved .merge-both-btn:hover {
    opacity: 1;
    box-shadow: 0 4px 16px hsla(142, 70%, 50%, 0.4);
}
/* Resolved tooltip headers - green theme */
.conflict-block.resolved .tooltip-icon {
    background: var(--success-bg) !important;
    color: var(--success-color) !important;
}
.conflict-block.resolved .tooltip-title {
    color: var(--success-color);
}
.conflict-block.resolved .tooltip-header {
    border-bottom-color: hsla(142, 70%, 50%, 0.2);
}
.conflict-block.resolved .tooltip-visual-block {
    background: var(--success-bg);
    color: var(--success-color);
    border-color: hsla(142, 70%, 50%, 0.3);
}

/* === DUEL SYSTEM: Winner / Loser / Draw === */

/* WINNER - Reste lumineux et vibrant avec bordure dorée */
.conflict-block.resolved.winner-block {
    opacity: 1 !important;
    filter: brightness(1.05) saturate(1.1) !important;
}
.conflict-block.resolved.winner-block::before {
    border-color: var(--success-color) !important;
    box-shadow: 0 0 20px hsla(142, 70%, 50%, 0.4) !important;
}
.conflict-block.resolved.winner-block .conflict-header {
    background: linear-gradient(90deg, var(--success-bg), transparent) !important;
}

/* LOSER - Effet fade premium élégant */
.conflict-block.resolved.loser-block {
    opacity: 0.5 !important;
    filter: grayscale(50%) brightness(0.6) saturate(0.5) !important;
}
.conflict-block.resolved.loser-block::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.4) 100%);
    pointer-events: none;
    border-radius: var(--radius-md);
    z-index: 1;
}
.conflict-block.resolved.loser-block .transfer-btn {
    opacity: 0.3 !important;
    filter: grayscale(100%);
}
.conflict-block.resolved.loser-block .conflict-header {
    opacity: 0.6;
}

/* DRAW (Match Nul) - Les deux avec teinte dorée subtile */
.conflict-block.resolved.draw-block {
    opacity: 0.7 !important;
    filter: brightness(0.85) saturate(0.8) !important;
}
.conflict-block.resolved.draw-block::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,200,0,0.08) 0%, rgba(0,0,0,0.25) 100%);
    pointer-events: none;
    border-radius: var(--radius-md);
    z-index: 1;
}
.conflict-block.resolved.draw-block .conflict-header {
    background: linear-gradient(90deg, hsla(45, 90%, 50%, 0.15), transparent) !important;
}

/* Rich Tooltip System for Beginners */
.tooltip-wrapper { position: relative; }
.rich-tooltip { position: absolute; z-index: 100; opacity: 0; visibility: hidden; pointer-events: none; transition: all 0.2s ease-out; transform: translateY(8px); }
.transfer-btn:hover + .rich-tooltip,
.merge-both-btn:hover + .rich-tooltip,
.transfer-btn:focus + .rich-tooltip,
.merge-both-btn:focus + .rich-tooltip { opacity: 1; visibility: visible; transform: translateY(0); pointer-events: auto; }
.rich-tooltip-card { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: var(--radius-md); padding: 14px 16px; box-shadow: var(--shadow-lg); min-width: 240px; max-width: 300px; }
.tooltip-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid var(--border-subtle); }
.tooltip-icon { width: 28px; height: 28px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; }
.tooltip-icon.left-icon { background: var(--yours-bg-solid); color: var(--yours-color); }
.tooltip-icon.right-icon { background: var(--theirs-bg-solid); color: var(--theirs-color); }
.tooltip-icon.both-icon { background: hsla(var(--result-hue), 90%, 50%, 0.15); color: var(--result-color); }
.tooltip-icon svg { width: 16px; height: 16px; }
.tooltip-title { font-weight: 600; font-size: 14px; color: var(--text-primary); }
.tooltip-body { font-size: 13px; line-height: 1.6; color: var(--text-secondary); }
.tooltip-body strong { color: var(--text-primary); font-weight: 600; }
.tooltip-visual { margin-top: 12px; padding: 10px; background: var(--bg-primary); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; gap: 10px; }
.tooltip-visual-block { padding: 6px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.tooltip-visual-block.v-left { background: var(--yours-bg-solid); color: var(--yours-color); }
.tooltip-visual-block.v-right { background: var(--theirs-bg-solid); color: var(--theirs-color); }
.tooltip-visual-block.v-result { background: hsla(var(--result-hue), 90%, 50%, 0.15); color: var(--result-color); border: 1px dashed var(--result-border); }
.tooltip-visual-arrow { color: var(--text-muted); font-size: 14px; font-weight: 600; }
/* Tooltip positions - positioned BELOW buttons for better visibility */
.rich-tooltip.tooltip-left {
    top: calc(100% + 12px);
    right: 60px;
    transform: rotate(-2deg) translateY(-8px);
}
.transfer-btn:hover + .rich-tooltip.tooltip-left {
    transform: rotate(-2deg) translateY(0);
}
.rich-tooltip.tooltip-right {
    top: calc(100% + 12px);
    left: 60px;
    transform: rotate(2deg) translateY(-8px);
}
.transfer-btn:hover + .rich-tooltip.tooltip-right {
    transform: rotate(2deg) translateY(0);
}
.rich-tooltip.tooltip-center {
    top: calc(100% + 12px);
    left: 50%;
    transform: translateX(-50%) translateY(-8px);
}
.merge-both-btn:hover + .rich-tooltip.tooltip-center {
    transform: translateX(-50%) translateY(0);
}
/* Tooltip arrow - pointing UP since tooltip is below */
.rich-tooltip::after {
    content: '';
    position: absolute;
    top: -6px;
    width: 12px;
    height: 12px;
    background: var(--bg-secondary);
    border-left: 1px solid var(--border-primary);
    border-top: 1px solid var(--border-primary);
    transform: rotate(45deg);
}
.rich-tooltip.tooltip-left::after { right: 30px; }
.rich-tooltip.tooltip-right::after { left: 30px; }
.rich-tooltip.tooltip-center::after { left: 50%; margin-left: -6px; }

/* Active conflict highlight line - elegant thin sync indicator */
.sync-indicator {
    position: absolute;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, var(--yours-color), var(--result-color), var(--theirs-color));
    z-index: 50;
    pointer-events: none;
    transition: top 0.12s ease-out;
    opacity: 0.7;
}
.sync-indicator::before,
.sync-indicator::after {
    content: '';
    position: absolute;
    top: -3px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--result-color);
    opacity: 0.8;
    transition: transform 0.2s ease;
}
.sync-indicator::before { left: 33.33%; transform: translateX(-50%); }
.sync-indicator::after { right: 33.33%; transform: translateX(50%); }
.sync-indicator.moving::before,
.sync-indicator.moving::after {
    transform: scale(1.3);
    opacity: 1;
}

/* Inactive conflict blocks - dimmed */
.conflict-block {
    position: relative;
    transition: opacity 0.3s ease, filter 0.3s ease;
}
.conflict-block:not(.active-block) {
    opacity: 0.4;
    filter: brightness(0.7) saturate(0.6);
}
.conflict-block:not(.active-block):hover {
    opacity: 0.7;
    filter: brightness(0.85) saturate(0.8);
}

/* Active conflict block highlight - bright and focused */
.conflict-block.active-block {
    opacity: 1;
    filter: brightness(1) saturate(1);
    z-index: 10;
}
.conflict-block.active-block::before {
    content: '';
    position: absolute;
    inset: -3px;
    border: 2px solid var(--result-color);
    border-radius: var(--radius-md);
    pointer-events: none;
    box-shadow: 0 0 20px rgba(var(--result-hue), 90%, 50%, 0.3), inset 0 0 30px rgba(255,255,255,0.03);
    animation: pulse-glow 2s ease-in-out infinite;
    z-index: -1;
}
@keyframes pulse-glow {
    0%, 100% { opacity: 0.6; box-shadow: 0 0 15px hsla(var(--result-hue), 90%, 50%, 0.2); }
    50% { opacity: 1; box-shadow: 0 0 25px hsla(var(--result-hue), 90%, 50%, 0.4); }
}

/* Preview state for center panel */
.code-block.result-block.preview-mode { position: relative; }
.code-block.result-block.preview-mode::before { content: 'Aperçu de fusion'; position: absolute; top: 8px; right: 12px; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); background: var(--bg-secondary); padding: 2px 6px; border-radius: 3px; z-index: 5; }
.preview-content { opacity: 0.6; font-style: italic; }
.preview-divider { display: block; width: 100%; text-align: center; color: var(--result-color); font-size: 10px; padding: 4px 0; margin: 4px 0; border-top: 1px dashed var(--result-border); border-bottom: 1px dashed var(--result-border); font-weight: 600; letter-spacing: 0.05em; }
.footer { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; background: var(--bg-secondary); border-top: 1px solid var(--border-primary); position: relative; z-index: 10; }
.footer-section { display: flex; align-items: center; gap: 8px; }
.footer-hints { display: flex; align-items: center; gap: 4px; color: var(--text-muted); font-size: 10px; }
.hint-separator { margin: 0 8px; opacity: 0.3; }
.hint-text { margin-left: 4px; opacity: 0.7; }
kbd { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 4px; background: var(--bg-primary); border: 1px solid var(--border-subtle); border-radius: 3px; font-family: var(--font-mono); font-size: 10px; color: var(--text-secondary); }
.progress-container { display: flex; align-items: center; gap: 12px; }
.progress-bar { width: 120px; height: 4px; background: var(--bg-primary); border-radius: 2px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, var(--yours-color), var(--success-color)); border-radius: 2px; transition: width var(--transition-base); }
.progress-text { font-size: 10px; color: var(--text-secondary); }
.language-tag { font-family: var(--font-mono); font-size: 10px; padding: 4px 8px; background: var(--bg-primary); border-radius: var(--radius-sm); color: var(--text-muted); text-transform: lowercase; }
@keyframes slideInLeft { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
@keyframes slideInRight { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
.panel-left .conflict-block { animation: slideInLeft var(--transition-base) ease-out; }
.panel-right .conflict-block { animation: slideInRight var(--transition-base) ease-out; }

/* Syntax Highlighting Classes */
.token-keyword { color: var(--syntax-keyword); }
.token-string { color: var(--syntax-string); }
.token-number { color: var(--syntax-number); }
.token-comment { color: var(--syntax-comment); font-style: italic; }
.token-function { color: var(--syntax-function); }
.token-variable { color: var(--syntax-variable); }
.token-type { color: var(--syntax-type); }
.token-operator { color: var(--syntax-operator); }
.token-punctuation { color: var(--syntax-punctuation); }
.token-property { color: var(--syntax-property); }
.token-constant { color: var(--syntax-constant); }
.token-regex { color: var(--syntax-regex); }
.token-tag { color: var(--syntax-tag); }
.token-attribute { color: var(--syntax-attribute); }
`;
}

function getScript(parsed: ParsedConflict, languageId: string): string {
    // Encode JSON as base64 to avoid template literal interpolation issues with ${...}
    const conflictsBase64 = Buffer.from(JSON.stringify(parsed.conflicts)).toString('base64');
    const nonConflictingBase64 = Buffer.from(JSON.stringify(parsed.nonConflictingParts)).toString('base64');

    return `
(function() {
    const vscode = acquireVsCodeApi();
    const languageId = '${languageId}';
    let conflicts = JSON.parse(atob('${conflictsBase64}'));
    let nonConflictingParts = JSON.parse(atob('${nonConflictingBase64}'));
    let currentConflictIndex = 0;
    let syncScroll = true;
    const ALIGN_POSITION = 100; // Target Y position for aligned headers (pixels from top of panel)
    const ALIGN_POSITION_BOTTOM = -120; // Position from bottom for resolved blocks (negative = from bottom)
    const SCROLL_PADDING_TOP = 150; // Matches CSS spacer height

    const leftPanel = document.getElementById('leftContent');
    const centerPanel = document.getElementById('centerContent');
    const rightPanel = document.getElementById('rightContent');
    const syncIndicator = document.getElementById('syncIndicator');
    const navCurrent = document.getElementById('navCurrent');
    const resolvedCount = document.getElementById('resolvedCount');
    const progressFill = document.getElementById('progressFill');
    const prevBtn = document.getElementById('prevConflict');
    const nextBtn = document.getElementById('nextConflict');
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const acceptAllBtn = document.getElementById('acceptAllNonConflicting');

    const icons = {
        arrowRight: '<svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        arrowLeft: '<svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M13 8H3M7 4l-4 4 4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        check: '<svg viewBox="0 0 16 16" fill="none" width="12" height="12"><path d="M13 4L6 11l-3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        merge: '<svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M4 12V8c0-2 2-4 4-4s4 2 4 4v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="4" cy="13" r="2" fill="currentColor"/><circle cx="12" cy="13" r="2" fill="currentColor"/><circle cx="8" cy="3" r="2" fill="currentColor"/></svg>',
        use: '<svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M2 8h8M6 4l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 3v10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
    };

    // Syntax Highlighting
    const syntaxRules = {
        javascript: [
            { pattern: /(\\/\\/.*$)/gm, class: 'token-comment' },
            { pattern: /(\\/\\*[\\s\\S]*?\\*\\/)/g, class: 'token-comment' },
            { pattern: /("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|\`(?:[^\`\\\\]|\\\\.)*\`)/g, class: 'token-string' },
            { pattern: /\\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|import|export|from|default|async|await|try|catch|finally|throw|typeof|instanceof|in|of|void|delete|yield)\\b/g, class: 'token-keyword' },
            { pattern: /\\b(true|false|null|undefined|NaN|Infinity)\\b/g, class: 'token-constant' },
            { pattern: /\\b(interface|type|enum|namespace|module|declare|readonly|private|public|protected|static|abstract|implements|as|is|keyof|infer|never|unknown|any)\\b/g, class: 'token-keyword' },
            { pattern: /\\b(string|number|boolean|object|symbol|bigint|void)\\b/g, class: 'token-type' },
            { pattern: /\\b([A-Z][a-zA-Z0-9_]*)\\b/g, class: 'token-type' },
            { pattern: /\\b([a-zA-Z_][a-zA-Z0-9_]*)\\s*(?=\\()/g, class: 'token-function' },
            { pattern: /\\b(\\d+\\.?\\d*|0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+)\\b/g, class: 'token-number' },
            { pattern: /([=+\\-*/%<>!&|^~?:]+)/g, class: 'token-operator' },
            { pattern: /([{}\\[\\]();,.])/g, class: 'token-punctuation' },
        ],
        typescript: null, // Will use javascript rules
        python: [
            { pattern: /(#.*$)/gm, class: 'token-comment' },
            { pattern: /("""[\\s\\S]*?"""|\'\'\'[\\s\\S]*?\'\'\')/g, class: 'token-string' },
            { pattern: /("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*')/g, class: 'token-string' },
            { pattern: /\\b(def|class|return|if|elif|else|for|while|try|except|finally|with|as|import|from|raise|pass|break|continue|lambda|yield|global|nonlocal|assert|del|in|is|not|and|or|async|await)\\b/g, class: 'token-keyword' },
            { pattern: /\\b(True|False|None)\\b/g, class: 'token-constant' },
            { pattern: /\\b(int|float|str|bool|list|dict|set|tuple|bytes|object|type)\\b/g, class: 'token-type' },
            { pattern: /\\b([a-zA-Z_][a-zA-Z0-9_]*)\\s*(?=\\()/g, class: 'token-function' },
            { pattern: /\\b(\\d+\\.?\\d*|0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+)\\b/g, class: 'token-number' },
            { pattern: /([=+\\-*/%<>!&|^~@:]+)/g, class: 'token-operator' },
            { pattern: /([{}\\[\\]();,.])/g, class: 'token-punctuation' },
        ],
        json: [
            { pattern: /("(?:[^"\\\\]|\\\\.)*")\\s*:/g, class: 'token-property' },
            { pattern: /:\\s*("(?:[^"\\\\]|\\\\.)*")/g, class: 'token-string' },
            { pattern: /\\b(true|false|null)\\b/g, class: 'token-constant' },
            { pattern: /\\b(-?\\d+\\.?\\d*)\\b/g, class: 'token-number' },
            { pattern: /([{}\\[\\]:,])/g, class: 'token-punctuation' },
        ],
        html: [
            { pattern: /(<\\/?)([a-zA-Z][a-zA-Z0-9]*)/g, class: 'token-tag' },
            { pattern: /(\\s)([a-zA-Z-]+)(=)/g, class: 'token-attribute' },
            { pattern: /("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*')/g, class: 'token-string' },
            { pattern: /(<!--[\\s\\S]*?-->)/g, class: 'token-comment' },
        ],
        css: [
            { pattern: /(\\/\\*[\\s\\S]*?\\*\\/)/g, class: 'token-comment' },
            { pattern: /([.#][a-zA-Z_][a-zA-Z0-9_-]*)/g, class: 'token-function' },
            { pattern: /([a-zA-Z-]+)\\s*:/g, class: 'token-property' },
            { pattern: /:\\s*([^;{}]+)/g, class: 'token-string' },
            { pattern: /(#[0-9a-fA-F]{3,8}|\\b\\d+(\\.\\d+)?(px|em|rem|%|vh|vw|deg|s|ms)?\\b)/g, class: 'token-number' },
            { pattern: /([{}();:,])/g, class: 'token-punctuation' },
        ]
    };
    syntaxRules.typescript = syntaxRules.javascript;
    syntaxRules.tsx = syntaxRules.javascript;
    syntaxRules.jsx = syntaxRules.javascript;
    syntaxRules.ts = syntaxRules.javascript;
    syntaxRules.js = syntaxRules.javascript;
    syntaxRules.py = syntaxRules.python;
    syntaxRules.scss = syntaxRules.css;
    syntaxRules.less = syntaxRules.css;

    function highlightCode(code, lang) {
        // Disable syntax highlighting for now - just escape HTML
        // TODO: Fix syntax highlighting properly
        return escapeHtml(code);
    }

    // ResizeObserver for dynamic re-alignment when blocks change size
    let alignmentDebounceTimer = null;
    const resizeObserver = new ResizeObserver(() => {
        clearTimeout(alignmentDebounceTimer);
        alignmentDebounceTimer = setTimeout(() => {
            alignBlocksAcrossPanels();
            updateSyncIndicator();
        }, 150);
    });

    function observeBlocks() {
        document.querySelectorAll('.conflict-block').forEach(block => {
            resizeObserver.observe(block);
        });
    }

    // Window resize handler
    window.addEventListener('resize', () => {
        clearTimeout(alignmentDebounceTimer);
        alignmentDebounceTimer = setTimeout(() => {
            alignBlocksAcrossPanels();
            updateSyncIndicator();
        }, 200);
    });

    function init() {
        renderPanels();
        updateNavigator();
        updateProgress();
        updateActiveBlock();
        // Align blocks using double requestAnimationFrame for reliable timing
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                alignBlocksAcrossPanels();
                updateSyncIndicator();
                observeBlocks();
            });
        });
    }

    // CRITICAL: Align blocks across all three panels by adding spacers
    // This ensures corresponding conflict blocks are always at the same Y position
    function alignBlocksAcrossPanels() {
        const panels = [leftPanel, centerPanel, rightPanel];
        const numConflicts = conflicts.length;
        if (numConflicts === 0) return;

        // Get all conflict blocks for each panel
        const blocksByPanel = panels.map(panel =>
            Array.from(panel.querySelectorAll('.conflict-block'))
        );

        // First, reset any previous alignment spacers
        blocksByPanel.forEach(blocks => {
            blocks.forEach(block => {
                block.style.marginBottom = '0px';
            });
        });

        // Force reflow to get accurate measurements
        void leftPanel.offsetHeight;

        // Get the height of each block in each panel
        const heightsByPanel = blocksByPanel.map(blocks =>
            blocks.map(block => block.offsetHeight)
        );

        // For each conflict index, find the max height and add spacers
        for (let i = 0; i < numConflicts; i++) {
            const heights = heightsByPanel.map(h => h[i] || 0);
            const maxHeight = Math.max(...heights);

            // Add margin-bottom to each block to equalize row heights
            blocksByPanel.forEach((blocks, panelIdx) => {
                if (blocks[i]) {
                    const myHeight = heightsByPanel[panelIdx][i] || 0;
                    const spacerNeeded = maxHeight - myHeight;
                    if (spacerNeeded > 0) {
                        blocks[i].style.marginBottom = spacerNeeded + 'px';
                    }
                }
            });
        }

        console.log('Blocks aligned! Heights:', heightsByPanel.map(h => h.reduce((a,b) => a+b, 0)));
    }

    function updateActiveBlock() {
        // Remove previous active state
        document.querySelectorAll('.conflict-block.active-block').forEach(b => b.classList.remove('active-block'));
        // Add active state to current conflict blocks
        document.querySelectorAll('.conflict-block[data-index="' + currentConflictIndex + '"]').forEach(b => b.classList.add('active-block'));
    }

    function updateSyncIndicator() {
        // Position sync indicator at the current active block's header position
        const centerBlocks = centerPanel.querySelectorAll('.conflict-block');
        if (centerBlocks.length === 0) return;

        const activeBlock = centerBlocks[currentConflictIndex];
        if (!activeBlock) return;

        const panelsContainer = document.querySelector('.panels-container');
        if (!panelsContainer) return;

        const containerRect = panelsContainer.getBoundingClientRect();
        const blockHeader = activeBlock.querySelector('.conflict-header');
        if (!blockHeader) return;

        const headerRect = blockHeader.getBoundingClientRect();
        const topOffset = headerRect.top - containerRect.top;

        syncIndicator.style.top = Math.max(0, topOffset) + 'px';
    }

    function detectActiveBlockFromScroll(panel) {
        const blocks = panel.querySelectorAll('.conflict-block');
        const panelRect = panel.getBoundingClientRect();
        const panelCenter = panelRect.top + panelRect.height / 3;

        let closestIndex = 0;
        let closestDistance = Infinity;

        blocks.forEach((block, index) => {
            const blockRect = block.getBoundingClientRect();
            const blockCenter = blockRect.top + blockRect.height / 2;
            const distance = Math.abs(blockCenter - panelCenter);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
            }
        });

        if (closestIndex !== currentConflictIndex) {
            currentConflictIndex = closestIndex;
            updateActiveBlock();
            updateSyncIndicator();
            updateNavigator();
        }
    }

    function renderPanels() {
        renderLeftPanel();
        renderRightPanel();
        renderCenterPanel();
        attachBlockClickHandlers();
        // Re-align blocks after rendering using double rAF for reliable timing
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                alignBlocksAcrossPanels();
                observeBlocks();
            });
        });
    }

    function renderLeftPanel() {
        let html = '<div class="scroll-spacer-top"></div>';
        conflicts.forEach((c, i) => { html += renderSideBlock(c, i, 'left'); });
        html += '<div class="scroll-spacer-bottom"></div>';
        leftPanel.innerHTML = html;
        attachSideEvents(leftPanel, 'left');
    }

    function renderRightPanel() {
        let html = '<div class="scroll-spacer-top"></div>';
        conflicts.forEach((c, i) => { html += renderSideBlock(c, i, 'right'); });
        html += '<div class="scroll-spacer-bottom"></div>';
        rightPanel.innerHTML = html;
        attachSideEvents(rightPanel, 'right');
    }

    function renderCenterPanel() {
        let html = '<div class="scroll-spacer-top"></div>';
        const bothTooltip = '<div class="rich-tooltip tooltip-center"><div class="rich-tooltip-card">' +
            '<div class="tooltip-header"><div class="tooltip-icon both-icon">' + icons.merge + '</div>' +
            '<span class="tooltip-title">Fusionner les deux versions</span></div>' +
            '<div class="tooltip-body">Pas envie de choisir ? Ce bouton <strong>combine les deux codes</strong> : d\\'abord votre version, puis les changements entrants. Parfait quand les deux ajouts sont utiles !</div>' +
            '<div class="tooltip-visual"><span class="tooltip-visual-block v-left">Actuel</span>' +
            '<span class="tooltip-visual-arrow">+</span>' +
            '<span class="tooltip-visual-block v-right">Entrant</span>' +
            '<span class="tooltip-visual-arrow">=</span>' +
            '<span class="tooltip-visual-block v-result">Résultat</span></div></div></div>';

        conflicts.forEach((c, i) => {
            const isResolved = c.resolved;
            const status = isResolved ? icons.check + ' Résolu' : 'Conflit #' + (i + 1);

            let blockContent = '';
            let blockClasses = 'code-block result-block';

            if (isResolved) {
                blockContent = c.result ? highlightCode(c.result, languageId) : '';
            } else {
                // Show preview of merged content
                blockClasses += ' preview-mode';
                const previewLeft = '<div class="preview-content">' + highlightCode(c.current, languageId) + '</div>';
                const previewDivider = '<span class="preview-divider">── + ──</span>';
                const previewRight = '<div class="preview-content">' + highlightCode(c.incoming, languageId) + '</div>';
                blockContent = previewLeft + previewDivider + previewRight;
            }

            html += '<div class="conflict-block ' + (isResolved ? 'resolved' : '') + '" data-index="' + i + '">' +
                '<div class="conflict-header"><span class="conflict-label"><span class="status-dot"></span>' + status + '</span></div>' +
                '<div class="' + blockClasses + '" contenteditable="true" data-index="' + i + '">' + blockContent +
                '<button class="merge-both-btn" data-index="' + i + '" data-side="both">' + icons.merge + ' Les deux</button>' +
                bothTooltip +
                '</div></div>';
        });
        html += '<div class="scroll-spacer-bottom"></div>';
        centerPanel.innerHTML = html;
        attachCenterEvents();
    }

    function renderSideBlock(c, i, side) {
        const content = side === 'left' ? c.current : c.incoming;
        const label = side === 'left' ? c.currentLabel : c.incomingLabel;
        const lines = content.split('\\n');
        let linesHtml = '';
        lines.forEach((line, li) => {
            const highlightedLine = highlightCode(line, languageId);
            linesHtml += '<div class="line"><span class="line-number">' + (li + 1) + '</span><span class="line-content">' + highlightedLine + '</span></div>';
        });
        const btnClass = side === 'left' ? 'use-left' : 'use-right';
        const btnLabel = side === 'left' ? 'Utiliser ' + icons.arrowRight : icons.arrowLeft + ' Utiliser';
        const tooltipClass = side === 'left' ? 'tooltip-left' : 'tooltip-right';
        const iconClass = side === 'left' ? 'left-icon' : 'right-icon';

        // Duel system: determine winner/loser/draw class
        let duelClass = '';
        if (c.resolved && c.winner) {
            if (c.winner === 'both') {
                duelClass = 'draw-block'; // Match nul - les deux sont faded
            } else if (c.winner === side) {
                duelClass = 'winner-block'; // Ce côté a gagné
            } else {
                duelClass = 'loser-block'; // Ce côté a perdu
            }
        }

        const tooltipContent = side === 'left'
            ? '<div class="rich-tooltip ' + tooltipClass + '"><div class="rich-tooltip-card">' +
              '<div class="tooltip-header"><div class="tooltip-icon ' + iconClass + '">' + icons.arrowRight + '</div>' +
              '<span class="tooltip-title">Garder votre version</span></div>' +
              '<div class="tooltip-body">Ce code est <strong>votre travail actuel</strong>. En cliquant, vous gardez uniquement vos modifications et ignorez les changements de l\\'autre branche.</div>' +
              '<div class="tooltip-visual"><span class="tooltip-visual-block v-left">Actuel</span>' +
              '<span class="tooltip-visual-arrow">→</span>' +
              '<span class="tooltip-visual-block v-result">Résultat</span></div></div></div>'
            : '<div class="rich-tooltip ' + tooltipClass + '"><div class="rich-tooltip-card">' +
              '<div class="tooltip-header"><div class="tooltip-icon ' + iconClass + '">' + icons.arrowLeft + '</div>' +
              '<span class="tooltip-title">Accepter les changements</span></div>' +
              '<div class="tooltip-body">Ce code vient de <strong>l\\'autre branche</strong> (un collègue ou une autre fonctionnalité). En cliquant, vous remplacez votre code par celui-ci.</div>' +
              '<div class="tooltip-visual"><span class="tooltip-visual-block v-right">Entrant</span>' +
              '<span class="tooltip-visual-arrow">→</span>' +
              '<span class="tooltip-visual-block v-result">Résultat</span></div></div></div>';

        return '<div class="conflict-block ' + (c.resolved ? 'resolved' : '') + ' ' + duelClass + '" data-index="' + i + '">' +
            '<div class="conflict-header"><span class="conflict-label"><span class="status-dot"></span>' + label + '</span></div>' +
            '<div class="code-block">' + linesHtml +
            '<button class="transfer-btn ' + btnClass + '" data-index="' + i + '" data-side="' + side + '">' + btnLabel + '</button>' +
            tooltipContent +
            '</div></div>';
    }

    function attachSideEvents(panel, side) {
        panel.querySelectorAll('.transfer-btn').forEach(btn => {
            btn.addEventListener('click', (e) => { acceptChange(parseInt(e.currentTarget.dataset.index), side); });
        });
    }

    function attachCenterEvents() {
        centerPanel.querySelectorAll('.merge-both-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                acceptChange(parseInt(e.currentTarget.dataset.index), 'both');
            });
        });
        centerPanel.querySelectorAll('.result-block').forEach(b => {
            b.addEventListener('input', (e) => {
                const i = parseInt(e.target.dataset.index);
                conflicts[i].result = e.target.textContent || '';
                conflicts[i].resolved = true;
                updateProgress();
                vscode.postMessage({ command: 'updateResult', conflictIndex: i, content: conflicts[i].result });
            });
        });
    }

    function acceptChange(i, side) {
        const c = conflicts[i];
        const wasResolved = c.resolved;

        if (side === 'left') c.result = c.current;
        else if (side === 'right') c.result = c.incoming;
        else c.result = c.current + '\\n' + c.incoming;
        c.resolved = true;
        c.winner = side; // Track who won the duel: 'left', 'right', or 'both'
        vscode.postMessage({ command: 'acceptChange', conflictIndex: i, side: side });
        renderPanels();
        updateProgress();

        // If it was already resolved (re-resolution), just update without scrolling away
        if (wasResolved) {
            currentConflictIndex = i;
            updateActiveBlock();
            updateNavigator();
            return;
        }

        // Find the next unresolved conflict
        const next = conflicts.findIndex((x, j) => j > i && !x.resolved);

        // First scroll the resolved block to bottom, then move to next
        scrollToBottom(i, () => {
            if (next !== -1) {
                // Move to next unresolved conflict after animation
                setTimeout(() => {
                    currentConflictIndex = next;
                    scrollToConflict(next);
                    updateNavigator();
                }, 300);
            } else {
                // No more conflicts - check if there are any unresolved before current
                const prevUnresolved = conflicts.findIndex((x) => !x.resolved);
                if (prevUnresolved !== -1) {
                    setTimeout(() => {
                        currentConflictIndex = prevUnresolved;
                        scrollToConflict(prevUnresolved);
                        updateNavigator();
                    }, 300);
                }
            }
        });
        updateNavigator();
    }

    function updateNavigator() {
        navCurrent.textContent = currentConflictIndex + 1;
        prevBtn.disabled = currentConflictIndex === 0;
        nextBtn.disabled = currentConflictIndex === conflicts.length - 1;
    }

    function updateProgress() {
        const r = conflicts.filter(c => c.resolved).length;
        const t = conflicts.length;
        progressFill.style.width = (r / t * 100) + '%';
        resolvedCount.textContent = r + ' sur ' + t + ' résolu' + (r > 1 ? 's' : '');
        if (r === t) { resolvedCount.style.color = 'var(--success-color)'; saveBtn.classList.add('pulse'); }
        else { resolvedCount.style.color = ''; saveBtn.classList.remove('pulse'); }
    }

    let isScrolling = false;

    function scrollToConflict(i) {
        currentConflictIndex = i;
        isScrolling = true;

        // Add moving class for animation
        syncIndicator.classList.add('moving');

        // Since blocks are aligned via spacers, we can use any panel as reference
        // All panels will scroll to the same position
        const referenceBlock = centerPanel.querySelectorAll('.conflict-block')[i];
        if (referenceBlock) {
            const scrollTarget = referenceBlock.offsetTop - ALIGN_POSITION;
            const panels = [leftPanel, centerPanel, rightPanel];
            panels.forEach(panel => {
                panel.scrollTo({
                    top: Math.max(0, scrollTarget),
                    behavior: 'smooth'
                });
            });
        }

        updateActiveBlock();

        // Animate sync indicator to the aligned position
        setTimeout(() => {
            updateSyncIndicator();
            syncIndicator.classList.remove('moving');
            isScrolling = false;
        }, 450);
    }

    // Scroll resolved block to bottom of panel
    function scrollToBottom(i, callback) {
        isScrolling = true;
        syncIndicator.classList.add('moving');

        const panelHeight = leftPanel.clientHeight;
        const referenceBlock = centerPanel.querySelectorAll('.conflict-block')[i];

        if (referenceBlock) {
            const blockHeight = referenceBlock.offsetHeight;
            // Scroll so the block's bottom is near the panel's bottom
            const scrollTarget = referenceBlock.offsetTop - panelHeight + blockHeight + 50;

            const panels = [leftPanel, centerPanel, rightPanel];
            panels.forEach(panel => {
                panel.scrollTo({
                    top: Math.max(0, scrollTarget),
                    behavior: 'smooth'
                });
            });
        }

        // Move sync indicator to bottom
        syncIndicator.style.top = (panelHeight - 50) + 'px';

        setTimeout(() => {
            syncIndicator.classList.remove('moving');
            isScrolling = false;
            if (callback) callback();
        }, 500);
    }

    // Click handler for conflict blocks - scroll all panels to show clicked block
    function attachBlockClickHandlers() {
        document.querySelectorAll('.conflict-block').forEach(block => {
            block.addEventListener('click', (e) => {
                // Don't trigger if clicking on buttons or editable areas
                if (e.target.closest('button') || e.target.closest('[contenteditable]')) return;

                const index = parseInt(block.dataset.index);
                if (isNaN(index)) return;

                // Update current conflict index and navigate to it
                currentConflictIndex = index;
                scrollToConflict(index);
                updateNavigator();
            });
        });
    }

    function getResult() {
        let result = '';
        let ci = 0;
        const sorted = [...nonConflictingParts].sort((a, b) => a.start - b.start);
        for (const p of sorted) {
            while (ci < conflicts.length && conflicts[ci].startLine < p.start) {
                if (conflicts[ci].resolved && conflicts[ci].result) result += conflicts[ci].result + '\\n';
                ci++;
            }
            result += p.content + '\\n';
        }
        while (ci < conflicts.length) {
            if (conflicts[ci].resolved && conflicts[ci].result) result += conflicts[ci].result + '\\n';
            ci++;
        }
        return result.trim();
    }

    function escapeHtml(t) {
        return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    prevBtn.addEventListener('click', () => { if (currentConflictIndex > 0) { currentConflictIndex--; scrollToConflict(currentConflictIndex); updateNavigator(); } });
    nextBtn.addEventListener('click', () => { if (currentConflictIndex < conflicts.length - 1) { currentConflictIndex++; scrollToConflict(currentConflictIndex); updateNavigator(); } });
    saveBtn.addEventListener('click', () => { vscode.postMessage({ command: 'save', content: getResult() }); });
    cancelBtn.addEventListener('click', () => { vscode.postMessage({ command: 'cancel' }); });
    acceptAllBtn.addEventListener('click', () => { vscode.postMessage({ command: 'acceptAllNonConflicting' }); });

    // Simple ratio-based scroll sync - since blocks are now aligned via spacers,
    // all panels have equal total heights, so we just sync scroll positions directly
    let lastScrollSource = null;
    let scrollRAF = null;

    function syncScrollSimple(sourcePanel) {
        if (!syncScroll) return;

        // Prevent infinite loop - only sync if this panel initiated the scroll
        if (lastScrollSource && lastScrollSource !== sourcePanel) return;
        lastScrollSource = sourcePanel;

        const scrollTop = sourcePanel.scrollTop;
        const panels = [leftPanel, centerPanel, rightPanel];

        // Sync other panels instantly (no animation for responsiveness)
        panels.forEach(panel => {
            if (panel === sourcePanel) return;
            panel.scrollTop = scrollTop;
        });

        // Detect which block is currently in view
        const sourceBlocks = sourcePanel.querySelectorAll('.conflict-block');
        const panelRect = sourcePanel.getBoundingClientRect();
        let activeIndex = 0;
        let minDistance = Infinity;

        sourceBlocks.forEach((block, index) => {
            const header = block.querySelector('.conflict-header');
            if (header) {
                const headerRect = header.getBoundingClientRect();
                const headerTopRelative = headerRect.top - panelRect.top;
                const distance = Math.abs(headerTopRelative - ALIGN_POSITION);
                if (distance < minDistance) {
                    minDistance = distance;
                    activeIndex = index;
                }
            }
        });

        if (activeIndex !== currentConflictIndex) {
            currentConflictIndex = activeIndex;
            updateActiveBlock();
            updateNavigator();
        }

        updateSyncIndicator();

        // Reset scroll source after a short delay
        clearTimeout(scrollRAF);
        scrollRAF = setTimeout(() => { lastScrollSource = null; }, 50);
    }

    // Use requestAnimationFrame for smooth, responsive scroll sync
    let ticking = false;
    function handleScroll(panel) {
        if (!ticking) {
            requestAnimationFrame(() => {
                syncScrollSimple(panel);
                ticking = false;
            });
            ticking = true;
        }
    }

    leftPanel.addEventListener('scroll', () => handleScroll(leftPanel));
    centerPanel.addEventListener('scroll', () => handleScroll(centerPanel));
    rightPanel.addEventListener('scroll', () => handleScroll(rightPanel));

    document.addEventListener('keydown', (e) => {
        if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); prevBtn.click(); }
        else if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); nextBtn.click(); }
        else if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveBtn.click(); }
    });

    window.addEventListener('message', event => {
        const m = event.data;
        if (m.command === 'conflictResolved') { conflicts[m.conflictIndex].result = m.result; conflicts[m.conflictIndex].resolved = true; renderPanels(); updateProgress(); }
        else if (m.command === 'bulkUpdate') { conflicts = m.conflicts; renderPanels(); updateProgress(); }
        else if (m.command === 'acceptCurrentConflict') { acceptChange(currentConflictIndex, m.side); }
    });

    init();
})();
`;
}
