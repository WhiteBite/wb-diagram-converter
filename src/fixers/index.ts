/**
 * Syntax Fixers
 * 
 * Rule-based syntax error detection and fixing for diagram formats
 */

import type { InputFormat } from '../types';
import type { FixResult, FixRule } from '../types/fixer';
import { fixMermaid, getMermaidRules } from './mermaid';
import { fixPlantUML, getPlantUMLRules } from './plantuml';

/** Fix syntax errors in diagram source code */
export function fixSyntax(source: string, format: InputFormat): FixResult {
    switch (format) {
        case 'mermaid':
            return fixMermaid(source);
        case 'plantuml':
            return fixPlantUML(source);
        default:
            // No fixer available — return unchanged
            return {
                success: true,
                original: source,
                fixed: source,
                errors: [],
                suggestions: [],
                appliedFixes: 0,
            };
    }
}

/** Check if fixer is available for format */
export function hasFixerFor(format: InputFormat): boolean {
    return format === 'mermaid' || format === 'plantuml';
}

/** Get all rules for a format (for inspection/testing) */
export function getRulesFor(format: InputFormat): readonly FixRule[] {
    switch (format) {
        case 'mermaid':
            return getMermaidRules();
        case 'plantuml':
            return getPlantUMLRules();
        default:
            return [];
    }
}

// Re-export types
export type { FixResult, FixRule, SyntaxError, FixSuggestion } from '../types/fixer';

// Re-export individual fixers
export { fixMermaid } from './mermaid';
export { fixPlantUML } from './plantuml';
