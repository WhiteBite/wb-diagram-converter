/**
 * PNG generator
 * 
 * Generates PNG from IR diagram using Canvas API
 * Works in browser environment only
 */

import type { Diagram, DiagramNode, DiagramEdge, DiagramGroup, NodeShape } from '../types';
import { getConnectionPoints } from '../utils/edge-routing';

/** PNG generation options */
export interface PngOptions {
    scale?: number;
    padding?: number;
    nodeWidth?: number;
    nodeHeight?: number;
    fontSize?: number;
    fontFamily?: string;
    backgroundColor?: string;
    quality?: number;
    antiAlias?: boolean;
}

const DEFAULT_OPTIONS: Required<PngOptions> = {
    scale: 2,
    padding: 20,
    nodeWidth: 120,
    nodeHeight: 60,
    fontSize: 14,
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#ffffff',
    quality: 1.0,
    antiAlias: true,
};

/** PNG generation result */
export interface PngResult {
    dataUrl: string;
    width: number;
    height: number;
}

/** Generate PNG data URL from IR diagram */
export function generatePng(diagram: Diagram, options: PngOptions = {}): string {
    return generatePngWithInfo(diagram, options).dataUrl;
}

/** Generate PNG with additional info */
export function generatePngWithInfo(diagram: Diagram, options: PngOptions = {}): PngResult {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const canvas = createCanvas(diagram, opts);

    return {
        dataUrl: canvas.toDataURL('image/png', opts.quality),
        width: canvas.width,
        height: canvas.height,
    };
}

/** Generate PNG as Blob (async) */
export async function generatePngBlob(diagram: Diagram, options: PngOptions = {}): Promise<Blob> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const canvas = createCanvas(diagram, opts);

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create PNG blob'));
                }
            },
            'image/png',
            opts.quality
        );
    });
}

/** Download PNG file */
export async function downloadPng(diagram: Diagram, filename: string = 'diagram.png', options: PngOptions = {}): Promise<void> {
    if (typeof document === 'undefined') {
        throw new Error('Download requires browser environment');
    }

    const blob = await generatePngBlob(diagram, options);
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
}

/** Create and render canvas */
function createCanvas(diagram: Diagram, opts: Required<PngOptions>): HTMLCanvasElement {
    if (typeof document === 'undefined') {
        throw new Error('PNG generation requires browser environment with Canvas API');
    }

    const bounds = calculateBounds(diagram, opts);
    const width = (bounds.maxX - bounds.minX + opts.padding * 2) * opts.scale;
    const height = (bounds.maxY - bounds.minY + opts.padding * 2) * opts.scale;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) {
        throw new Error('Failed to get canvas 2D context');
    }

    // Anti-aliasing
    if (opts.antiAlias) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
    }

    ctx.scale(opts.scale, opts.scale);

    const offsetX = opts.padding - bounds.minX;
    const offsetY = opts.padding - bounds.minY;
    ctx.translate(offsetX, offsetY);

    // Background
    ctx.fillStyle = opts.backgroundColor;
    ctx.fillRect(
        bounds.minX - opts.padding,
        bounds.minY - opts.padding,
        bounds.maxX - bounds.minX + opts.padding * 2,
        bounds.maxY - bounds.minY + opts.padding * 2
    );

    // Render groups
    for (const group of diagram.groups) {
        renderGroup(ctx, group, opts);
    }

    // Render edges
    for (const edge of diagram.edges) {
        const sourceNode = diagram.nodes.find(n => n.id === edge.source);
        const targetNode = diagram.nodes.find(n => n.id === edge.target);
        if (sourceNode && targetNode) {
            renderEdge(ctx, edge, sourceNode, targetNode, opts);
        }
    }

    // Render nodes
    for (const node of diagram.nodes) {
        renderNode(ctx, node, opts);
    }

    return canvas;
}

/** Calculate diagram bounds */
function calculateBounds(diagram: Diagram, opts: Required<PngOptions>): { minX: number; minY: number; maxX: number; maxY: number } {
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

    if (minX === Infinity) {
        return { minX: 0, minY: 0, maxX: 200, maxY: 100 };
    }

    return { minX, minY, maxX, maxY };
}

/** Render node on canvas */
function renderNode(ctx: CanvasRenderingContext2D, node: DiagramNode, opts: Required<PngOptions>): void {
    const x = node.position?.x ?? 0;
    const y = node.position?.y ?? 0;
    const w = node.size?.width ?? opts.nodeWidth;
    const h = node.size?.height ?? opts.nodeHeight;

    const fill = node.style.fill || '#ffffff';
    const stroke = node.style.stroke || '#333333';
    const strokeWidth = node.style.strokeWidth || 2;

    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;

    // Draw shape
    renderShape(ctx, node.shape, x, y, w, h);

    // Draw label
    ctx.fillStyle = node.style.fontColor || '#000000';
    ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.label, x + w / 2, y + h / 2);
}

/** Render shape on canvas */
function renderShape(
    ctx: CanvasRenderingContext2D,
    shape: NodeShape,
    x: number, y: number, w: number, h: number
): void {
    ctx.beginPath();

    switch (shape) {
        case 'circle':
            const r = Math.min(w, h) / 2;
            ctx.arc(x + w / 2, y + h / 2, r, 0, Math.PI * 2);
            break;

        case 'ellipse':
            ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
            break;

        case 'diamond':
            ctx.moveTo(x + w / 2, y);
            ctx.lineTo(x + w, y + h / 2);
            ctx.lineTo(x + w / 2, y + h);
            ctx.lineTo(x, y + h / 2);
            ctx.closePath();
            break;

        case 'rounded-rectangle':
            const radius = 10;
            ctx.roundRect(x, y, w, h, radius);
            break;

        case 'hexagon':
            const hx = w / 4;
            ctx.moveTo(x + hx, y);
            ctx.lineTo(x + w - hx, y);
            ctx.lineTo(x + w, y + h / 2);
            ctx.lineTo(x + w - hx, y + h);
            ctx.lineTo(x + hx, y + h);
            ctx.lineTo(x, y + h / 2);
            ctx.closePath();
            break;

        default:
            ctx.rect(x, y, w, h);
    }

    ctx.fill();
    ctx.stroke();
}

/** Render edge on canvas */
function renderEdge(
    ctx: CanvasRenderingContext2D,
    edge: DiagramEdge,
    source: DiagramNode,
    target: DiagramNode,
    opts: Required<PngOptions>
): void {
    const defaultSize = { width: opts.nodeWidth, height: opts.nodeHeight };
    const { start, end } = getConnectionPoints(source, target, defaultSize);

    ctx.strokeStyle = edge.style.stroke || '#333333';
    ctx.lineWidth = edge.style.strokeWidth || 2;

    // Line style
    if (edge.arrow.lineType === 'dashed') {
        ctx.setLineDash([8, 4]);
    } else if (edge.arrow.lineType === 'dotted') {
        ctx.setLineDash([2, 2]);
    } else {
        ctx.setLineDash([]);
    }

    // Draw orthogonal path
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);

    // Simple orthogonal routing
    if (start.side === 'right' || start.side === 'left') {
        const midX = (start.x + end.x) / 2;
        ctx.lineTo(midX, start.y);
        ctx.lineTo(midX, end.y);
    } else {
        const midY = (start.y + end.y) / 2;
        ctx.lineTo(start.x, midY);
        ctx.lineTo(end.x, midY);
    }
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    ctx.setLineDash([]);

    // Draw arrowhead
    if (edge.arrow.targetType === 'arrow') {
        drawArrowhead(ctx, start.x, start.y, end.x, end.y);
    }

    // Draw label
    if (edge.label) {
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(midX - 30, midY - 10, 60, 20);

        ctx.fillStyle = '#000000';
        ctx.font = `${opts.fontSize - 2}px ${opts.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(edge.label, midX, midY);
    }
}

/** Draw arrowhead */
function drawArrowhead(ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number): void {
    const headLength = 10;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
}

/** Render group on canvas */
function renderGroup(ctx: CanvasRenderingContext2D, group: DiagramGroup, opts: Required<PngOptions>): void {
    const x = group.position?.x ?? 0;
    const y = group.position?.y ?? 0;
    const w = group.size?.width ?? 200;
    const h = group.size?.height ?? 150;

    ctx.fillStyle = group.style.fill || '#f5f5f5';
    ctx.strokeStyle = group.style.stroke || '#cccccc';
    ctx.lineWidth = 1;

    if (group.style.strokeDasharray) {
        ctx.setLineDash([5, 5]);
    }

    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 5);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    // Label
    if (group.label) {
        ctx.fillStyle = '#000000';
        ctx.font = `bold ${opts.fontSize}px ${opts.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(group.label, x + 10, y + 10);
    }
}
