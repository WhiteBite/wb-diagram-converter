/**
 * Lucidchart Parser
 * 
 * Parses Lucidchart JSON export to IR
 */

import type { Diagram, DiagramNode, DiagramEdge, DiagramGroup, NodeShape } from '../types';

interface LucidShape {
    id: string;
    class?: string;
    type?: string;
    text?: string;
    boundingBox?: { x: number; y: number; w: number; h: number };
    properties?: Record<string, unknown>;
}

interface LucidLine {
    id: string;
    endpoint1?: { type: string; style?: string; shapeId?: string };
    endpoint2?: { type: string; style?: string; shapeId?: string };
    text?: string;
    properties?: Record<string, unknown>;
}

interface LucidGroup {
    id: string;
    members?: string[];
    text?: string;
}

interface LucidDocument {
    shapes?: LucidShape[];
    lines?: LucidLine[];
    groups?: LucidGroup[];
    pages?: Array<{ shapes?: LucidShape[]; lines?: LucidLine[]; groups?: LucidGroup[] }>;
}

/** Parse Lucidchart JSON to IR */
export function parseLucidchart(json: string): Diagram {
    const data: LucidDocument = JSON.parse(json);

    const nodes: DiagramNode[] = [];
    const edges: DiagramEdge[] = [];
    const groups: DiagramGroup[] = [];

    // Handle both flat structure and pages structure
    const shapes = data.shapes || data.pages?.[0]?.shapes || [];
    const lines = data.lines || data.pages?.[0]?.lines || [];
    const lucidGroups = data.groups || data.pages?.[0]?.groups || [];

    // Parse shapes as nodes
    for (const shape of shapes) {
        const nodeShape = detectLucidShape(shape);
        const position = shape.boundingBox
            ? { x: shape.boundingBox.x, y: shape.boundingBox.y }
            : undefined;
        const size = shape.boundingBox
            ? { width: shape.boundingBox.w, height: shape.boundingBox.h }
            : undefined;

        nodes.push({
            id: shape.id,
            type: 'node',
            label: shape.text || shape.id,
            shape: nodeShape,
            position,
            size,
            style: {},
            metadata: { lucidClass: shape.class, lucidType: shape.type },
        });
    }

    // Parse lines as edges
    for (const line of lines) {
        const sourceId = line.endpoint1?.shapeId;
        const targetId = line.endpoint2?.shapeId;

        if (sourceId && targetId) {
            edges.push({
                id: line.id,
                type: 'edge',
                source: sourceId,
                target: targetId,
                label: line.text,
                arrow: {
                    sourceType: detectArrowHead(line.endpoint1?.style),
                    targetType: detectArrowHead(line.endpoint2?.style),
                    lineType: 'solid',
                },
                style: {},
            });
        }
    }

    // Parse groups
    for (const group of lucidGroups) {
        groups.push({
            id: group.id,
            type: 'group',
            label: group.text || group.id,
            children: group.members || [],
            style: {},
        });
    }

    return {
        id: 'lucidchart-diagram',
        type: 'flowchart',
        nodes,
        edges,
        groups,
        metadata: { source: 'lucidchart' },
    };
}

function detectLucidShape(shape: LucidShape): NodeShape {
    const type = (shape.type || shape.class || '').toLowerCase();

    if (type.includes('diamond') || type.includes('decision')) return 'diamond';
    if (type.includes('ellipse') || type.includes('oval') || type.includes('circle')) return 'ellipse';
    if (type.includes('cylinder') || type.includes('database') || type.includes('data')) return 'cylinder';
    if (type.includes('hexagon')) return 'hexagon';
    if (type.includes('parallelogram')) return 'parallelogram';
    if (type.includes('cloud')) return 'cloud';
    if (type.includes('actor') || type.includes('person') || type.includes('user')) return 'actor';
    if (type.includes('document')) return 'document';
    if (type.includes('rounded')) return 'rounded-rectangle';

    return 'rectangle';
}

function detectArrowHead(style?: string): 'none' | 'arrow' | 'diamond' | 'circle' {
    if (!style) return 'none';
    const lower = style.toLowerCase();
    if (lower.includes('arrow') || lower.includes('filled')) return 'arrow';
    if (lower.includes('diamond')) return 'diamond';
    if (lower.includes('circle') || lower.includes('dot')) return 'circle';
    return 'none';
}
