/**
 * Edge routing utilities
 * 
 * Calculates paths for edges between nodes
 */

import type { Position, Size, DiagramNode } from '../types';

/** Edge routing style */
export type EdgeRoutingStyle = 'straight' | 'orthogonal' | 'curved';

/** Connection point on a node */
export interface ConnectionPoint {
    x: number;
    y: number;
    side: 'top' | 'right' | 'bottom' | 'left';
}

/** Get node bounds */
function getNodeBounds(node: DiagramNode, defaultSize: Size): { x: number; y: number; width: number; height: number } {
    return {
        x: node.position?.x ?? 0,
        y: node.position?.y ?? 0,
        width: node.size?.width ?? defaultSize.width,
        height: node.size?.height ?? defaultSize.height,
    };
}

/** Get center of node */
export function getNodeCenter(node: DiagramNode, defaultSize: Size): Position {
    const bounds = getNodeBounds(node, defaultSize);
    return {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
    };
}

/** Get best connection points between two nodes */
export function getConnectionPoints(
    source: DiagramNode,
    target: DiagramNode,
    defaultSize: Size
): { start: ConnectionPoint; end: ConnectionPoint } {
    const sBounds = getNodeBounds(source, defaultSize);
    const tBounds = getNodeBounds(target, defaultSize);

    const sCenter = { x: sBounds.x + sBounds.width / 2, y: sBounds.y + sBounds.height / 2 };
    const tCenter = { x: tBounds.x + tBounds.width / 2, y: tBounds.y + tBounds.height / 2 };

    // Determine primary direction
    const dx = tCenter.x - sCenter.x;
    const dy = tCenter.y - sCenter.y;

    let startSide: ConnectionPoint['side'];
    let endSide: ConnectionPoint['side'];

    if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal connection
        if (dx > 0) {
            startSide = 'right';
            endSide = 'left';
        } else {
            startSide = 'left';
            endSide = 'right';
        }
    } else {
        // Vertical connection
        if (dy > 0) {
            startSide = 'bottom';
            endSide = 'top';
        } else {
            startSide = 'top';
            endSide = 'bottom';
        }
    }

    return {
        start: getConnectionPointOnSide(sBounds, startSide),
        end: getConnectionPointOnSide(tBounds, endSide),
    };
}

/** Get connection point on specific side of node */
function getConnectionPointOnSide(
    bounds: { x: number; y: number; width: number; height: number },
    side: ConnectionPoint['side']
): ConnectionPoint {
    switch (side) {
        case 'top':
            return { x: bounds.x + bounds.width / 2, y: bounds.y, side };
        case 'right':
            return { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2, side };
        case 'bottom':
            return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height, side };
        case 'left':
            return { x: bounds.x, y: bounds.y + bounds.height / 2, side };
    }
}

/** Generate straight line path */
export function generateStraightPath(start: Position, end: Position): string {
    return `M${start.x},${start.y} L${end.x},${end.y}`;
}

/** Generate orthogonal (right-angle) path */
export function generateOrthogonalPath(
    start: ConnectionPoint,
    end: ConnectionPoint,
    offset: number = 20
): string {
    const points: Position[] = [{ x: start.x, y: start.y }];

    // Add intermediate points based on connection sides
    if (start.side === 'right' && end.side === 'left') {
        const midX = (start.x + end.x) / 2;
        points.push({ x: midX, y: start.y });
        points.push({ x: midX, y: end.y });
    } else if (start.side === 'left' && end.side === 'right') {
        const midX = (start.x + end.x) / 2;
        points.push({ x: midX, y: start.y });
        points.push({ x: midX, y: end.y });
    } else if (start.side === 'bottom' && end.side === 'top') {
        const midY = (start.y + end.y) / 2;
        points.push({ x: start.x, y: midY });
        points.push({ x: end.x, y: midY });
    } else if (start.side === 'top' && end.side === 'bottom') {
        const midY = (start.y + end.y) / 2;
        points.push({ x: start.x, y: midY });
        points.push({ x: end.x, y: midY });
    } else if (start.side === 'right' && end.side === 'top') {
        points.push({ x: start.x + offset, y: start.y });
        points.push({ x: start.x + offset, y: end.y - offset });
        points.push({ x: end.x, y: end.y - offset });
    } else if (start.side === 'bottom' && end.side === 'left') {
        points.push({ x: start.x, y: start.y + offset });
        points.push({ x: end.x - offset, y: start.y + offset });
        points.push({ x: end.x - offset, y: end.y });
    } else {
        // Fallback: simple L-shape
        points.push({ x: end.x, y: start.y });
    }

    points.push({ x: end.x, y: end.y });

    return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
}

/** Generate curved (bezier) path */
export function generateCurvedPath(
    start: ConnectionPoint,
    end: ConnectionPoint,
    curvature: number = 0.5
): string {
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    let cp1x: number, cp1y: number, cp2x: number, cp2y: number;

    // Control points based on connection sides
    if (start.side === 'right' || start.side === 'left') {
        const offset = Math.abs(dx) * curvature;
        cp1x = start.x + (start.side === 'right' ? offset : -offset);
        cp1y = start.y;
        cp2x = end.x + (end.side === 'right' ? offset : -offset);
        cp2y = end.y;
    } else {
        const offset = Math.abs(dy) * curvature;
        cp1x = start.x;
        cp1y = start.y + (start.side === 'bottom' ? offset : -offset);
        cp2x = end.x;
        cp2y = end.y + (end.side === 'bottom' ? offset : -offset);
    }

    return `M${start.x},${start.y} C${cp1x},${cp1y} ${cp2x},${cp2y} ${end.x},${end.y}`;
}

/** Generate path for edge with specified routing style */
export function generateEdgePath(
    source: DiagramNode,
    target: DiagramNode,
    style: EdgeRoutingStyle,
    defaultSize: Size
): string {
    const { start, end } = getConnectionPoints(source, target, defaultSize);

    switch (style) {
        case 'orthogonal':
            return generateOrthogonalPath(start, end);
        case 'curved':
            return generateCurvedPath(start, end);
        case 'straight':
        default:
            return generateStraightPath(start, end);
    }
}
