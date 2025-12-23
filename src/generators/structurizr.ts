/**
 * Structurizr DSL Generator
 * 
 * Generates Structurizr DSL (C4 model) from IR
 */

import type { Diagram } from '../types';

/** Generate Structurizr DSL from IR */
export function generateStructurizr(diagram: Diagram): string {
    const lines: string[] = [];

    lines.push('workspace {');
    lines.push('    model {');

    // Track which nodes are in groups
    const nodesInGroups = new Set<string>();
    for (const group of diagram.groups) {
        for (const childId of group.children) {
            nodesInGroups.add(childId);
        }
    }

    // Generate standalone nodes as software systems or containers
    for (const node of diagram.nodes) {
        if (nodesInGroups.has(node.id)) continue;

        const type = detectStructurizrType(node.shape, node.metadata);
        const indent = '        ';

        if (type === 'person') {
            lines.push(`${indent}${node.id} = person "${node.label}"`);
        } else {
            lines.push(`${indent}${node.id} = softwareSystem "${node.label}"`);
        }
    }

    // Generate groups as software system boundaries
    for (const group of diagram.groups) {
        lines.push(`        ${group.id} = softwareSystem "${group.label || group.id}" {`);

        for (const childId of group.children) {
            const node = diagram.nodes.find(n => n.id === childId);
            if (node) {
                lines.push(`            ${node.id} = container "${node.label}"`);
            }
        }

        lines.push('        }');
    }

    lines.push('');

    // Generate relationships
    for (const edge of diagram.edges) {
        const label = edge.label ? ` "${edge.label}"` : '';
        lines.push(`        ${edge.source} -> ${edge.target}${label}`);
    }

    lines.push('    }');
    lines.push('');

    // Generate views
    lines.push('    views {');
    lines.push('        systemContext * {');
    lines.push('            include *');
    lines.push('            autoLayout');
    lines.push('        }');
    lines.push('    }');

    lines.push('}');

    return lines.join('\n');
}

function detectStructurizrType(shape: string, metadata?: Record<string, unknown>): string {
    if (metadata?.structurizrType) return metadata.structurizrType as string;
    if (shape === 'actor') return 'person';
    if (shape === 'cylinder') return 'container';
    return 'softwareSystem';
}
