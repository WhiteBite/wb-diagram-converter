/**
 * Draw.io (diagrams.net) generator
 * 
 * Generates mxGraph XML format from IR with beautiful modern styling
 */

import type { Diagram, DiagramNode, DiagramEdge, DiagramGroup, NodeShape } from '../types';
import { escapeXml, DRAWIO_SHAPE_MAP, generateDrawioArrowStyle } from '../utils';

// =============================================================================
// Beautiful Color Palettes for Draw.io
// =============================================================================

/** Modern color palette by shape type */
const SHAPE_COLORS: Record<NodeShape, { fill: string; stroke: string; fontColor: string }> = {
    'rectangle': { fill: '#dae8fc', stroke: '#6c8ebf', fontColor: '#1a1a1a' },
    'rounded-rectangle': { fill: '#d5e8d4', stroke: '#82b366', fontColor: '#1a1a1a' },
    'circle': { fill: '#fff2cc', stroke: '#d6b656', fontColor: '#1a1a1a' },
    'ellipse': { fill: '#e1d5e7', stroke: '#9673a6', fontColor: '#1a1a1a' },
    'diamond': { fill: '#ffe6cc', stroke: '#d79b00', fontColor: '#1a1a1a' },
    'hexagon': { fill: '#f8cecc', stroke: '#b85450', fontColor: '#1a1a1a' },
    'parallelogram': { fill: '#e6d0de', stroke: '#996185', fontColor: '#1a1a1a' },
    'trapezoid': { fill: '#d0cee2', stroke: '#56517e', fontColor: '#1a1a1a' },
    'cylinder': { fill: '#60a917', stroke: '#2d7600', fontColor: '#ffffff' },
    'document': { fill: '#f5f5f5', stroke: '#666666', fontColor: '#1a1a1a' },
    'cloud': { fill: '#b1ddf0', stroke: '#10739e', fontColor: '#1a1a1a' },
    'actor': { fill: '#ffcc00', stroke: '#000000', fontColor: '#1a1a1a' },
    'note': { fill: '#fff9b1', stroke: '#e6db74', fontColor: '#1a1a1a' },
    'custom': { fill: '#f5f5f5', stroke: '#666666', fontColor: '#1a1a1a' },
};

/** Edge colors */
const EDGE_COLORS = {
    default: { stroke: '#6c8ebf', fontColor: '#333333' },
    dashed: { stroke: '#999999', fontColor: '#666666' },
    dotted: { stroke: '#b85450', fontColor: '#666666' },
};

/** Group colors */
const GROUP_COLORS = {
    fill: '#f5f5f5',
    stroke: '#666666',
    headerFill: '#e6e6e6',
    fontColor: '#333333',
};

/** Generate Draw.io XML from diagram */
export function generateDrawio(diagram: Diagram): string {
    const cells: string[] = [];
    let cellId = 2; // 0 and 1 are reserved

    const nodeIdMap = new Map<string, number>();
    const groupIdMap = new Map<string, number>();

    // Generate groups first
    for (const group of diagram.groups) {
        const id = cellId++;
        groupIdMap.set(group.id, id);

        const style = buildGroupStyle(group);
        const { x, y } = group.position || { x: 50, y: 50 };
        const { width, height } = group.size || { width: 200, height: 150 };

        cells.push(`
      <mxCell id="${id}" value="${escapeXml(group.label || '')}" style="${style}" vertex="1" parent="1">
        <mxGeometry x="${x}" y="${y}" width="${width}" height="${height}" as="geometry"/>
      </mxCell>
    `.trim());
    }

    // Generate nodes
    for (const node of diagram.nodes) {
        const id = cellId++;
        nodeIdMap.set(node.id, id);

        // Find parent group
        let parentId = '1';
        for (const group of diagram.groups) {
            if (group.children.includes(node.id)) {
                const groupCellId = groupIdMap.get(group.id);
                if (groupCellId) {
                    parentId = String(groupCellId);
                }
                break;
            }
        }

        const style = buildNodeStyle(node);
        const { x, y } = node.position || { x: 100, y: 100 };
        const { width, height } = node.size || getDefaultSize(node.shape);

        cells.push(`
      <mxCell id="${id}" value="${escapeXml(node.label)}" style="${style}" vertex="1" parent="${parentId}">
        <mxGeometry x="${x}" y="${y}" width="${width}" height="${height}" as="geometry"/>
      </mxCell>
    `.trim());
    }

    // Generate edges
    for (const edge of diagram.edges) {
        const id = cellId++;
        const sourceId = nodeIdMap.get(edge.source);
        const targetId = nodeIdMap.get(edge.target);

        if (!sourceId || !targetId) {
            console.warn(`Edge references unknown node: ${edge.source} -> ${edge.target}`);
            continue;
        }

        const style = buildEdgeStyle(edge);
        const label = edge.label ? escapeXml(edge.label) : '';

        let geometryContent = '';
        if (edge.waypoints && edge.waypoints.length > 0) {
            const points = edge.waypoints
                .map(p => `<mxPoint x="${p.x}" y="${p.y}"/>`)
                .join('\n');
            geometryContent = `<Array as="points">${points}</Array>`;
        }

        cells.push(`
      <mxCell id="${id}" value="${label}" style="${style}" edge="1" parent="1" source="${sourceId}" target="${targetId}">
        <mxGeometry relative="1" as="geometry">
          ${geometryContent}
        </mxGeometry>
      </mxCell>
    `.trim());
    }

    // Build final XML
    const diagramName = diagram.name || 'Page-1';

    return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="WB Diagrams" modified="${new Date().toISOString()}" agent="WB Diagrams Converter" version="1.0">
  <diagram id="${diagram.id}" name="${escapeXml(diagramName)}">
    <mxGraphModel dx="0" dy="0" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="850" pageHeight="1100">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        ${cells.join('\n        ')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}

/** Build Draw.io style string for node */
function buildNodeStyle(node: DiagramNode): string {
    const parts: string[] = [];

    // Shape
    const shapeStyle = DRAWIO_SHAPE_MAP[node.shape] || 'rounded=0';
    parts.push(shapeStyle);

    // Common styles for beautiful appearance
    parts.push('whiteSpace=wrap');
    parts.push('html=1');

    // Get default colors for this shape
    const defaultColors = SHAPE_COLORS[node.shape] || SHAPE_COLORS['rectangle'];

    // Fill color - use custom or beautiful default
    const fillColor = node.style.fill && node.style.fill !== '#ffffff'
        ? node.style.fill
        : defaultColors.fill;
    parts.push(`fillColor=${fillColor}`);

    // Stroke color - use custom or beautiful default
    const strokeColor = node.style.stroke && node.style.stroke !== '#000000'
        ? node.style.stroke
        : defaultColors.stroke;
    parts.push(`strokeColor=${strokeColor}`);

    // Stroke width
    const strokeWidth = node.style.strokeWidth || 2;
    parts.push(`strokeWidth=${strokeWidth}`);

    // Font color - use custom or beautiful default
    const fontColor = node.style.fontColor && node.style.fontColor !== '#000000'
        ? node.style.fontColor
        : defaultColors.fontColor;
    parts.push(`fontColor=${fontColor}`);

    // Font size
    const fontSize = node.style.fontSize || 12;
    parts.push(`fontSize=${fontSize}`);

    // Font family
    if (node.style.fontFamily) {
        parts.push(`fontFamily=${node.style.fontFamily}`);
    }

    // Opacity
    if (node.style.opacity !== undefined && node.style.opacity < 1) {
        parts.push(`opacity=${Math.round(node.style.opacity * 100)}`);
    }

    // Add shadow for depth
    parts.push('shadow=1');

    return parts.join(';') + ';';
}

/** Build Draw.io style string for edge */
function buildEdgeStyle(edge: DiagramEdge): string {
    const parts: string[] = [];

    // Edge routing - use curved for better appearance
    parts.push('edgeStyle=orthogonalEdgeStyle');
    parts.push('rounded=1');
    parts.push('orthogonalLoop=1');
    parts.push('jettySize=auto');
    parts.push('html=1');

    // Arrow styles
    const arrowStyle = generateDrawioArrowStyle(edge.arrow);
    parts.push(arrowStyle);

    // Determine edge color based on line type
    const lineType = edge.arrow?.lineType || 'solid';
    const edgeColor = lineType === 'dashed' ? EDGE_COLORS.dashed
        : lineType === 'dotted' ? EDGE_COLORS.dotted
            : EDGE_COLORS.default;

    // Stroke color - use custom or default
    const strokeColor = edge.style.stroke && edge.style.stroke !== '#000000'
        ? edge.style.stroke
        : edgeColor.stroke;
    parts.push(`strokeColor=${strokeColor}`);

    // Stroke width
    const strokeWidth = edge.style.strokeWidth || 2;
    parts.push(`strokeWidth=${strokeWidth}`);

    // Font color for labels
    parts.push(`fontColor=${edgeColor.fontColor}`);
    parts.push('fontSize=11');

    // Label background for readability
    if (edge.label) {
        parts.push('labelBackgroundColor=#ffffff');
    }

    // Opacity
    if (edge.style.opacity !== undefined && edge.style.opacity < 1) {
        parts.push(`opacity=${Math.round(edge.style.opacity * 100)}`);
    }

    return parts.join(';') + ';';
}

/** Build Draw.io style string for group */
function buildGroupStyle(group: DiagramGroup): string {
    const parts: string[] = [];

    parts.push('swimlane');
    parts.push('whiteSpace=wrap');
    parts.push('html=1');
    parts.push('collapsible=0');
    parts.push('startSize=30');

    // Fill color
    const fillColor = group.style.fill || GROUP_COLORS.fill;
    parts.push(`fillColor=${fillColor}`);

    // Stroke color
    const strokeColor = group.style.stroke || GROUP_COLORS.stroke;
    parts.push(`strokeColor=${strokeColor}`);

    // Font color
    parts.push(`fontColor=${GROUP_COLORS.fontColor}`);
    parts.push('fontStyle=1'); // Bold header

    // Dashed border
    if (group.style.strokeDasharray) {
        parts.push('dashed=1');
    }

    // Rounded corners
    parts.push('rounded=1');

    return parts.join(';') + ';';
}

/** Get default size for shape */
function getDefaultSize(shape: string): { width: number; height: number } {
    switch (shape) {
        case 'circle':
            return { width: 80, height: 80 };
        case 'diamond':
            return { width: 80, height: 80 };
        case 'cylinder':
            return { width: 60, height: 80 };
        case 'actor':
            return { width: 30, height: 60 };
        default:
            return { width: 120, height: 60 };
    }
}
