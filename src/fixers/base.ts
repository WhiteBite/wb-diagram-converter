/**
 * Base utilities for syntax fixers
 */

import type {
    FixRule,
    FixResult,
    FixContext,
    SyntaxError,
    FixSuggestion
} from '../types/fixer';

/** Apply fix rules to source code */
export function applyRules(source: string, rules: FixRule[], format: FixContext['format']): FixResult {
    const lines = source.split('\n');
    const errors: SyntaxError[] = [];
    const suggestions: FixSuggestion[] = [];
    const fixedLines: string[] = [];
    let appliedFixes = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const context: FixContext = {
            lines,
            lineIndex: i,
            format,
            fullSource: source,
        };

        let currentLine = line;
        let lineFixed = false;

        for (const rule of rules) {
            // Skip if line filter doesn't match
            if (rule.lineFilter && !rule.lineFilter(currentLine, context)) {
                continue;
            }

            const match = currentLine.match(rule.pattern);
            if (!match) continue;

            const fixed = rule.fix(match, currentLine, context);

            if (fixed !== null && fixed !== currentLine) {
                suggestions.push({
                    ruleId: rule.id,
                    description: rule.description,
                    original: currentLine,
                    fixed,
                    line: i + 1,
                    confidence: rule.confidence,
                });

                // Auto-apply high confidence fixes
                if (rule.confidence === 'high') {
                    currentLine = fixed;
                    lineFixed = true;
                    appliedFixes++;
                }
            } else if (fixed === null) {
                // Rule matched but couldn't fix — report as error
                errors.push({
                    line: i + 1,
                    column: match.index,
                    message: rule.description,
                    severity: 'error',
                    ruleId: rule.id,
                });
            }
        }

        fixedLines.push(currentLine);
    }

    const fixed = fixedLines.join('\n');

    return {
        success: errors.length === 0,
        original: source,
        fixed,
        errors,
        suggestions,
        appliedFixes,
    };
}

/** Check for unclosed brackets/quotes */
export function findUnclosedPairs(
    line: string,
    pairs: Array<[string, string]>
): Array<{ open: string; close: string; position: number }> {
    const unclosed: Array<{ open: string; close: string; position: number }> = [];

    for (const [open, close] of pairs) {
        let depth = 0;
        let lastOpenPos = -1;

        for (let i = 0; i < line.length; i++) {
            if (line[i] === open) {
                if (depth === 0) lastOpenPos = i;
                depth++;
            } else if (line[i] === close) {
                depth--;
            }
        }

        if (depth > 0 && lastOpenPos !== -1) {
            unclosed.push({ open, close, position: lastOpenPos });
        }
    }

    return unclosed;
}

/** Count occurrences of a character in string */
export function countChar(str: string, char: string): number {
    let count = 0;
    for (const c of str) {
        if (c === char) count++;
    }
    return count;
}

/** Check if line is a comment */
export function isComment(line: string, commentPrefixes: string[]): boolean {
    const trimmed = line.trim();
    return commentPrefixes.some(prefix => trimmed.startsWith(prefix));
}

/** Check if line is empty or whitespace only */
export function isEmptyLine(line: string): boolean {
    return line.trim().length === 0;
}
