export interface ConflictBlock {
    startLine: number;
    endLine: number;
    current: string;      // Content from current branch (between <<<<<<< and =======)
    incoming: string;     // Content from incoming branch (between ======= and >>>>>>>)
    base?: string;        // Base content (diff3 style, between ||||||| and =======)
    currentLabel: string; // Label after <<<<<<< (e.g., HEAD)
    incomingLabel: string; // Label after >>>>>>> (e.g., feature-branch)
    baseLabel?: string;   // Label after ||||||| (e.g., merged common ancestors)
    result: string;       // The resolved content
    resolved: boolean;
    winner?: 'left' | 'right' | 'both'; // Which side won the conflict resolution
}

export interface ParsedConflict {
    originalContent: string;
    conflicts: ConflictBlock[];
    nonConflictingParts: { start: number; end: number; content: string }[];
}

export class ConflictParser {
    private readonly CONFLICT_START = /^<{7}\s*(.*)$/;
    private readonly CONFLICT_BASE = /^\|{7}\s*(.*)$/;    // diff3 style base marker
    private readonly CONFLICT_SEPARATOR = /^={7}\s*$/;
    private readonly CONFLICT_END = /^>{7}\s*(.*)$/;

    parse(content: string): ParsedConflict {
        const lines = content.split('\n');
        const conflicts: ConflictBlock[] = [];
        const nonConflictingParts: { start: number; end: number; content: string }[] = [];

        let inConflict = false;
        let section: 'current' | 'base' | 'incoming' = 'current';
        let currentConflict: Partial<ConflictBlock> = {};
        let currentLines: string[] = [];
        let baseLines: string[] = [];
        let incomingLines: string[] = [];
        let lastNonConflictEnd = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            const startMatch = line.match(this.CONFLICT_START);
            if (startMatch) {
                // Save non-conflicting part before this conflict
                if (i > lastNonConflictEnd) {
                    nonConflictingParts.push({
                        start: lastNonConflictEnd,
                        end: i - 1,
                        content: lines.slice(lastNonConflictEnd, i).join('\n')
                    });
                }

                inConflict = true;
                section = 'current';
                currentConflict = {
                    startLine: i,
                    currentLabel: startMatch[1]?.trim() || 'HEAD',
                    resolved: false
                };
                currentLines = [];
                baseLines = [];
                incomingLines = [];
                continue;
            }

            // diff3 style: ||||||| marks the base section
            const baseMatch = line.match(this.CONFLICT_BASE);
            if (inConflict && baseMatch) {
                section = 'base';
                currentConflict.baseLabel = baseMatch[1]?.trim() || 'base';
                continue;
            }

            if (inConflict && this.CONFLICT_SEPARATOR.test(line)) {
                section = 'incoming';
                continue;
            }

            const endMatch = line.match(this.CONFLICT_END);
            if (inConflict && endMatch) {
                currentConflict.endLine = i;
                currentConflict.current = currentLines.join('\n');
                currentConflict.incoming = incomingLines.join('\n');
                currentConflict.incomingLabel = endMatch[1]?.trim() || 'incoming';
                currentConflict.result = '';

                // Add base if diff3 style was used
                if (baseLines.length > 0) {
                    currentConflict.base = baseLines.join('\n');
                }

                conflicts.push(currentConflict as ConflictBlock);

                inConflict = false;
                lastNonConflictEnd = i + 1;
                continue;
            }

            if (inConflict) {
                switch (section) {
                    case 'current':
                        currentLines.push(line);
                        break;
                    case 'base':
                        baseLines.push(line);
                        break;
                    case 'incoming':
                        incomingLines.push(line);
                        break;
                }
            }
        }

        // Warn about unclosed conflicts (missing >>>>>>> marker)
        if (inConflict) {
            console.warn(`VibeMerge: Unclosed conflict detected starting at line ${(currentConflict.startLine ?? 0) + 1}. Missing >>>>>>> marker.`);
        }

        // Add remaining non-conflicting content
        if (lastNonConflictEnd < lines.length) {
            nonConflictingParts.push({
                start: lastNonConflictEnd,
                end: lines.length - 1,
                content: lines.slice(lastNonConflictEnd).join('\n')
            });
        }

        return {
            originalContent: content,
            conflicts,
            nonConflictingParts
        };
    }

    /**
     * Reconstructs the file content from resolved conflicts
     */
    reconstruct(parsed: ParsedConflict): string {
        const lines = parsed.originalContent.split('\n');
        const result: string[] = [];
        let lastEnd = 0;

        for (const conflict of parsed.conflicts) {
            // Add non-conflicting content before this conflict
            if (conflict.startLine > lastEnd) {
                result.push(...lines.slice(lastEnd, conflict.startLine));
            }

            // Add the resolved content (or keep markers if unresolved)
            if (conflict.resolved && conflict.result !== undefined) {
                // Allow empty strings as valid resolutions (user may want to delete both sides)
                if (conflict.result !== '') {
                    result.push(conflict.result);
                }
                // Empty string resolution = delete both sides, don't push anything
            } else {
                // Keep original conflict markers
                result.push(...lines.slice(conflict.startLine, conflict.endLine + 1));
            }

            lastEnd = conflict.endLine + 1;
        }

        // Add remaining content after last conflict
        if (lastEnd < lines.length) {
            result.push(...lines.slice(lastEnd));
        }

        return result.join('\n');
    }
}
