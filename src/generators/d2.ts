/**
 * D2 Generator
 * 
 * Generates D2 diagram code from IR
 */

import type { Diagram, DiagramEdge, ArrowConfig } from '../types';

/** Generate D2 code from IR */
export function generateD2(diagram: Diagram): string {
    const lines: string[] = [];
    const direction = (diagram.metadata?.direction as string) || 'right';

    // Direction directive
    if (direction === 'TB' || direction === 'down') {
        lines.push('direction: down');
    } else if (direction === 'BT' || direction === 'up') {
        lines.push('direction: up');
    } else if (direction === 'RL' || direction === 'left') {
        lines.push('direction: left');
    }
    // Default is right (LR)

    if (lines.length > 0) lines.push('');

    // Track which nodes are in groups
    const nodesInGroups = new Set<string>();
    for (const group of diagram.groups) {
        for (const childId of group.children) {
            nodesInGroups.add(childId);
        }
    }

    // Generate groups with their nodes
    for (const group of diagram.groups) {
        lines.push(`${group.id}: ${group.label || group.id} {`);

        for (const childId of group.children) {
            const node = diagram.nodes.find(n => n.id === childId);
            if (node) {
                const shape = mapShapeToD2(node.shape);
                if (shape) {
                    lines.push(`  ${node.id}: ${node.label} { shape: ${shape} }`);
                } else {
                    lines.push(`  ${node.id}: ${node.label}`);
                }
            }
        }

        lines.push('}');
        lines.push('');
    }

    // Generate standalone nodes
    for (const node of diagram.nodes) {
        if (nodesInGroups.has(node.id)) continue;

        const shape = mapShapeToD2(node.shape);
        if (shape) {
            lines.push(`${node.id}: ${node.label} { shape: ${shape} }`);
        } else {
            lines.push(`${node.id}: ${node.label}`);
        }
    }

    if (diagram.nodes.length > 0) lines.push('');

    // Generate edges
    for (const edge of diagram.edges) {
        const arrow = generateD2Arrow(edge.arrow);
        if (edge.label) {
            lines.push(`${edge.source} ${arrow} ${edge.target}: ${edge.label}`);
        } else {
            lines.push(`${edge.source} ${arrow} ${edge.target}`);
        }
    }

    return lines.join('\n');
}

function mapShapeToD2(shape: string): string | null {
    const shapeMap: Record<string, string> = {
        'rectangle': 'rectangle',
        'rounded-rectangle': 'rectangle',
        'circle': 'circle',
        'ellipse': 'oval',
        'diamond': 'diamond',
        'hexagon': 'hexagon',
        'cylinder': 'cylinder',
        'cloud': 'cloud',
        'parallelogram': 'parallelogram',
        'document': 'document',
        'actor': 'person',
    };
    return shapeMap[shape] || null;
}

function generateD2Arrow(arrow: ArrowConfig): string {
    const hasSource = arrow.sourceType !== 'none';
    const hasTarget = arrow.targetType !== 'none';

    if (arrow.lineType === 'dashed') {
        if (hasSource && hasTarget) return '<-->';
        if (hasSource) return '<--';
        return '-->';
    }

    if (hasSource && hasTarget) return '<->';
    if (hasSource) return '<-';
    if (!hasTarget) return '--';
    return '->';
}
