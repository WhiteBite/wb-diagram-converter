/**
 * Graphviz DOT generator
 * 
 * Generates DOT language from IR
 */

import type { Diagram, DiagramNode, DiagramEdge, DiagramGroup, NodeShape, ArrowConfig } from '../types';

/** Generate DOT from IR diagram */
export function generateDot(diagram: Diagram): string {
    const lines: string[] = [];
    const direction = (diagram.metadata?.direction as string) || 'TB';

    // Header
    lines.push('digraph G {');

    // Graph attributes
    lines.push(`    rankdir=${direction};`);
    lines.push('    node [fontname="Arial", fontsize=12];');
    lines.push('    edge [fontname="Arial", fontsize=10];');
    lines.push('');

    // Track nodes in groups
    const nodesInGroups = new Set<string>();
    for (const group of diagram.groups) {
        for (const childId of group.children) {
            nodesInGroups.add(childId);
        }
    }

    // Generate groups (subgraphs)
    for (const group of diagram.groups) {
        lines.push(...generateSubgraph(group, diagram.nodes));
        lines.push('');
    }

    // Generate standalone nodes
    for (const node of diagram.nodes) {
        if (!nodesInGroups.has(node.id)) {
            lines.push(`    ${generateNodeDef(node)}`);
        }
    }

    if (diagram.nodes.some(n => !nodesInGroups.has(n.id))) {
        lines.push('');
    }

    // Generate edges
    for (const edge of diagram.edges) {
        lines.push(`    ${generateEdgeDef(edge)}`);
    }

    lines.push('}');

    return lines.join('\n');
}

/** Generate subgraph for group */
function generateSubgraph(group: DiagramGroup, nodes: DiagramNode[]): string[] {
    const lines: string[] = [];
    const label = group.label || group.id;

    lines.push(`    subgraph cluster_${sanitizeId(group.id)} {`);
    lines.push(`        label="${escapeString(label)}";`);

    if (group.style.fill) {
        lines.push(`        style=filled;`);
        lines.push(`        fillcolor="${group.style.fill}";`);
    }

    // Add nodes in group
    for (const childId of group.children) {
        const node = nodes.find(n => n.id === childId);
        if (node) {
            lines.push(`        ${generateNodeDef(node)}`);
        }
    }

    lines.push('    }');

    return lines;
}

/** Generate node definition */
function generateNodeDef(node: DiagramNode): string {
    const attrs: string[] = [];

    // Label
    attrs.push(`label="${escapeString(node.label)}"`);

    // Shape
    const shape = mapIRShapeToDot(node.shape);
    if (shape !== 'box') {
        attrs.push(`shape=${shape}`);
    }

    // Style
    if (node.style.fill) {
        attrs.push('style=filled');
        attrs.push(`fillcolor="${node.style.fill}"`);
    }
    if (node.style.stroke) {
        attrs.push(`color="${node.style.stroke}"`);
    }
    if (node.style.fontColor) {
        attrs.push(`fontcolor="${node.style.fontColor}"`);
    }

    return `${sanitizeId(node.id)} [${attrs.join(', ')}];`;
}

/** Generate edge definition */
function generateEdgeDef(edge: DiagramEdge): string {
    const attrs: string[] = [];

    // Label
    if (edge.label) {
        attrs.push(`label="${escapeString(edge.label)}"`);
    }

    // Arrow direction
    const dir = getArrowDir(edge.arrow);
    if (dir !== 'forward') {
        attrs.push(`dir=${dir}`);
    }

    // Line style
    if (edge.arrow.lineType === 'dashed') {
        attrs.push('style=dashed');
    } else if (edge.arrow.lineType === 'dotted') {
        attrs.push('style=dotted');
    }

    // Color
    if (edge.style.stroke) {
        attrs.push(`color="${edge.style.stroke}"`);
    }

    const attrStr = attrs.length > 0 ? ` [${attrs.join(', ')}]` : '';
    return `${sanitizeId(edge.source)} -> ${sanitizeId(edge.target)}${attrStr};`;
}

/** Map IR shape to DOT shape */
function mapIRShapeToDot(shape: NodeShape): string {
    const shapeMap: Record<NodeShape, string> = {
        'rectangle': 'box',
        'rounded-rectangle': 'box',
        'circle': 'circle',
        'ellipse': 'ellipse',
        'diamond': 'diamond',
        'hexagon': 'hexagon',
        'parallelogram': 'parallelogram',
        'trapezoid': 'trapezium',
        'cylinder': 'cylinder',
        'document': 'note',
        'cloud': 'ellipse',
        'actor': 'box',
        'note': 'note',
        'custom': 'box',
    };

    return shapeMap[shape] || 'box';
}

/** Get DOT arrow direction */
function getArrowDir(arrow: ArrowConfig): string {
    const hasSource = arrow.sourceType !== 'none';
    const hasTarget = arrow.targetType !== 'none';

    if (hasSource && hasTarget) return 'both';
    if (hasSource && !hasTarget) return 'back';
    if (!hasSource && !hasTarget) return 'none';
    return 'forward';
}

/** Sanitize ID for DOT */
function sanitizeId(id: string): string {
    // If ID contains special chars, quote it
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(id)) {
        return id;
    }
    return `"${escapeString(id)}"`;
}

/** Escape string for DOT */
function escapeString(str: string): string {
    return str
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n');
}
