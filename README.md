# VibeMerge - Git Merge Conflict Resolver

> Transform merge conflicts into epic duels! The best 3-way diff editor for VS Code, inspired by IntelliJ IDEA.

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/d3nai.vibe-merge?style=for-the-badge&logo=visual-studio-code&color=007ACC)](https://marketplace.visualstudio.com/items?itemName=d3nai.vibe-merge)
[![Visual Studio Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/d3nai.vibe-merge?style=for-the-badge&logo=visual-studio-code&color=10b981)](https://marketplace.visualstudio.com/items?itemName=d3nai.vibe-merge)
[![Visual Studio Marketplace Rating](https://img.shields.io/visual-studio-marketplace/r/d3nai.vibe-merge?style=for-the-badge&logo=visual-studio-code&color=f59e0b)](https://marketplace.visualstudio.com/items?itemName=d3nai.vibe-merge)
[![License](https://img.shields.io/badge/license-MIT-orange?style=for-the-badge)](LICENSE)

---

## 🎬 Demo

![VibeMerge Demo](media/demo/demo-small.gif)

---

## ✨ Why VibeMerge?

| Feature | Description |
|---------|-------------|
| **3-Way Merge** | IntelliJ IDEA-style triple panel: Current / Result / Incoming |
| **Duel System** | Each conflict resolution is an epic battle with animations |
| **Score Tracking** | Track your Defense, Victory, and Alliance stats |
| **Victory Celebration** | Confetti explosion when all conflicts are resolved |
| **Syntax Highlighting** | Automatic language detection and highlighting |
| **Synchronized Scroll** | All panels scroll together for easy comparison |

---

## 📸 Screenshots

### 3-Way Editor
![Main Editor](media/screenshots/editor-main.png)
*Triple panel view: Current (🛡️) | Result (📝) | Incoming (⚔️)*

### Duel System
| Defense 🛡️ | Victory ⚔️ | Alliance 🤝 |
|------------|-------------|-------------|
| ![Defense](media/screenshots/duel-defense.png) | ![Victory](media/screenshots/duel-victory.png) | ![Alliance](media/screenshots/duel-alliance.png) |

### Victory Celebration
![Victory](media/screenshots/victory-celebration.png)
*All conflicts resolved = Confetti and celebration!*

---

## ✨ Features

### 🎯 Premium 3-Way Editor
- **Triple panel view**: Current (Left) | Result (Center) | Incoming (Right)
- **Synchronized scrolling** across all three panels
- **Syntax highlighting** based on file type
- **Line numbers** for precise navigation
- **diff3 support** with base content for better analysis

### 🎮 Epic Duel System
Every conflict resolution becomes an **epic duel**!

| Action | Result | Animation |
|--------|--------|-----------|
| Accept Left | 🛡️ **DEFENSE!** | Glowing cyan shield |
| Accept Right | ⚔️ **VICTORY!** | Purple diagonal slash |
| Accept Both | 🤝 **ALLIANCE!** | Golden merge fusion |

### 📊 Real-Time Score Board
- **Defense** counter 🛡️
- **Victory** counter ⚔️
- **Alliance** counter 🤝
- Pulse animation on each point scored

### 🎉 Victory Celebration
When all conflicts are resolved:
- Celebration overlay with confetti
- Spectacular animation
- Quick save button
- Keyboard shortcut displayed

### 🔧 Smart Encoding Management
- **Auto-detection** of UTF-8, Latin-1, etc.
- **Automatic mojibake fix** for corrupted characters
- **Preservation** of line endings (LF/CRLF)
- **Status bar** with confidence indicator

---

## 📦 Installation

### Option 1: VS Code Marketplace (Recommended)

1. Open VS Code
2. Go to Extensions (`Cmd+Shift+X` / `Ctrl+Shift+X`)
3. Search for **"VibeMerge"**
4. Click **Install**

### Option 2: From VSIX file

1. Download `vibe-merge-x.x.x.vsix` from [Releases](https://github.com/d3nai/vibe-merge/releases)
2. In VS Code, open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
3. Type **"Extensions: Install from VSIX..."**
4. Select the downloaded `.vsix` file
5. Restart VS Code

### Option 3: Build from source

```bash
git clone https://github.com/d3nai/vibe-merge.git
cd vibe-merge
bun install
bun run compile
bunx @vscode/vsce package --allow-missing-repository
```

---

## 🎹 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Alt+M` (Mac) / `Ctrl+Alt+M` (Win/Linux) | Open Merge Editor |
| `Cmd+Shift+←` / `Ctrl+Shift+←` | Accept Left (Defense 🛡️) |
| `Cmd+Shift+→` / `Ctrl+Shift+→` | Accept Right (Victory ⚔️) |
| `Alt+↑` / `Alt+↓` | Navigate between conflicts |
| `Cmd+S` / `Ctrl+S` | Save |

---

## 🎮 Usage

### Available Commands

Open the Command Palette (`Cmd+Shift+P`) and type "VibeMerge":

| Command | Description |
|---------|-------------|
| **Open Merge Editor** | Open the merge editor for the current file |
| **Resolve All Conflicts** | Auto-resolve simple conflicts |
| **Accept Current (Left)** | Accept current version (Defense) |
| **Accept Incoming (Right)** | Accept incoming version (Victory) |
| **Accept Both Changes** | Keep both versions (Alliance) |

### Typical Workflow

```
1. 🔀 You have a git conflict after merge/rebase
2. 📂 Open the conflicted file
3. ⌨️  Press Cmd+Alt+M to open VibeMerge
4. 👀 You'll see 3 panels:
   ┌─────────────┬─────────────┬─────────────┐
   │   CURRENT   │   RESULT    │  INCOMING   │
   │   (Yours)   │  (Preview)  │  (Theirs)   │
   │     🛡️      │     📝      │     ⚔️      │
   └─────────────┴─────────────┴─────────────┘
5. 🎮 Resolve each conflict - Enjoy the duel animations!
6. 🎉 All resolved? Automatic celebration!
7. 💾 Save with Cmd+S
```

---

## ⚙️ Configuration

In VS Code settings (`Cmd+,`), search for "VibeMerge":

| Setting | Description | Default |
|---------|-------------|---------|
| `vibeMerge.autoApplyNonConflicting` | Auto-apply non-conflicting changes | `true` |
| `vibeMerge.showLineNumbers` | Show line numbers | `true` |
| `vibeMerge.highlightSyntax` | Enable syntax highlighting | `true` |
| `vibeMerge.syncScroll` | Synchronize scroll between panels | `true` |

---

## 🏗️ Architecture

```
src/
├── extension.ts              # Entry point, activation
├── providers/
│   ├── MergeEditorProvider.ts    # Webview and message handling
│   └── ConflictFileDecorator.ts  # Badge decorations on conflict files
├── utils/
│   ├── ConflictParser.ts     # Parse git markers (<<<, ===, >>>)
│   ├── DiffUtils.ts          # LCS, word-diff, conflict analysis
│   ├── EncodingUtils.ts      # Encoding detection, mojibake fix
│   └── GitConflictDetector.ts # Conflict file detection
└── webview/
    └── MergeEditorWebview.ts # 3-panel interface + Duel System
```

---

## 🛠️ Development

```bash
# Watch mode (auto-recompile)
bun run watch

# Debug mode
# Press F5 in VS Code to launch Extension Development Host

# Lint
bun run lint

# Package for distribution
bunx @vscode/vsce package --allow-missing-repository
```

---

## 🎨 Design Inspirations

- **IntelliJ IDEA** — 3-way merge interface
- **KDiff3** — Conflict detection algorithms
- **Fighting Games** — Duel system and scoring

---

## 📜 Changelog

### v0.1.0 (Initial Release)
- 3-way editor with synchronized scrolling
- Git conflict parsing (standard and diff3)
- Duel System with animations (Defense/Victory/Alliance)
- Real-time Score Board
- Victory celebration with confetti
- Smart encoding management
- Automatic syntax highlighting
- Complete keyboard shortcuts

---

## 📄 License

MIT © 2024 d3nai

---

<p align="center">
  <strong>Made with ❤️ and ⚔️ by d3n</strong><br>
  <em>May your merges be ever victorious!</em>
</p>
