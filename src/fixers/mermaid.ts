/**
 * Mermaid syntax fixer
 * 
 * Rule-based fixes for common Mermaid syntax errors
 */

import type { FixRule, FixResult, FixContext } from '../types/fixer';
import { applyRules, findUnclosedPairs, isComment, isEmptyLine } from './base';

/** Mermaid-specific fix rules */
const mermaidRules: FixRule[] = [
    // Invalid graph direction
    {
        id: 'mermaid/invalid-direction',
        description: 'Invalid graph direction, should be TB, BT, LR, RL, or TD',
        pattern: /^(graph|flowchart)\s+(?!(TB|BT|LR|RL|TD)\s*$)(\S+)/i,
        fix: (match, line) => {
            const keyword = match[1];
            const direction = match[3]?.toUpperCase();

            // Try to fix common typos
            const fixes: Record<string, string> = {
                'TBD': 'TD',
                'T': 'TB',
                'L': 'LR',
                'R': 'RL',
                'B': 'BT',
                'DOWN': 'TB',
                'UP': 'BT',
                'LEFT': 'RL',
                'RIGHT': 'LR',
            };

            const fixed = fixes[direction] || 'TD';
            return `${keyword} ${fixed}`;
        },
        confidence: 'high',
    },

    // Missing graph declaration
    {
        id: 'mermaid/missing-header',
        description: 'Missing flowchart/graph declaration',
        pattern: /^(\s*)(\w+)(\[|\(|\{)/,
        fix: (match, line, context) => {
            // Only apply if this is the first non-empty, non-comment line
            const prevLines = context.lines.slice(0, context.lineIndex);
            const hasHeader = prevLines.some(l =>
                /^(graph|flowchart|sequenceDiagram|classDiagram)/i.test(l.trim())
            );

            if (hasHeader) return line; // No fix needed
            return `flowchart TD\n${line}`;
        },
        confidence: 'medium',
        lineFilter: (line, context) => {
            if (isEmptyLine(line) || isComment(line, ['%%'])) return false;
            // Only check first content line
            const prevContent = context.lines
                .slice(0, context.lineIndex)
                .filter(l => !isEmptyLine(l) && !isComment(l, ['%%']));
            return prevContent.length === 0;
        },
    },

    // Unclosed square bracket in node
    {
        id: 'mermaid/unclosed-bracket',
        description: 'Unclosed square bracket in node definition',
        pattern: /(\w+)\[([^\]]+)$/,
        fix: (match, line) => {
            return line + ']';
        },
        confidence: 'high',
    },

    // Unclosed parenthesis in node
    {
        id: 'mermaid/unclosed-paren',
        description: 'Unclosed parenthesis in node definition',
        pattern: /(\w+)\(([^)]+)$/,
        fix: (match, line) => {
            return line + ')';
        },
        confidence: 'high',
    },

    // Unclosed curly brace in node
    {
        id: 'mermaid/unclosed-brace',
        description: 'Unclosed curly brace in node definition',
        pattern: /(\w+)\{([^}]+)$/,
        fix: (match, line) => {
            return line + '}';
        },
        confidence: 'high',
    },

    // Double brackets not closed [[text]
    {
        id: 'mermaid/unclosed-double-bracket',
        description: 'Unclosed double bracket in node definition',
        pattern: /(\w+)\[\[([^\]]+)\]?$/,
        fix: (match, line) => {
            if (line.endsWith(']')) {
                return line + ']';
            }
            return line + ']]';
        },
        confidence: 'high',
    },

    // Arrow with wrong spacing: A-- >B or A< --B
    {
        id: 'mermaid/arrow-spacing',
        description: 'Invalid spacing in arrow',
        pattern: /(\w+[\]\)\}]?)\s*(--\s+>|<\s+--|-\s*-\s*>|<\s*-\s*-)\s*(\w+)/,
        fix: (match, line) => {
            const [full, source, arrow, target] = match;
            const fixedArrow = arrow.includes('<') ? '<--' : '-->';
            return line.replace(full, `${source} ${fixedArrow} ${target}`);
        },
        confidence: 'high',
    },

    // Single dash arrow: A -> B (should be -->)
    {
        id: 'mermaid/single-dash-arrow',
        description: 'Single dash arrow should be double dash',
        pattern: /(\w+[\]\)\}]?)\s*(->\s*(?!\|))\s*(\w+)/,
        fix: (match, line) => {
            const [full, source, , target] = match;
            return line.replace(full, `${source} --> ${target}`);
        },
        confidence: 'medium',
    },

    // Missing pipe in label: A -->text B (should be A -->|text| B)
    {
        id: 'mermaid/missing-label-pipes',
        description: 'Edge label should be wrapped in pipes',
        pattern: /(\w+[\]\)\}]?)\s*(-->|---|-\.->|==>)\s*([a-zA-Z][a-zA-Z0-9\s]+[a-zA-Z])\s+(\w+[\[\(\{]?)/,
        fix: (match, line) => {
            const [full, source, arrow, label, target] = match;
            // Only fix if label looks like text (not a node id)
            if (/^[A-Z][a-z]/.test(label) || label.includes(' ')) {
                return line.replace(full, `${source} ${arrow}|${label.trim()}| ${target}`);
            }
            return null;
        },
        confidence: 'low',
    },

    // Unclosed label pipe: A -->|text B
    {
        id: 'mermaid/unclosed-label-pipe',
        description: 'Unclosed pipe in edge label',
        pattern: /(-->|---|-\.->|==>)\|([^|]+)\s+(\w+)/,
        fix: (match, line) => {
            const [full, arrow, label, target] = match;
            return line.replace(full, `${arrow}|${label}| ${target}`);
        },
        confidence: 'high',
    },

    // Subgraph without ID
    {
        id: 'mermaid/subgraph-no-id',
        description: 'Subgraph should have an ID',
        pattern: /^(\s*)subgraph\s*$/i,
        fix: (match) => {
            return `${match[1]}subgraph group1`;
        },
        confidence: 'medium',
    },

    // Lowercase 'end' for subgraph (should work but let's normalize)
    {
        id: 'mermaid/subgraph-end-case',
        description: 'Normalize subgraph end keyword',
        pattern: /^(\s*)END\s*$/,
        fix: (match) => `${match[1]}end`,
        confidence: 'high',
    },

    // Style with missing colon
    {
        id: 'mermaid/style-missing-colon',
        description: 'Style property missing colon',
        pattern: /^style\s+\w+\s+(\w+)\s+(#[0-9a-fA-F]+|\w+)/,
        fix: (match, line) => {
            const [, prop, value] = match;
            // Check if there's no colon between prop and value
            if (!line.includes(`${prop}:`)) {
                return line.replace(`${prop} ${value}`, `${prop}:${value}`);
            }
            return null;
        },
        confidence: 'high',
    },
];

/** Fix Mermaid diagram syntax */
export function fixMermaid(source: string): FixResult {
    return applyRules(source, mermaidRules, 'mermaid');
}

/** Get all Mermaid fix rules (for testing/inspection) */
export function getMermaidRules(): readonly FixRule[] {
    return mermaidRules;
}
