/**
 * Structurizr DSL Generator
 *
 * Generates Structurizr DSL (C4 model) from IR
 */

import type { Diagram } from '../types';

/** Generate Structurizr DSL from IR */
export function generateStructurizr(diagram: Diagram): string {
    const lines: string[] = [];
    const identifierMap = buildIdentifierMap(diagram);

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
        const safeNodeId = identifierMap.get(node.id)!;

        if (type === 'person') {
            lines.push(`${indent}${safeNodeId} = person "${node.label}"`);
        } else {
            lines.push(`${indent}${safeNodeId} = softwareSystem "${node.label}"`);
        }
    }

    // Generate groups as software system boundaries
    for (const group of diagram.groups) {
        const safeGroupId = identifierMap.get(group.id)!;
        lines.push(`        ${safeGroupId} = softwareSystem "${group.label || group.id}" {`);

        for (const childId of group.children) {
            const node = diagram.nodes.find(n => n.id === childId);
            if (node) {
                const safeNodeId = identifierMap.get(node.id)!;
                lines.push(`            ${safeNodeId} = container "${node.label}"`);
            }
        }

        lines.push('        }');
    }

    lines.push('');

    // Generate relationships
    for (const edge of diagram.edges) {
        const safeSourceId =
            identifierMap.get(edge.source) ?? sanitizeStructurizrIdentifier(edge.source);
        const safeTargetId =
            identifierMap.get(edge.target) ?? sanitizeStructurizrIdentifier(edge.target);
        const label = edge.label ? ` "${edge.label}"` : '';
        lines.push(`        ${safeSourceId} -> ${safeTargetId}${label}`);
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

function buildIdentifierMap(diagram: Diagram): Map<string, string> {
    const allIds = [
        ...diagram.groups.map(group => group.id),
        ...diagram.nodes.map(node => node.id),
    ];

    const map = new Map<string, string>();
    const used = new Set<string>();

    for (const id of allIds) {
        const base = sanitizeStructurizrIdentifier(id);
        let candidate = base;
        let suffix = 1;

        while (used.has(candidate)) {
            candidate = `${base}_${suffix++}`;
        }

        used.add(candidate);
        map.set(id, candidate);
    }

    return map;
}

function sanitizeStructurizrIdentifier(id: string): string {
    let safe = id.replace(/[^a-zA-Z0-9_]/g, '_');

    if (!safe) safe = 'n';
    if (!/^[a-zA-Z_]/.test(safe)) {
        safe = `n_${safe}`;
    }

    return safe;
}

function detectStructurizrType(shape: string, metadata?: Record<string, unknown>): string {
    if (metadata?.structurizrType) return metadata.structurizrType as string;
    if (shape === 'actor') return 'person';
    if (shape === 'cylinder') return 'container';
    return 'softwareSystem';
}
