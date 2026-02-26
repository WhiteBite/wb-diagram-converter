/**
 * Mermaid ER Diagram Generator
 * 
 * Generates Mermaid erDiagram syntax from IR
 * 
 * Output example:
 *   erDiagram
 *     CUSTOMER ||--o{ ORDER : places
 *     CUSTOMER {
 *       string name
 *       string custNumber PK
 *     }
 */

import type { Diagram, DiagramNode, DiagramEdge } from '../types';
import type {
    IRAttribute,
    ERCardinality,
    ERIdentifying,
} from '../types/er';
import { generateLeftCardinality, generateRightCardinality } from '../types/er';

// =============================================================================
// Generator
// =============================================================================

/** Generate Mermaid erDiagram from IR */
export function generateERDiagram(diagram: Diagram): string {
    const lines: string[] = ['erDiagram'];

    // Generate relationships first (they define the structure)
    for (const edge of diagram.edges) {
        const relationshipLine = generateRelationship(edge);
        if (relationshipLine) {
            lines.push(`    ${relationshipLine}`);
        }
    }

    // Add empty line before entity definitions
    if (diagram.edges.length > 0 && hasEntityWithAttributes(diagram.nodes)) {
        lines.push('');
    }

    // Generate entity definitions with attributes
    for (const node of diagram.nodes) {
        const entityLines = generateEntity(node);
        if (entityLines.length > 0) {
            lines.push(...entityLines.map(l => `    ${l}`));
        }
    }

    return lines.join('\n');
}

/** Check if any node has attributes */
function hasEntityWithAttributes(nodes: DiagramNode[]): boolean {
    return nodes.some(node => {
        const attrs = node.metadata?.attributes as IRAttribute[] | undefined;
        return attrs && attrs.length > 0;
    });
}

/** Generate relationship line from edge */
function generateRelationship(edge: DiagramEdge): string | null {
    // Extract cardinality from metadata or use defaults
    const sourceCardinality = (edge.metadata?.sourceCardinality as ERCardinality) || 'exactly-one';
    const targetCardinality = (edge.metadata?.targetCardinality as ERCardinality) || 'exactly-one';
    const identifying = (edge.metadata?.identifying as ERIdentifying) || 'identifying';

    // Build cardinality symbols
    const leftSymbol = generateLeftCardinality(sourceCardinality);
    const rightSymbol = generateRightCardinality(targetCardinality);
    const lineSymbol = identifying === 'identifying' ? '--' : '..';

    // Sanitize entity names
    const sourceId = sanitizeERId(edge.source);
    const targetId = sanitizeERId(edge.target);

    // Build label
    const label = edge.label ? formatLabel(edge.label) : 'relates';

    return `${sourceId} ${leftSymbol}${lineSymbol}${rightSymbol} ${targetId} : ${label}`;
}

/** Generate entity definition with attributes */
function generateEntity(node: DiagramNode): string[] {
    const attrs = node.metadata?.attributes as IRAttribute[] | undefined;

    // Skip entities without attributes (they're defined by relationships)
    if (!attrs || attrs.length === 0) {
        return [];
    }

    const lines: string[] = [];
    const entityId = sanitizeERId(node.id);

    lines.push(`${entityId} {`);

    for (const attr of attrs) {
        lines.push(`    ${generateAttribute(attr)}`);
    }

    lines.push('}');

    return lines;
}

/** Generate attribute line */
function generateAttribute(attr: IRAttribute): string {
    let line = `${sanitizeType(attr.type)} ${sanitizeName(attr.name)}`;

    if (attr.keyType) {
        line += ` ${attr.keyType}`;
    }

    if (attr.comment) {
        line += ` "${escapeQuotes(attr.comment)}"`;
    }

    return line;
}

// =============================================================================
// Utility Functions
// =============================================================================

/** Sanitize entity ID for Mermaid ER syntax */
function sanitizeERId(id: string): string {
    // Replace spaces and special chars with hyphens
    let safe = id.replace(/[^a-zA-Z0-9_-]/g, '-');

    // Remove consecutive hyphens
    safe = safe.replace(/-+/g, '-');

    // Remove leading/trailing hyphens
    safe = safe.replace(/^-|-$/g, '');

    // Ensure starts with letter
    if (!/^[a-zA-Z]/.test(safe)) {
        safe = 'E_' + safe;
    }

    // Convert to uppercase (ER convention)
    return safe.toUpperCase();
}

/** Sanitize attribute type */
function sanitizeType(type: string): string {
    // Common type mappings
    const typeMap: Record<string, string> = {
        'integer': 'int',
        'varchar': 'string',
        'text': 'string',
        'boolean': 'bool',
        'datetime': 'datetime',
        'timestamp': 'datetime',
        'decimal': 'float',
        'double': 'float',
    };

    const lower = type.toLowerCase();
    return typeMap[lower] || lower;
}

/** Sanitize attribute name */
function sanitizeName(name: string): string {
    // Remove special characters, keep alphanumeric and underscore
    return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

/** Format relationship label */
function formatLabel(label: string): string {
    // If label contains spaces or special chars, quote it
    if (/[^a-zA-Z0-9_-]/.test(label)) {
        return `"${escapeQuotes(label)}"`;
    }
    return label;
}

/** Escape quotes in string */
function escapeQuotes(str: string): string {
    return str.replace(/"/g, '\\"');
}

// =============================================================================
// Conversion from Generic Diagram
// =============================================================================

/**
 * Convert a generic flowchart diagram to ER format
 * 
 * This is useful when the source diagram wasn't originally an ER diagram
 * but should be output as one.
 */
export function convertToERFormat(diagram: Diagram): Diagram {
    // Clone the diagram with ER type
    return {
        ...diagram,
        type: 'er',
        nodes: diagram.nodes.map(node => ({
            ...node,
            metadata: {
                ...node.metadata,
                entityType: 'er-entity',
                // Try to extract attributes from label if multiline
                attributes: extractAttributesFromLabel(node.label),
            },
        })),
        edges: diagram.edges.map(edge => ({
            ...edge,
            metadata: {
                ...edge.metadata,
                relationshipType: 'er-relationship',
                sourceCardinality: inferCardinality(edge, 'source'),
                targetCardinality: inferCardinality(edge, 'target'),
                identifying: edge.arrow.lineType === 'dashed' ? 'non-identifying' : 'identifying',
            },
        })),
    };
}

/** Extract attributes from multiline label */
function extractAttributesFromLabel(label: string): IRAttribute[] {
    const lines = label.split('\n');

    // First line is entity name, rest are attributes
    if (lines.length <= 1) {
        return [];
    }

    const attrs: IRAttribute[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Try to parse "type name [PK|FK|UK]"
        const match = line.match(/^(\w+)\s+(\w+)(?:\s+(PK|FK|UK))?/i);
        if (match) {
            const keyTypeRaw = match[3]?.toLowerCase() as 'pk' | 'fk' | 'uk' | undefined;
            attrs.push({
                name: match[2],
                type: match[1],
                keyType: keyTypeRaw,
            });
        } else {
            // Fallback: treat whole line as attribute name
            attrs.push({
                name: line.replace(/[^a-zA-Z0-9_]/g, '_'),
                type: 'string',
            });
        }
    }

    return attrs;
}

/** Infer cardinality from edge arrow type */
function inferCardinality(edge: DiagramEdge, side: 'source' | 'target'): ERCardinality {
    const arrowType = side === 'source' ? edge.arrow.sourceType : edge.arrow.targetType;

    switch (arrowType) {
        case 'circle':
        case 'circle-filled':
            return 'zero-or-more';
        case 'diamond':
        case 'diamond-filled':
            return 'zero-or-one';
        case 'arrow':
        case 'open':
            return 'one-or-more';
        default:
            return 'exactly-one';
    }
}
