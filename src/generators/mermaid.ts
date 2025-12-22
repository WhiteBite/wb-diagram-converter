/**
 * Mermaid generator
 * 
 * Generates Mermaid flowchart syntax from IR
 */

import type { Diagram, DiagramNode, DiagramEdge, DiagramGroup, ArrowConfig, NodeStyle } from '../types';
import { generateMermaidShape } from '../utils';

/** Generate Mermaid diagram from IR */
export function generateMermaid(diagram: Diagram): string {
    const lines: string[] = [];
    const direction = (diagram.metadata?.direction as string) || 'TB';

    // Header
    lines.push(`flowchart ${direction}`);

    // Track which nodes are in groups
    const nodesInGroups = new Set<string>();
    for (const group of diagram.groups) {
        for (const childId of group.children) {
            nodesInGroups.add(childId);
        }
    }

    // Generate groups with their nodes
    for (const group of diagram.groups) {
        lines.push(...generateGroup(group, diagram.nodes, direction));
    }

    // Generate standalone nodes (not in groups)
    for (const node of diagram.nodes) {
        if (!nodesInGroups.has(node.id)) {
            lines.push(`    ${generateNodeDefinition(node)}`);
        }
    }

    // Generate edges
    for (const edge of diagram.edges) {
        lines.push(`    ${generateEdge(edge)}`);
    }

    // Generate classDef and class assignments
    const { classDefs, classAssignments } = generateClassDefs(diagram.nodes);
    if (classDefs.length > 0) {
        lines.push('');
        lines.push(...classDefs);
        lines.push(...classAssignments);
    }

    return lines.join('\n');
}

/** Generate group (subgraph) with optional direction */
function generateGroup(group: DiagramGroup, nodes: DiagramNode[], parentDirection: string): string[] {
    const lines: string[] = [];
    const label = group.label || group.id;

    // Check if group has its own direction in metadata
    const groupDirection = (group.metadata?.direction as string) || '';

    lines.push(`    subgraph ${group.id}[${label}]`);

    // Add direction directive if different from parent
    if (groupDirection && groupDirection !== parentDirection) {
        lines.push(`        direction ${groupDirection}`);
    }

    // Add nodes in this group
    for (const childId of group.children) {
        const node = nodes.find(n => n.id === childId);
        if (node) {
            lines.push(`        ${generateNodeDefinition(node)}`);
        }
    }

    lines.push('    end');

    return lines;
}

/** Generate node definition: A[Label] */
function generateNodeDefinition(node: DiagramNode): string {
    return `${node.id}${generateMermaidShape(node.shape, node.label)}`;
}

/** Generate edge: A -->|label| B */
function generateEdge(edge: DiagramEdge): string {
    const arrow = generateMermaidArrow(edge.arrow);

    if (edge.label) {
        return `${edge.source} ${arrow}|${edge.label}| ${edge.target}`;
    }

    return `${edge.source} ${arrow} ${edge.target}`;
}

/** Generate Mermaid arrow syntax from ArrowConfig */
function generateMermaidArrow(arrow: ArrowConfig): string {
    let result = '';

    // Source arrow head
    if (arrow.sourceType === 'arrow') result += '<';
    else if (arrow.sourceType === 'circle') result += 'o';
    else if (arrow.sourceType === 'cross') result += 'x';

    // Line type
    if (arrow.lineType === 'dashed') {
        result += '-.';
    } else if (arrow.lineType === 'dotted') {
        result += '..';
    } else {
        result += '--';
    }

    // Target arrow head
    if (arrow.targetType === 'arrow') result += '>';
    else if (arrow.targetType === 'circle') result += 'o';
    else if (arrow.targetType === 'cross') result += 'x';
    else if (arrow.lineType === 'dashed') result += '-';

    // Ensure valid arrow
    if (result === '--') result = '---';
    if (result === '-.-') result = '-.-';

    return result;
}

/** Generate classDef definitions and class assignments */
function generateClassDefs(nodes: DiagramNode[]): { classDefs: string[]; classAssignments: string[] } {
    const classDefs: string[] = [];
    const classAssignments: string[] = [];

    // Group nodes by style signature
    const styleGroups = new Map<string, { style: NodeStyle; nodeIds: string[] }>();

    for (const node of nodes) {
        if (!hasCustomStyle(node.style)) continue;

        const signature = getStyleSignature(node.style);

        if (!styleGroups.has(signature)) {
            styleGroups.set(signature, { style: node.style, nodeIds: [] });
        }
        styleGroups.get(signature)!.nodeIds.push(node.id);
    }

    // Generate classDef for each unique style
    let classIndex = 0;
    for (const [, { style, nodeIds }] of styleGroups) {
        // Only create classDef if multiple nodes share the style
        if (nodeIds.length >= 2) {
            const className = `style${classIndex++}`;
            const styleStr = generateStyleString(style);
            classDefs.push(`    classDef ${className} ${styleStr}`);
            classAssignments.push(`    class ${nodeIds.join(',')} ${className}`);
        } else {
            // Single node - use inline style
            const styleStr = generateStyleString(style);
            classDefs.push(`    style ${nodeIds[0]} ${styleStr}`);
        }
    }

    return { classDefs, classAssignments };
}

/** Check if style has any custom values */
function hasCustomStyle(style: NodeStyle): boolean {
    return !!(style.fill || style.stroke || style.strokeWidth || style.fontColor);
}

/** Generate unique signature for style */
function getStyleSignature(style: NodeStyle): string {
    return JSON.stringify({
        fill: style.fill,
        stroke: style.stroke,
        strokeWidth: style.strokeWidth,
        fontColor: style.fontColor,
    });
}

/** Generate Mermaid style string */
function generateStyleString(style: NodeStyle): string {
    const parts: string[] = [];

    if (style.fill) parts.push(`fill:${style.fill}`);
    if (style.stroke) parts.push(`stroke:${style.stroke}`);
    if (style.strokeWidth) parts.push(`stroke-width:${style.strokeWidth}px`);
    if (style.fontColor) parts.push(`color:${style.fontColor}`);

    return parts.join(',');
}
