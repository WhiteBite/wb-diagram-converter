/**
 * Auto-layout using Dagre
 * 
 * Automatically positions nodes in a diagram
 */

import dagre from 'dagre';
import type { Diagram, DiagramNode, LayoutDirection } from '../types';

export interface LayoutOptions {
    algorithm?: 'dagre' | 'elk' | 'none';
    direction?: LayoutDirection;
    nodeSpacing?: number;
    rankSpacing?: number;
    marginX?: number;
    marginY?: number;
}

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
    algorithm: 'dagre',
    direction: 'TB',
    nodeSpacing: 50,
    rankSpacing: 70,
    marginX: 50,
    marginY: 50,
};

/** Apply auto-layout to diagram */
export function autoLayout(diagram: Diagram, options: LayoutOptions = {}): Diagram {
    // Filter out undefined values to prevent overwriting defaults
    const cleanOptions = Object.fromEntries(
        Object.entries(options).filter(([, v]) => v !== undefined)
    ) as LayoutOptions;
    const opts = { ...DEFAULT_OPTIONS, ...cleanOptions };

    if (opts.algorithm === 'none') {
        return diagram;
    }

    if (opts.algorithm === 'elk') {
        console.warn('ELK layout not implemented, falling back to Dagre');
    }

    return applyDagreLayout(diagram, opts);
}

/** Apply Dagre layout algorithm */
function applyDagreLayout(diagram: Diagram, options: Required<LayoutOptions>): Diagram {
    try {
        // Create Dagre graph
        const g = new dagre.graphlib.Graph();

        g.setGraph({
            rankdir: options.direction,
            nodesep: options.nodeSpacing,
            ranksep: options.rankSpacing,
            marginx: options.marginX,
            marginy: options.marginY,
        });

        g.setDefaultEdgeLabel(() => ({}));

        // Add nodes
        for (const node of diagram.nodes) {
            const size = node.size || getDefaultNodeSize(node.shape);
            g.setNode(node.id, {
                width: size.width,
                height: size.height,
                label: node.label,
            });
        }

        // Add edges
        for (const edge of diagram.edges) {
            g.setEdge(edge.source, edge.target);
        }

        // Run layout - this can throw "intersection" errors
        dagre.layout(g);

        // Apply positions to nodes
        const layoutedNodes: DiagramNode[] = diagram.nodes.map(node => {
            const dagreNode = g.node(node.id);

            if (!dagreNode) {
                throw new Error(`Node ${node.id} not found in dagre graph`);
            }

            // Check for NaN positions
            if (isNaN(dagreNode.x) || isNaN(dagreNode.y)) {
                throw new Error(`Node ${node.id} has invalid position`);
            }

            const size = node.size || getDefaultNodeSize(node.shape);

            return {
                ...node,
                position: {
                    x: Math.round(dagreNode.x - size.width / 2),
                    y: Math.round(dagreNode.y - size.height / 2),
                },
                size,
            };
        });

        // Calculate edge waypoints (skip errors)
        const layoutedEdges = diagram.edges.map(edge => {
            const dagreEdge = g.edge(edge.source, edge.target);

            if (!dagreEdge || !dagreEdge.points) {
                return edge;
            }

            // Skip first and last points (they're the node centers)
            const waypoints = dagreEdge.points.slice(1, -1).map((p: { x: number; y: number }) => ({
                x: Math.round(p.x),
                y: Math.round(p.y),
            }));

            return {
                ...edge,
                waypoints: waypoints.length > 0 ? waypoints : undefined,
            };
        });

        // Calculate viewport
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        for (const node of layoutedNodes) {
            if (node.position && node.size) {
                minX = Math.min(minX, node.position.x);
                minY = Math.min(minY, node.position.y);
                maxX = Math.max(maxX, node.position.x + node.size.width);
                maxY = Math.max(maxY, node.position.y + node.size.height);
            }
        }

        return {
            ...diagram,
            nodes: layoutedNodes,
            edges: layoutedEdges,
            viewport: {
                width: maxX - minX + options.marginX * 2,
                height: maxY - minY + options.marginY * 2,
            },
        };
    } catch (layoutError) {
        // Dagre failed (e.g., intersection errors), use simple layout
        console.warn('Dagre layout failed, using simple layout:', layoutError);
        return applySimpleLayout(diagram, options);
    }
}

/** Get default size for node shape */
function getDefaultNodeSize(shape: string): { width: number; height: number } {
    switch (shape) {
        case 'circle':
            return { width: 80, height: 80 };
        case 'diamond':
            return { width: 100, height: 80 };
        case 'cylinder':
            return { width: 80, height: 100 };
        case 'actor':
            return { width: 50, height: 80 };
        case 'hexagon':
            return { width: 120, height: 80 };
        default:
            return { width: 150, height: 60 };
    }
}


/** Simple grid layout as fallback when Dagre fails */
function applySimpleLayout(diagram: Diagram, options: Required<LayoutOptions>): Diagram {
    const isHorizontal = options.direction === 'LR' || options.direction === 'RL';
    const spacing = options.nodeSpacing + 100;

    const layoutedNodes: DiagramNode[] = diagram.nodes.map((node, index) => {
        const size = node.size || getDefaultNodeSize(node.shape);
        const col = isHorizontal ? index : index % 3;
        const row = isHorizontal ? 0 : Math.floor(index / 3);

        return {
            ...node,
            position: {
                x: Math.round(options.marginX + col * spacing),
                y: Math.round(options.marginY + row * spacing),
            },
            size,
        };
    });

    // Calculate viewport
    let maxX = 0, maxY = 0;
    for (const node of layoutedNodes) {
        if (node.position && node.size) {
            maxX = Math.max(maxX, node.position.x + node.size.width);
            maxY = Math.max(maxY, node.position.y + node.size.height);
        }
    }

    return {
        ...diagram,
        nodes: layoutedNodes,
        edges: diagram.edges,
        viewport: {
            width: maxX + options.marginX,
            height: maxY + options.marginY,
        },
    };
}
