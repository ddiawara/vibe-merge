# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VibeMerge is a VS Code extension providing a 3-way merge conflict resolution editor inspired by IntelliJ IDEA. It displays three synchronized panels (Current/Result/Incoming) with visual controls for accepting changes.

## Build & Development Commands

```bash
# Install dependencies
bun install

# Compile TypeScript
bun run compile

# Watch mode (auto-recompile)
bun run watch

# Lint
bun run lint

# Package extension
bunx @vscode/vsce package --allow-missing-repository
```

**Debug**: Press F5 in VS Code to launch Extension Development Host.

## Architecture

### Entry Point & Extension Lifecycle
- `src/extension.ts` - Extension activation, command registration, watcher setup

### Core Components

**Providers** (`src/providers/`):
- `MergeEditorProvider.ts` - Creates webview panel, handles message passing between VS Code and webview, manages conflict resolution state
- `ConflictFileDecorator.ts` - Adds file decorations (⚡ badge) for files with conflicts

**Utils** (`src/utils/`):
- `ConflictParser.ts` - Parses git conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) into structured `ConflictBlock` objects with `current`, `incoming`, labels, and line positions
- `GitConflictDetector.ts` - Detects conflicted files via `git diff --name-only --diff-filter=U` or fallback directory scan

**Webview** (`src/webview/`):
- `MergeEditorWebview.ts` - Generates complete HTML/CSS/JS for the 3-panel merge editor UI. Contains embedded styles and client-side logic (~1200 lines). Key features:
  - Panel synchronization via spacer alignment
  - Conflict navigation with sync indicator
  - Rich tooltips for beginner guidance
  - Duel system (winner/loser visual feedback)

### Data Flow

1. User opens file with conflicts → `MergeEditorProvider.openMergeEditor()`
2. `ConflictParser.parse()` extracts conflicts and non-conflicting parts
3. Webview renders three panels with aligned conflict blocks
4. User clicks accept buttons → webview posts message → provider updates state
5. Save → `ConflictParser.reconstruct()` rebuilds file content

### Key Interfaces

```typescript
interface ConflictBlock {
    startLine: number;
    endLine: number;
    current: string;      // Between <<<<<<< and =======
    incoming: string;     // Between ======= and >>>>>>>
    currentLabel: string; // e.g., "HEAD"
    incomingLabel: string;
    result: string;
    resolved: boolean;
}
```

## Taskfile

The project uses [Task](https://taskfile.dev) for automation:
- `task` - Show menu
- `task check` - Verify prerequisites (gum, jq, curl, git)
- `task ai:commit:yolo` - Auto add+commit+push
- `task ai:pr` - Create PR with AI description

## VS Code Extension API

- Webview panels with CSP nonce security
- FileDecorationProvider for conflict badges
- FileSystemWatcher for conflict detection
- Context variables (`vibeMerge.hasConflicts`, `vibeMerge.editorActive`) for keybinding conditions
