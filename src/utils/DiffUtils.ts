/**
 * Advanced diff utilities for VibeMerge
 * Implements word-level diff, LCS algorithm, and smart conflict detection
 * Inspired by IntelliJ IDEA and KDiff3 algorithms
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DiffResult {
    type: 'equal' | 'added' | 'deleted' | 'modified';
    value: string;
    oldValue?: string; // For modified type
}

export interface LineDiff {
    lineNumber: number;
    type: 'equal' | 'added' | 'deleted' | 'modified' | 'conflict';
    content: string;
    oldContent?: string;
    wordDiffs?: DiffResult[];
}

export interface ConflictAnalysis {
    type: 'real-conflict' | 'auto-resolvable' | 'whitespace-only' | 'identical';
    suggestion?: 'left' | 'right' | 'both' | 'none';
    confidence: number;
    reason: string;
}

// ============================================================================
// LONGEST COMMON SUBSEQUENCE (LCS) ALGORITHM
// ============================================================================

/**
 * Computes the Longest Common Subsequence between two arrays
 * Used for diff alignment (IntelliJ/KDiff3 approach)
 */
export function computeLCS<T>(a: T[], b: T[], equals: (x: T, y: T) => boolean = (x, y) => x === y): T[] {
    const m = a.length;
    const n = b.length;

    // Create DP table
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    // Fill DP table
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (equals(a[i - 1], b[j - 1])) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    // Backtrack to find LCS
    const lcs: T[] = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
        if (equals(a[i - 1], b[j - 1])) {
            lcs.unshift(a[i - 1]);
            i--;
            j--;
        } else if (dp[i - 1][j] > dp[i][j - 1]) {
            i--;
        } else {
            j--;
        }
    }

    return lcs;
}

// ============================================================================
// WORD-LEVEL DIFF
// ============================================================================

/**
 * Splits text into words for word-level diff
 * Preserves whitespace as separate tokens for accurate reconstruction
 */
export function tokenizeWords(text: string): string[] {
    // Split into words and whitespace, keeping both
    return text.split(/(\s+)/).filter(token => token.length > 0);
}

/**
 * Computes word-level diff between two strings
 * Returns array of DiffResult showing added/deleted/equal words
 */
export function computeWordDiff(oldText: string, newText: string): DiffResult[] {
    const oldWords = tokenizeWords(oldText);
    const newWords = tokenizeWords(newText);

    const lcs = computeLCS(oldWords, newWords);
    const result: DiffResult[] = [];

    let oldIndex = 0;
    let newIndex = 0;
    let lcsIndex = 0;

    while (oldIndex < oldWords.length || newIndex < newWords.length) {
        // Check if current words match LCS
        const oldMatchesLCS = lcsIndex < lcs.length && oldIndex < oldWords.length && oldWords[oldIndex] === lcs[lcsIndex];
        const newMatchesLCS = lcsIndex < lcs.length && newIndex < newWords.length && newWords[newIndex] === lcs[lcsIndex];

        if (oldMatchesLCS && newMatchesLCS) {
            // Equal word
            result.push({ type: 'equal', value: oldWords[oldIndex] });
            oldIndex++;
            newIndex++;
            lcsIndex++;
        } else if (!oldMatchesLCS && oldIndex < oldWords.length) {
            // Deleted from old
            result.push({ type: 'deleted', value: oldWords[oldIndex] });
            oldIndex++;
        } else if (!newMatchesLCS && newIndex < newWords.length) {
            // Added in new
            result.push({ type: 'added', value: newWords[newIndex] });
            newIndex++;
        }
    }

    return result;
}

/**
 * Renders word diff as HTML with highlighting
 */
export function renderWordDiffHTML(diffs: DiffResult[]): string {
    return diffs.map(diff => {
        switch (diff.type) {
            case 'added':
                return `<span class="word-added">${escapeHTML(diff.value)}</span>`;
            case 'deleted':
                return `<span class="word-deleted">${escapeHTML(diff.value)}</span>`;
            case 'modified':
                return `<span class="word-changed">${escapeHTML(diff.value)}</span>`;
            default:
                return escapeHTML(diff.value);
        }
    }).join('');
}

// ============================================================================
// LINE-LEVEL DIFF
// ============================================================================

/**
 * Computes line-level diff between two texts
 */
export function computeLineDiff(oldText: string, newText: string): LineDiff[] {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');

    const lcs = computeLCS(oldLines, newLines);
    const result: LineDiff[] = [];

    let oldIndex = 0;
    let newIndex = 0;
    let lcsIndex = 0;
    let lineNumber = 1;

    while (oldIndex < oldLines.length || newIndex < newLines.length) {
        const oldMatchesLCS = lcsIndex < lcs.length && oldIndex < oldLines.length && oldLines[oldIndex] === lcs[lcsIndex];
        const newMatchesLCS = lcsIndex < lcs.length && newIndex < newLines.length && newLines[newIndex] === lcs[lcsIndex];

        if (oldMatchesLCS && newMatchesLCS) {
            result.push({
                lineNumber: lineNumber++,
                type: 'equal',
                content: oldLines[oldIndex]
            });
            oldIndex++;
            newIndex++;
            lcsIndex++;
        } else if (!oldMatchesLCS && !newMatchesLCS && oldIndex < oldLines.length && newIndex < newLines.length) {
            // Modified line - compute word diff
            const wordDiffs = computeWordDiff(oldLines[oldIndex], newLines[newIndex]);
            result.push({
                lineNumber: lineNumber++,
                type: 'modified',
                content: newLines[newIndex],
                oldContent: oldLines[oldIndex],
                wordDiffs
            });
            oldIndex++;
            newIndex++;
        } else if (!oldMatchesLCS && oldIndex < oldLines.length) {
            result.push({
                lineNumber: lineNumber++,
                type: 'deleted',
                content: oldLines[oldIndex]
            });
            oldIndex++;
        } else if (!newMatchesLCS && newIndex < newLines.length) {
            result.push({
                lineNumber: lineNumber++,
                type: 'added',
                content: newLines[newIndex]
            });
            newIndex++;
        }
    }

    return result;
}

// ============================================================================
// CONFLICT ANALYSIS (IntelliJ/KDiff3 inspired)
// ============================================================================

/**
 * Analyzes a conflict to determine if it can be auto-resolved
 * Based on KDiff3's "simple conflict" detection
 */
export function analyzeConflict(current: string, incoming: string, base?: string): ConflictAnalysis {
    // Normalize whitespace for comparison
    const normalizedCurrent = current.trim();
    const normalizedIncoming = incoming.trim();

    // Case 1: Identical content - not a real conflict
    if (normalizedCurrent === normalizedIncoming) {
        return {
            type: 'identical',
            suggestion: 'left', // Either works
            confidence: 1.0,
            reason: 'Both sides have identical content'
        };
    }

    // Case 2: One side is empty - take the non-empty side
    if (normalizedCurrent === '' && normalizedIncoming !== '') {
        return {
            type: 'auto-resolvable',
            suggestion: 'right',
            confidence: 0.95,
            reason: 'Current side is empty, taking incoming changes'
        };
    }

    if (normalizedIncoming === '' && normalizedCurrent !== '') {
        return {
            type: 'auto-resolvable',
            suggestion: 'left',
            confidence: 0.95,
            reason: 'Incoming side is empty, keeping current changes'
        };
    }

    // Case 3: Whitespace-only difference
    if (current.replace(/\s+/g, '') === incoming.replace(/\s+/g, '')) {
        return {
            type: 'whitespace-only',
            suggestion: 'left', // Prefer current by default
            confidence: 0.8,
            reason: 'Only whitespace differences detected'
        };
    }

    // Case 4: One side contains the other (superset)
    if (normalizedCurrent.includes(normalizedIncoming)) {
        return {
            type: 'auto-resolvable',
            suggestion: 'left',
            confidence: 0.7,
            reason: 'Current side contains all incoming content'
        };
    }

    if (normalizedIncoming.includes(normalizedCurrent)) {
        return {
            type: 'auto-resolvable',
            suggestion: 'right',
            confidence: 0.7,
            reason: 'Incoming side contains all current content'
        };
    }

    // Case 5: If base is provided, check if only one side changed
    if (base !== undefined) {
        const normalizedBase = base.trim();

        if (normalizedCurrent === normalizedBase && normalizedIncoming !== normalizedBase) {
            return {
                type: 'auto-resolvable',
                suggestion: 'right',
                confidence: 0.9,
                reason: 'Only incoming side changed from base'
            };
        }

        if (normalizedIncoming === normalizedBase && normalizedCurrent !== normalizedBase) {
            return {
                type: 'auto-resolvable',
                suggestion: 'left',
                confidence: 0.9,
                reason: 'Only current side changed from base'
            };
        }
    }

    // Case 6: Non-overlapping changes - might be combinable
    const currentLines = normalizedCurrent.split('\n');
    const incomingLines = normalizedIncoming.split('\n');

    // Check if changes are at different positions
    if (currentLines.length === incomingLines.length) {
        let changedIndices: number[] = [];
        for (let i = 0; i < currentLines.length; i++) {
            if (currentLines[i] !== incomingLines[i]) {
                changedIndices.push(i);
            }
        }

        // If changes are sparse, might suggest 'both'
        if (changedIndices.length <= Math.ceil(currentLines.length * 0.3)) {
            return {
                type: 'auto-resolvable',
                suggestion: 'both',
                confidence: 0.5,
                reason: 'Changes appear to be non-overlapping, consider combining both'
            };
        }
    }

    // Default: Real conflict requiring manual resolution
    return {
        type: 'real-conflict',
        suggestion: undefined,
        confidence: 0,
        reason: 'Manual resolution required - changes overlap'
    };
}

/**
 * Auto-resolves simple conflicts based on analysis
 * Returns resolved content or null if manual resolution needed
 */
export function autoResolveConflict(current: string, incoming: string, base?: string): string | null {
    const analysis = analyzeConflict(current, incoming, base);

    if (analysis.type === 'real-conflict') {
        return null;
    }

    switch (analysis.suggestion) {
        case 'left':
            return current;
        case 'right':
            return incoming;
        case 'both':
            return current + '\n' + incoming;
        case 'none':
            return '';
        default:
            return null;
    }
}

// ============================================================================
// THREE-WAY MERGE (diff3 style)
// ============================================================================

/**
 * Performs a three-way merge between current, incoming, and base
 * Returns merged content and list of remaining conflicts
 */
export function threeWayMerge(
    current: string,
    incoming: string,
    base: string
): { merged: string; conflicts: { start: number; end: number; current: string; incoming: string }[] } {
    const currentLines = current.split('\n');
    const incomingLines = incoming.split('\n');
    const baseLines = base.split('\n');

    const currentDiff = computeLineDiff(base, current);
    const incomingDiff = computeLineDiff(base, incoming);

    const merged: string[] = [];
    const conflicts: { start: number; end: number; current: string; incoming: string }[] = [];

    let baseIndex = 0;
    let currentIndex = 0;
    let incomingIndex = 0;

    while (baseIndex < baseLines.length || currentIndex < currentLines.length || incomingIndex < incomingLines.length) {
        const baseLine = baseIndex < baseLines.length ? baseLines[baseIndex] : null;
        const currentLine = currentIndex < currentLines.length ? currentLines[currentIndex] : null;
        const incomingLine = incomingIndex < incomingLines.length ? incomingLines[incomingIndex] : null;

        // All three match
        if (baseLine === currentLine && baseLine === incomingLine) {
            if (baseLine !== null) merged.push(baseLine);
            baseIndex++;
            currentIndex++;
            incomingIndex++;
            continue;
        }

        // Current changed, incoming unchanged
        if (baseLine === incomingLine && baseLine !== currentLine) {
            if (currentLine !== null) merged.push(currentLine);
            currentIndex++;
            if (baseLine !== null) baseIndex++;
            if (incomingLine !== null) incomingIndex++;
            continue;
        }

        // Incoming changed, current unchanged
        if (baseLine === currentLine && baseLine !== incomingLine) {
            if (incomingLine !== null) merged.push(incomingLine);
            incomingIndex++;
            if (baseLine !== null) baseIndex++;
            if (currentLine !== null) currentIndex++;
            continue;
        }

        // Both changed the same way
        if (currentLine === incomingLine && currentLine !== baseLine) {
            if (currentLine !== null) merged.push(currentLine);
            currentIndex++;
            incomingIndex++;
            if (baseLine !== null) baseIndex++;
            continue;
        }

        // Conflict: both changed differently
        const conflictStart = merged.length;
        conflicts.push({
            start: conflictStart,
            end: conflictStart, // Will be updated
            current: currentLine || '',
            incoming: incomingLine || ''
        });

        // Add conflict markers
        merged.push(`<<<<<<< CURRENT`);
        if (currentLine !== null) merged.push(currentLine);
        merged.push(`=======`);
        if (incomingLine !== null) merged.push(incomingLine);
        merged.push(`>>>>>>> INCOMING`);

        conflicts[conflicts.length - 1].end = merged.length;

        currentIndex++;
        incomingIndex++;
        if (baseLine !== null) baseIndex++;
    }

    return { merged: merged.join('\n'), conflicts };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Escapes HTML special characters
 */
function escapeHTML(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Calculates similarity ratio between two strings (0-1)
 * Useful for determining if changes are significant
 */
export function calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    const lcs = computeLCS(a.split(''), b.split(''));
    return (2 * lcs.length) / (a.length + b.length);
}

/**
 * Determines the type of change for display purposes
 */
export function getChangeType(current: string, incoming: string, base?: string): 'conflict' | 'modified' | 'added' | 'deleted' {
    const analysis = analyzeConflict(current, incoming, base);

    if (analysis.type === 'real-conflict') {
        return 'conflict';
    }

    if (current.trim() === '' && incoming.trim() !== '') {
        return 'added';
    }

    if (incoming.trim() === '' && current.trim() !== '') {
        return 'deleted';
    }

    return 'modified';
}
