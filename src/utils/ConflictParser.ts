export interface ConflictBlock {
    startLine: number;
    endLine: number;
    current: string;      // Content from current branch (between <<<<<<< and =======)
    incoming: string;     // Content from incoming branch (between ======= and >>>>>>>)
    currentLabel: string; // Label after <<<<<<< (e.g., HEAD)
    incomingLabel: string; // Label after >>>>>>> (e.g., feature-branch)
    result: string;       // The resolved content
    resolved: boolean;
}

export interface ParsedConflict {
    originalContent: string;
    conflicts: ConflictBlock[];
    nonConflictingParts: { start: number; end: number; content: string }[];
}

export class ConflictParser {
    private readonly CONFLICT_START = /^<{7}\s*(.*)$/;
    private readonly CONFLICT_SEPARATOR = /^={7}$/;
    private readonly CONFLICT_END = /^>{7}\s*(.*)$/;

    parse(content: string): ParsedConflict {
        const lines = content.split('\n');
        const conflicts: ConflictBlock[] = [];
        const nonConflictingParts: { start: number; end: number; content: string }[] = [];

        let inConflict = false;
        let inCurrentSection = false;
        let currentConflict: Partial<ConflictBlock> = {};
        let currentLines: string[] = [];
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
                inCurrentSection = true;
                currentConflict = {
                    startLine: i,
                    currentLabel: startMatch[1] || 'HEAD',
                    resolved: false
                };
                currentLines = [];
                incomingLines = [];
                continue;
            }

            if (inConflict && this.CONFLICT_SEPARATOR.test(line)) {
                inCurrentSection = false;
                continue;
            }

            const endMatch = line.match(this.CONFLICT_END);
            if (inConflict && endMatch) {
                currentConflict.endLine = i;
                currentConflict.current = currentLines.join('\n');
                currentConflict.incoming = incomingLines.join('\n');
                currentConflict.incomingLabel = endMatch[1] || 'incoming';
                currentConflict.result = '';

                conflicts.push(currentConflict as ConflictBlock);

                inConflict = false;
                lastNonConflictEnd = i + 1;
                continue;
            }

            if (inConflict) {
                if (inCurrentSection) {
                    currentLines.push(line);
                } else {
                    incomingLines.push(line);
                }
            }
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
                if (conflict.result.trim() !== '') {
                    result.push(conflict.result);
                }
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
