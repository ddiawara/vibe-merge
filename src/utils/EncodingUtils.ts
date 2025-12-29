/**
 * Advanced encoding utilities for VibeMerge
 * Handles encoding detection, BOM detection, and mojibake correction
 * Inspired by WinMerge, IntelliJ, and Raymond Chen's mojibake detection
 */

// ============================================================================
// TYPES
// ============================================================================

export interface EncodingInfo {
    encoding: string;
    confidence: number;
    hasBOM: boolean;
    mojibakeCount: number;
    lineEnding: 'LF' | 'CRLF' | 'CR' | 'mixed';
}

export type SupportedEncoding =
    | 'utf-8'
    | 'utf-8-bom'
    | 'utf-16le'
    | 'utf-16be'
    | 'utf-32le'
    | 'utf-32be'
    | 'latin-1'
    | 'windows-1252'
    | 'unknown';

// ============================================================================
// BOM DETECTION (Byte Order Mark)
// ============================================================================

/**
 * Detects BOM (Byte Order Mark) at the start of a buffer
 * Based on WinMerge's detection strategy
 */
export function detectBOM(buffer: Uint8Array): SupportedEncoding | null {
    if (buffer.length < 2) return null;

    // UTF-8 BOM: EF BB BF
    if (buffer.length >= 3 &&
        buffer[0] === 0xEF &&
        buffer[1] === 0xBB &&
        buffer[2] === 0xBF) {
        return 'utf-8-bom';
    }

    // UTF-32 LE BOM: FF FE 00 00 (must check before UTF-16 LE)
    if (buffer.length >= 4 &&
        buffer[0] === 0xFF &&
        buffer[1] === 0xFE &&
        buffer[2] === 0x00 &&
        buffer[3] === 0x00) {
        return 'utf-32le';
    }

    // UTF-32 BE BOM: 00 00 FE FF
    if (buffer.length >= 4 &&
        buffer[0] === 0x00 &&
        buffer[1] === 0x00 &&
        buffer[2] === 0xFE &&
        buffer[3] === 0xFF) {
        return 'utf-32be';
    }

    // UTF-16 LE BOM: FF FE
    if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
        return 'utf-16le';
    }

    // UTF-16 BE BOM: FE FF
    if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
        return 'utf-16be';
    }

    return null;
}

/**
 * Gets the BOM bytes for a given encoding
 */
export function getBOMBytes(encoding: SupportedEncoding): Uint8Array {
    switch (encoding) {
        case 'utf-8-bom': return new Uint8Array([0xEF, 0xBB, 0xBF]);
        case 'utf-16le': return new Uint8Array([0xFF, 0xFE]);
        case 'utf-16be': return new Uint8Array([0xFE, 0xFF]);
        case 'utf-32le': return new Uint8Array([0xFF, 0xFE, 0x00, 0x00]);
        case 'utf-32be': return new Uint8Array([0x00, 0x00, 0xFE, 0xFF]);
        default: return new Uint8Array([]);
    }
}

// ============================================================================
// UTF-8 VALIDATION
// ============================================================================

/**
 * Validates if a buffer contains valid UTF-8 sequences
 * Returns confidence score (0-1) and invalid byte positions
 */
export function validateUTF8(buffer: Uint8Array): { valid: boolean; confidence: number; invalidPositions: number[] } {
    const invalidPositions: number[] = [];
    let validSequences = 0;
    let totalSequences = 0;

    for (let i = 0; i < buffer.length; i++) {
        const byte = buffer[i];
        totalSequences++;

        // ASCII (0x00-0x7F) - always valid
        if (byte < 0x80) {
            validSequences++;
            continue;
        }

        // 2-byte sequence (0xC0-0xDF)
        if ((byte & 0xE0) === 0xC0) {
            if (i + 1 < buffer.length && (buffer[i + 1] & 0xC0) === 0x80) {
                validSequences++;
                i += 1;
            } else {
                invalidPositions.push(i);
            }
            continue;
        }

        // 3-byte sequence (0xE0-0xEF)
        if ((byte & 0xF0) === 0xE0) {
            if (i + 2 < buffer.length &&
                (buffer[i + 1] & 0xC0) === 0x80 &&
                (buffer[i + 2] & 0xC0) === 0x80) {
                validSequences++;
                i += 2;
            } else {
                invalidPositions.push(i);
            }
            continue;
        }

        // 4-byte sequence (0xF0-0xF7)
        if ((byte & 0xF8) === 0xF0) {
            if (i + 3 < buffer.length &&
                (buffer[i + 1] & 0xC0) === 0x80 &&
                (buffer[i + 2] & 0xC0) === 0x80 &&
                (buffer[i + 3] & 0xC0) === 0x80) {
                validSequences++;
                i += 3;
            } else {
                invalidPositions.push(i);
            }
            continue;
        }

        // Invalid start byte
        invalidPositions.push(i);
    }

    const confidence = totalSequences > 0 ? validSequences / totalSequences : 1;
    return {
        valid: invalidPositions.length === 0,
        confidence,
        invalidPositions
    };
}

// ============================================================================
// MOJIBAKE DETECTION AND CORRECTION
// ============================================================================

// Common mojibake patterns: UTF-8 bytes misread as Latin-1/Windows-1252
const MOJIBAKE_PATTERNS: [string, string][] = [
    // French accented characters (most common)
    ['\u00C3\u00A9', '\u00E9'], // é
    ['\u00C3\u00A8', '\u00E8'], // è
    ['\u00C3\u00AA', '\u00EA'], // ê
    ['\u00C3\u00AB', '\u00EB'], // ë
    ['\u00C3\u00A0', '\u00E0'], // à
    ['\u00C3\u00A2', '\u00E2'], // â
    ['\u00C3\u00AE', '\u00EE'], // î
    ['\u00C3\u00AF', '\u00EF'], // ï
    ['\u00C3\u00B4', '\u00F4'], // ô
    ['\u00C3\u00B9', '\u00F9'], // ù
    ['\u00C3\u00FB', '\u00FB'], // û
    ['\u00C3\u00BC', '\u00FC'], // ü
    ['\u00C3\u00A7', '\u00E7'], // ç

    // Other Latin characters
    ['\u00C3\u00A1', '\u00E1'], // á
    ['\u00C3\u00A3', '\u00E3'], // ã
    ['\u00C3\u00A4', '\u00E4'], // ä
    ['\u00C3\u00A5', '\u00E5'], // å
    ['\u00C3\u00A6', '\u00E6'], // æ
    ['\u00C3\u00AD', '\u00ED'], // í
    ['\u00C3\u00B1', '\u00F1'], // ñ
    ['\u00C3\u00B2', '\u00F2'], // ò
    ['\u00C3\u00B3', '\u00F3'], // ó
    ['\u00C3\u00B5', '\u00F5'], // õ
    ['\u00C3\u00B6', '\u00F6'], // ö
    ['\u00C3\u00B8', '\u00F8'], // ø
    ['\u00C3\u00BA', '\u00FA'], // ú
    ['\u00C3\u00BD', '\u00FD'], // ý
    ['\u00C3\u00BF', '\u00FF'], // ÿ
    ['\u00C3\u00B0', '\u00F0'], // ð
    ['\u00C3\u00BE', '\u00FE'], // þ

    // Uppercase accented
    ['\u00C3\u0080', '\u00C0'], // À
    ['\u00C3\u0081', '\u00C1'], // Á
    ['\u00C3\u0082', '\u00C2'], // Â
    ['\u00C3\u0083', '\u00C3'], // Ã
    ['\u00C3\u0084', '\u00C4'], // Ä
    ['\u00C3\u0085', '\u00C5'], // Å
    ['\u00C3\u0086', '\u00C6'], // Æ
    ['\u00C3\u0087', '\u00C7'], // Ç
    ['\u00C3\u0088', '\u00C8'], // È
    ['\u00C3\u0089', '\u00C9'], // É
    ['\u00C3\u008A', '\u00CA'], // Ê
    ['\u00C3\u008B', '\u00CB'], // Ë
    ['\u00C3\u008C', '\u00CC'], // Ì
    ['\u00C3\u008D', '\u00CD'], // Í
    ['\u00C3\u008E', '\u00CE'], // Î
    ['\u00C3\u008F', '\u00CF'], // Ï
    ['\u00C3\u0090', '\u00D0'], // Ð
    ['\u00C3\u0091', '\u00D1'], // Ñ
    ['\u00C3\u0092', '\u00D2'], // Ò
    ['\u00C3\u0093', '\u00D3'], // Ó
    ['\u00C3\u0094', '\u00D4'], // Ô
    ['\u00C3\u0095', '\u00D5'], // Õ
    ['\u00C3\u0096', '\u00D6'], // Ö
    ['\u00C3\u0099', '\u00D9'], // Ù
    ['\u00C3\u009A', '\u00DA'], // Ú
    ['\u00C3\u009B', '\u00DB'], // Û
    ['\u00C3\u009C', '\u00DC'], // Ü
    ['\u00C3\u009D', '\u00DD'], // Ý

    // Special characters and punctuation
    ['\u00E2\u0080\u0099', '\u2019'], // ' (right single quote)
    ['\u00E2\u0080\u0098', '\u2018'], // ' (left single quote)
    ['\u00E2\u0080\u009C', '\u201C'], // " (left double quote)
    ['\u00E2\u0080\u009D', '\u201D'], // " (right double quote)
    ['\u00E2\u0080\u0093', '\u2013'], // – (en dash)
    ['\u00E2\u0080\u0094', '\u2014'], // — (em dash)
    ['\u00E2\u0080\u00A6', '\u2026'], // … (ellipsis)
    ['\u00E2\u0080\u00A2', '\u2022'], // • (bullet)
    ['\u00E2\u0086\u0092', '\u2192'], // → (right arrow)
    ['\u00E2\u0086\u0090', '\u2190'], // ← (left arrow)
    ['\u00E2\u009C\u0093', '\u2713'], // ✓ (check mark)
    ['\u00E2\u009C\u0097', '\u2717'], // ✗ (cross mark)
    ['\u00E2\u009A\u00A0', '\u26A0'], // ⚠ (warning)

    // Euro and other currency
    ['\u00E2\u0082\u00AC', '\u20AC'], // € (euro)

    // Cleanup artifacts (lone bytes from double encoding)
    ['\u00C2', ''],
];

/**
 * Detects if text contains mojibake (encoding corruption)
 */
export function hasMojibake(text: string): boolean {
    for (const [pattern] of MOJIBAKE_PATTERNS) {
        if (text.includes(pattern)) {
            return true;
        }
    }
    return false;
}

/**
 * Fixes mojibake in text by replacing known bad patterns
 */
export function fixMojibake(text: string): string {
    let fixed = text;
    for (const [bad, good] of MOJIBAKE_PATTERNS) {
        fixed = fixed.split(bad).join(good);
    }
    return fixed;
}

/**
 * Counts the number of mojibake patterns found in text
 */
export function countMojibakePatterns(text: string): number {
    let count = 0;
    for (const [pattern] of MOJIBAKE_PATTERNS) {
        const matches = text.split(pattern).length - 1;
        count += matches;
    }
    return count;
}

/**
 * Gets detailed mojibake statistics
 */
export function getMojibakeStats(text: string): { pattern: string; replacement: string; count: number }[] {
    const stats: { pattern: string; replacement: string; count: number }[] = [];

    for (const [pattern, replacement] of MOJIBAKE_PATTERNS) {
        const count = text.split(pattern).length - 1;
        if (count > 0) {
            stats.push({ pattern, replacement, count });
        }
    }

    return stats.sort((a, b) => b.count - a.count);
}

// ============================================================================
// LINE ENDING DETECTION
// ============================================================================

/**
 * Detects the predominant line ending style in text
 */
export function detectLineEnding(text: string): 'LF' | 'CRLF' | 'CR' | 'mixed' {
    const crlfCount = (text.match(/\r\n/g) || []).length;
    const lfCount = (text.match(/(?<!\r)\n/g) || []).length;
    const crCount = (text.match(/\r(?!\n)/g) || []).length;

    const total = crlfCount + lfCount + crCount;
    if (total === 0) return 'LF'; // Default

    // Check for mixed line endings
    const types = [crlfCount > 0, lfCount > 0, crCount > 0].filter(Boolean).length;
    if (types > 1) return 'mixed';

    if (crlfCount > 0) return 'CRLF';
    if (crCount > 0) return 'CR';
    return 'LF';
}

/**
 * Normalizes line endings to a specific style
 */
export function normalizeLineEndings(text: string, target: 'LF' | 'CRLF'): string {
    // First normalize all to LF
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Then convert to target
    if (target === 'CRLF') {
        return normalized.replace(/\n/g, '\r\n');
    }
    return normalized;
}

// ============================================================================
// COMPREHENSIVE ENCODING ANALYSIS
// ============================================================================

/**
 * Performs comprehensive encoding analysis on text
 * Returns detailed information about encoding, mojibake, and line endings
 */
export function analyzeEncoding(text: string, buffer?: Uint8Array): EncodingInfo {
    // Check BOM if buffer provided
    let hasBOM = false;
    let detectedEncoding: string = 'utf-8';

    if (buffer) {
        const bomEncoding = detectBOM(buffer);
        if (bomEncoding) {
            hasBOM = true;
            detectedEncoding = bomEncoding;
        } else {
            const utf8Validation = validateUTF8(buffer);
            if (!utf8Validation.valid && utf8Validation.confidence < 0.9) {
                detectedEncoding = 'latin-1';
            }
        }
    }

    // Check for mojibake
    const mojibakeCount = countMojibakePatterns(text);
    if (mojibakeCount > 0 && detectedEncoding === 'utf-8') {
        // Text looks like UTF-8 but has mojibake - likely double-encoded
        detectedEncoding = 'utf-8-mojibake';
    }

    // Detect line endings
    const lineEnding = detectLineEnding(text);

    // Calculate confidence
    let confidence = 1.0;
    if (mojibakeCount > 0) {
        confidence = Math.max(0.3, 1 - (mojibakeCount * 0.05));
    }
    if (lineEnding === 'mixed') {
        confidence *= 0.9;
    }

    return {
        encoding: detectedEncoding,
        confidence,
        hasBOM,
        mojibakeCount,
        lineEnding
    };
}

/**
 * Auto-fixes encoding issues in text
 * Returns fixed text and a report of changes made
 */
export function autoFixEncoding(text: string): { fixed: string; changes: string[] } {
    const changes: string[] = [];
    let fixed = text;

    // Fix mojibake
    const mojibakeCount = countMojibakePatterns(fixed);
    if (mojibakeCount > 0) {
        fixed = fixMojibake(fixed);
        changes.push(`Fixed ${mojibakeCount} mojibake character(s)`);
    }

    // Normalize line endings to LF (Unix style)
    const lineEnding = detectLineEnding(fixed);
    if (lineEnding === 'CRLF' || lineEnding === 'mixed') {
        fixed = normalizeLineEndings(fixed, 'LF');
        changes.push(`Normalized line endings from ${lineEnding} to LF`);
    }

    return { fixed, changes };
}
