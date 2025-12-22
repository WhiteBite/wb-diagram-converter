/**
 * PlantUML syntax fixer
 * 
 * Rule-based fixes for common PlantUML syntax errors
 */

import type { FixRule, FixResult, FixContext } from '../types/fixer';
import { applyRules, isComment, isEmptyLine } from './base';

/** PlantUML-specific fix rules */
const plantumlRules: FixRule[] = [
    // Missing @startuml
    {
        id: 'plantuml/missing-startuml',
        description: 'Missing @startuml declaration',
        pattern: /^(\s*)(\w+|rectangle|actor|database)/,
        fix: (match, line, context) => {
            const prevLines = context.lines.slice(0, context.lineIndex);
            const hasStart = prevLines.some(l => l.trim().startsWith('@startuml'));

            if (hasStart) return line;
            return `@startuml\n${line}`;
        },
        confidence: 'high',
        lineFilter: (line, context) => {
            if (isEmptyLine(line) || isComment(line, ["'", '/', 'note'])) return false;
            if (line.trim().startsWith('@')) return false;

            const prevContent = context.lines
                .slice(0, context.lineIndex)
                .filter(l => !isEmptyLine(l) && !isComment(l, ["'"]));
            return prevContent.length === 0;
        },
    },

    // Missing @enduml at end
    {
        id: 'plantuml/missing-enduml',
        description: 'Missing @enduml at end',
        pattern: /.+/,
        fix: (match, line, context) => {
            // Only check last non-empty line
            const isLast = context.lineIndex === context.lines.length - 1 ||
                context.lines.slice(context.lineIndex + 1).every(l => isEmptyLine(l));

            if (!isLast) return line;

            const hasEnd = context.lines.some(l => l.trim() === '@enduml');
            if (hasEnd) return line;

            const hasStart = context.lines.some(l => l.trim().startsWith('@startuml'));
            if (!hasStart) return line;

            return `${line}\n@enduml`;
        },
        confidence: 'high',
        lineFilter: (line, context) => {
            if (isEmptyLine(line)) return false;
            // Check if this is the last content line
            return context.lines.slice(context.lineIndex + 1).every(l => isEmptyLine(l));
        },
    },

    // Unclosed quote in label
    {
        id: 'plantuml/unclosed-quote',
        description: 'Unclosed quote in label',
        pattern: /"([^"]+)$/,
        fix: (match, line) => {
            return line + '"';
        },
        confidence: 'high',
    },

    // Arrow with wrong syntax: A --> B (extra space in arrow)
    {
        id: 'plantuml/arrow-extra-space',
        description: 'Extra space in arrow',
        pattern: /(\w+)\s*(--\s+>|<\s+--|-\s+-\s*>|<\s*-\s+-|\.+\s+>|<\s+\.+)\s*(\w+)/,
        fix: (match, line) => {
            const [full, source, arrow, target] = match;
            // Normalize arrow
            let fixedArrow = arrow.replace(/\s+/g, '');
            return line.replace(full, `${source} ${fixedArrow} ${target}`);
        },
        confidence: 'high',
    },

    // Single arrow: A -> B (valid but let's suggest -->)
    {
        id: 'plantuml/single-arrow',
        description: 'Consider using --> for clearer diagrams',
        pattern: /(\w+)\s+(->\s*(?!>))\s*(\w+)/,
        fix: () => null, // Just a suggestion, don't auto-fix
        confidence: 'low',
    },

    // Missing 'as' keyword in alias
    {
        id: 'plantuml/missing-as-keyword',
        description: 'Missing "as" keyword for alias',
        pattern: /^(rectangle|actor|database|cloud|component)\s+"([^"]+)"\s+(\w+)\s*$/,
        fix: (match, line) => {
            const [, shape, label, alias] = match;
            return `${shape} "${label}" as ${alias}`;
        },
        confidence: 'medium',
    },

    // Package/rectangle without closing brace
    {
        id: 'plantuml/unclosed-package',
        description: 'Package or rectangle block may be unclosed',
        pattern: /^(package|rectangle|frame|folder)\s+"[^"]+"\s*\{?\s*$/,
        fix: (match, line) => {
            if (!line.trim().endsWith('{')) {
                return line.trimEnd() + ' {';
            }
            return null;
        },
        confidence: 'medium',
    },

    // Skinparam typos
    {
        id: 'plantuml/skinparam-typo',
        description: 'Possible typo in skinparam',
        pattern: /^(skinparm|skinaparam|skinparams)\s+/i,
        fix: (match, line) => {
            return line.replace(match[1], 'skinparam');
        },
        confidence: 'high',
    },

    // Note without 'end note'
    {
        id: 'plantuml/note-multiline',
        description: 'Multi-line note may need "end note"',
        pattern: /^note\s+(left|right|top|bottom)\s*$/i,
        fix: () => null, // Can't auto-fix, just warn
        confidence: 'low',
    },

    // Direction typo
    {
        id: 'plantuml/direction-typo',
        description: 'Invalid direction keyword',
        pattern: /^(left\s+to\s+right|top\s+to\s+bottom)\s+(direction|dir)$/i,
        fix: (match, line) => {
            const dir = match[1].toLowerCase();
            if (dir.includes('left')) {
                return 'left to right direction';
            }
            return 'top to bottom direction';
        },
        confidence: 'high',
    },

    // Colon in label without space
    {
        id: 'plantuml/label-colon-spacing',
        description: 'Add space after colon in edge label',
        pattern: /(\w+)\s*(-->|\.\.>|--)\s*(\w+)\s*:(\S)/,
        fix: (match, line) => {
            const [full, source, arrow, target, firstChar] = match;
            return line.replace(full, `${source} ${arrow} ${target} : ${firstChar}`);
        },
        confidence: 'high',
    },
];

/** Fix PlantUML diagram syntax */
export function fixPlantUML(source: string): FixResult {
    return applyRules(source, plantumlRules, 'plantuml');
}

/** Get all PlantUML fix rules (for testing/inspection) */
export function getPlantUMLRules(): readonly FixRule[] {
    return plantumlRules;
}
