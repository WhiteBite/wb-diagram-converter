/**
 * SVG generator
 * 
 * Generates SVG from IR diagram
 */

import type { Diagram, DiagramNode, DiagramEdge, DiagramGroup, NodeShape } from '../types';
import { getConnectionPoints, generateOrthogonalPath, generateCurvedPath, type EdgeRoutingStyle } from '../utils/edge-routing';

/** SVG generation options */
export interface SvgOptions {
    padding?: number;
    nodeWidth?: number;
    nodeHeight?: number;
    fontSize?: number;
    fontFamily?: string;
    backgroundColor?: string;
    edgeRouting?: EdgeRoutingStyle;
}

const DEFAULT_OPTIONS: Required<SvgOptions> = {
    padding: 20,
    nodeWidth: 120,
    nodeHeight: 60,
    fontSize: 14,
    fontFamily: 'Arial, sans-serif',
    backgroundColor: 'transparent',
    edgeRouting: 'orthogonal',
};

/** Generate SVG from IR diagram */
export function generateSvg(diagram: Diagram, options: SvgOptions = {}): string {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Calculate bounds
    const bounds = calculateBounds(diagram, opts);
    const width = bounds.maxX - bounds.minX + opts.padding * 2;
    const height = bounds.maxY - bounds.minY + opts.padding * 2;

    const elements: string[] = [];

    // SVG header
    elements.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`);

    // Defs for markers (arrowheads)
    elements.push(generateDefs());

    // Background
    if (opts.backgroundColor !== 'transparent') {
        elements.push(`  <rect width="100%" height="100%" fill="${opts.backgroundColor}"/>`);
    }

    // Transform group to apply padding and offset
    const offsetX = opts.padding - bounds.minX;
    const offsetY = opts.padding - bounds.minY;
    elements.push(`  <g transform="translate(${offsetX}, ${offsetY})">`);

    // Render groups first (background)
    for (const group of diagram.groups) {
        elements.push(renderGroup(group, diagram.nodes, opts));
    }

    // Render edges
    for (const edge of diagram.edges) {
        const sourceNode = diagram.nodes.find(n => n.id === edge.source);
        const targetNode = diagram.nodes.find(n => n.id === edge.target);
        if (sourceNode && targetNode) {
            elements.push(renderEdge(edge, sourceNode, targetNode, opts));
        }
    }

    // Render nodes
    for (const node of diagram.nodes) {
        elements.push(renderNode(node, opts));
    }

    elements.push('  </g>');
    elements.push('</svg>');

    return elements.join('\n');
}

/** Generate SVG defs (markers) */
function generateDefs(): string {
    return `  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#333"/>
    </marker>
    <marker id="arrowhead-start" markerWidth="10" markerHeight="7" refX="1" refY="3.5" orient="auto-start-reverse">
      <polygon points="10 0, 0 3.5, 10 7" fill="#333"/>
    </marker>
    <marker id="circle-marker" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
      <circle cx="4" cy="4" r="3" fill="none" stroke="#333" stroke-width="1"/>
    </marker>
    <marker id="diamond-marker" markerWidth="12" markerHeight="12" refX="6" refY="6" orient="auto">
      <polygon points="6 0, 12 6, 6 12, 0 6" fill="none" stroke="#333" stroke-width="1"/>
    </marker>
  </defs>`;
}

/** Calculate diagram bounds */
function calculateBounds(diagram: Diagram, opts: Required<SvgOptions>): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const node of diagram.nodes) {
        const x = node.position?.x ?? 0;
        const y = node.position?.y ?? 0;
        const w = node.size?.width ?? opts.nodeWidth;
        const h = node.size?.height ?? opts.nodeHeight;

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + w);
        maxY = Math.max(maxY, y + h);
    }

    // Handle empty diagram
    if (minX === Infinity) {
        return { minX: 0, minY: 0, maxX: 200, maxY: 100 };
    }

    return { minX, minY, maxX, maxY };
}

/** Render node as SVG */
function renderNode(node: DiagramNode, opts: Required<SvgOptions>): string {
    const x = node.position?.x ?? 0;
    const y = node.position?.y ?? 0;
    const w = node.size?.width ?? opts.nodeWidth;
    const h = node.size?.height ?? opts.nodeHeight;

    const fill = node.style.fill || '#ffffff';
    const stroke = node.style.stroke || '#333333';
    const strokeWidth = node.style.strokeWidth || 2;

    const shape = renderShape(node.shape, x, y, w, h, fill, stroke, strokeWidth);
    const text = renderText(node.label, x + w / 2, y + h / 2, opts);

    return `    <g class="node" data-id="${escapeXml(node.id)}">\n${shape}\n${text}\n    </g>`;
}

/** Render shape SVG element */
function renderShape(
    shape: NodeShape,
    x: number, y: number, w: number, h: number,
    fill: string, stroke: string, strokeWidth: number
): string {
    const style = `fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"`;

    switch (shape) {
        case 'circle':
            const r = Math.min(w, h) / 2;
            return `      <circle cx="${x + w / 2}" cy="${y + h / 2}" r="${r}" ${style}/>`;

        case 'ellipse':
            return `      <ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" ${style}/>`;

        case 'diamond':
            const points = `${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`;
            return `      <polygon points="${points}" ${style}/>`;

        case 'rounded-rectangle':
            return `      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" ry="10" ${style}/>`;

        case 'hexagon':
            const hx = w / 4;
            const hexPoints = `${x + hx},${y} ${x + w - hx},${y} ${x + w},${y + h / 2} ${x + w - hx},${y + h} ${x + hx},${y + h} ${x},${y + h / 2}`;
            return `      <polygon points="${hexPoints}" ${style}/>`;

        case 'cylinder':
            return `      <path d="M${x},${y + 10} 
                          a${w / 2},10 0 0,0 ${w},0 
                          v${h - 20} 
                          a${w / 2},10 0 0,1 -${w},0 
                          v-${h - 20}
                          a${w / 2},10 0 0,1 ${w},0" ${style}/>`;

        default:
            return `      <rect x="${x}" y="${y}" width="${w}" height="${h}" ${style}/>`;
    }
}

/** Render text element */
function renderText(text: string, cx: number, cy: number, opts: Required<SvgOptions>): string {
    return `      <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-family="${opts.fontFamily}" font-size="${opts.fontSize}">${escapeXml(text)}</text>`;
}

/** Render edge as SVG */
function renderEdge(
    edge: DiagramEdge,
    source: DiagramNode,
    target: DiagramNode,
    opts: Required<SvgOptions>
): string {
    const defaultSize = { width: opts.nodeWidth, height: opts.nodeHeight };
    const { start, end } = getConnectionPoints(source, target, defaultSize);

    const stroke = edge.style.stroke || '#333333';
    const strokeWidth = edge.style.strokeWidth || 2;

    let strokeDasharray = '';
    if (edge.arrow.lineType === 'dashed') strokeDasharray = ' stroke-dasharray="8,4"';
    else if (edge.arrow.lineType === 'dotted') strokeDasharray = ' stroke-dasharray="2,2"';

    let markerEnd = '';
    let markerStart = '';
    if (edge.arrow.targetType === 'arrow') markerEnd = ' marker-end="url(#arrowhead)"';
    if (edge.arrow.sourceType === 'arrow') markerStart = ' marker-start="url(#arrowhead-start)"';

    // Generate path based on routing style
    let pathD: string;
    if (opts.edgeRouting === 'curved') {
        pathD = generateCurvedPath(start, end);
    } else if (opts.edgeRouting === 'orthogonal') {
        pathD = generateOrthogonalPath(start, end);
    } else {
        pathD = `M${start.x},${start.y} L${end.x},${end.y}`;
    }

    let labelElement = '';
    if (edge.label) {
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        labelElement = `\n      <rect x="${midX - 30}" y="${midY - 12}" width="60" height="18" fill="white" rx="3"/>
      <text x="${midX}" y="${midY}" text-anchor="middle" dominant-baseline="middle" font-family="${opts.fontFamily}" font-size="${opts.fontSize - 2}">${escapeXml(edge.label)}</text>`;
    }

    return `    <g class="edge">
      <path d="${pathD}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"${strokeDasharray}${markerStart}${markerEnd}/>${labelElement}
    </g>`;
}

/** Render group as SVG */
function renderGroup(group: DiagramGroup, _nodes: DiagramNode[], opts: Required<SvgOptions>): string {
    const x = group.position?.x ?? 0;
    const y = group.position?.y ?? 0;
    const w = group.size?.width ?? 200;
    const h = group.size?.height ?? 150;

    const fill = group.style.fill || '#f5f5f5';
    const stroke = group.style.stroke || '#cccccc';

    let strokeDasharray = '';
    if (group.style.strokeDasharray) strokeDasharray = ` stroke-dasharray="${group.style.strokeDasharray}"`;

    const label = group.label || '';

    return `    <g class="group">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="1"${strokeDasharray} rx="5"/>
      <text x="${x + 10}" y="${y + 20}" font-family="${opts.fontFamily}" font-size="${opts.fontSize}" font-weight="bold">${escapeXml(label)}</text>
    </g>`;
}

/** Escape XML special characters */
function escapeXml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
