/**
 * Excalidraw parser
 * 
 * Parses Excalidraw JSON format to IR
 */

import type { Diagram, DiagramNode, DiagramEdge, DiagramGroup, NodeShape, ArrowHeadType } from '../types';
import { createEmptyDiagram, createNode, createEdge, createGroup, validateInput } from './base';

/** Excalidraw element types */
interface ExcalidrawElement {
    id: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    strokeColor?: string;
    backgroundColor?: string;
    strokeWidth?: number;
    strokeStyle?: 'solid' | 'dashed' | 'dotted';
    opacity?: number;
    groupIds?: string[];
    frameId?: string | null;
    boundElements?: Array<{ id: string; type: string }>;
}

interface ExcalidrawTextElement extends ExcalidrawElement {
    type: 'text';
    text: string;
    containerId: string | null;
}

interface ExcalidrawArrowElement extends ExcalidrawElement {
    type: 'arrow' | 'line';
    startBinding: { elementId: string } | null;
    endBinding: { elementId: string } | null;
    startArrowhead: string | null;
    endArrowhead: string | null;
}

interface ExcalidrawFrameElement extends ExcalidrawElement {
    type: 'frame';
    name?: string;
}

interface ExcalidrawFile {
    type: 'excalidraw';
    version: number;
    elements: ExcalidrawElement[];
}

/** Parse Excalidraw JSON to IR diagram */
export function parseExcalidraw(source: string): Diagram {
    validateInput(source, 'excalidraw');

    const data = parseJson(source);
    const diagram = createEmptyDiagram('flowchart', 'excalidraw');

    // Maps for resolving references
    const elementMap = new Map<string, ExcalidrawElement>();
    const textByContainer = new Map<string, string>(); // containerId -> text
    const nodeIdMap = new Map<string, string>(); // excalidraw id -> IR node id
    const frameMap = new Map<string, DiagramGroup>(); // frame id -> group
    const groupIdMap = new Map<string, string[]>(); // groupId -> element ids

    // First pass: collect all elements, text bindings, and groups
    for (const element of data.elements) {
        elementMap.set(element.id, element);

        if (isTextElement(element) && element.containerId) {
            textByContainer.set(element.containerId, element.text);
        }

        // Track group memberships
        if (element.groupIds && element.groupIds.length > 0) {
            for (const groupId of element.groupIds) {
                if (!groupIdMap.has(groupId)) {
                    groupIdMap.set(groupId, []);
                }
                groupIdMap.get(groupId)!.push(element.id);
            }
        }
    }

    // Second pass: parse frames as groups
    for (const element of data.elements) {
        if (isFrameElement(element)) {
            const group = createGroup(element.id, [], {
                label: element.name || 'Frame',
                position: { x: element.x, y: element.y },
                size: { width: element.width, height: element.height },
                style: {
                    stroke: element.strokeColor || '#cccccc',
                    fill: element.backgroundColor !== 'transparent' ? element.backgroundColor : undefined,
                },
            });
            frameMap.set(element.id, group);
            diagram.groups.push(group);
        }
    }

    // Create groups from groupIds
    for (const [groupId, memberIds] of groupIdMap) {
        // Only create group if it has shape elements
        const shapeMembers = memberIds.filter(id => {
            const el = elementMap.get(id);
            return el && isShapeElement(el);
        });

        if (shapeMembers.length > 1) {
            const group = createGroup(groupId, shapeMembers, {
                label: `Group ${groupId.slice(0, 6)}`,
            });
            diagram.groups.push(group);
        }
    }

    // Third pass: parse shapes as nodes
    for (const element of data.elements) {
        if (isShapeElement(element)) {
            const label = textByContainer.get(element.id) || '';
            const node = parseShapeElement(element, label);
            diagram.nodes.push(node);
            nodeIdMap.set(element.id, node.id);

            // Add to frame if element is inside one
            if (element.frameId && frameMap.has(element.frameId)) {
                frameMap.get(element.frameId)!.children.push(node.id);
            }
        }
    }

    // Fourth pass: parse arrows as edges
    for (const element of data.elements) {
        if (isArrowElement(element)) {
            const edge = parseArrowElement(element, nodeIdMap, textByContainer);
            if (edge) {
                diagram.edges.push(edge);
            }
        }
    }

    return diagram;
}

/** Parse JSON with error handling */
function parseJson(source: string): ExcalidrawFile {
    try {
        const data = JSON.parse(source);

        if (data.type !== 'excalidraw') {
            throw new Error('Not an Excalidraw file');
        }

        if (!Array.isArray(data.elements)) {
            throw new Error('Invalid Excalidraw file: missing elements array');
        }

        return data as ExcalidrawFile;
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error(`Invalid JSON: ${error.message}`);
        }
        throw error;
    }
}

/** Check if element is a shape (node) */
function isShapeElement(element: ExcalidrawElement): boolean {
    return ['rectangle', 'ellipse', 'diamond'].includes(element.type);
}

/** Check if element is text */
function isTextElement(element: ExcalidrawElement): element is ExcalidrawTextElement {
    return element.type === 'text';
}

/** Check if element is an arrow */
function isArrowElement(element: ExcalidrawElement): element is ExcalidrawArrowElement {
    return element.type === 'arrow' || element.type === 'line';
}

/** Check if element is a frame */
function isFrameElement(element: ExcalidrawElement): element is ExcalidrawFrameElement {
    return element.type === 'frame';
}

/** Parse shape element to node */
function parseShapeElement(element: ExcalidrawElement, label: string): DiagramNode {
    return createNode(element.id, label, {
        shape: mapExcalidrawShape(element.type),
        position: { x: element.x, y: element.y },
        size: { width: element.width, height: element.height },
        style: {
            fill: element.backgroundColor !== 'transparent' ? element.backgroundColor : undefined,
            stroke: element.strokeColor,
            strokeWidth: element.strokeWidth,
            opacity: element.opacity !== undefined ? element.opacity / 100 : undefined,
        },
    });
}

/** Parse arrow element to edge */
function parseArrowElement(
    element: ExcalidrawArrowElement,
    nodeIdMap: Map<string, string>,
    textByContainer: Map<string, string>
): DiagramEdge | null {
    // Get source and target from bindings
    const sourceExcalidrawId = element.startBinding?.elementId;
    const targetExcalidrawId = element.endBinding?.elementId;

    if (!sourceExcalidrawId || !targetExcalidrawId) {
        return null; // Skip unconnected arrows
    }

    const source = nodeIdMap.get(sourceExcalidrawId);
    const target = nodeIdMap.get(targetExcalidrawId);

    if (!source || !target) {
        return null;
    }

    // Find label text bound to this arrow
    const label = textByContainer.get(element.id);

    return createEdge(source, target, {
        label,
        arrow: {
            sourceType: mapExcalidrawArrowhead(element.startArrowhead),
            targetType: mapExcalidrawArrowhead(element.endArrowhead),
            lineType: element.strokeStyle || 'solid',
        },
        style: {
            stroke: element.strokeColor,
            strokeWidth: element.strokeWidth,
            opacity: element.opacity !== undefined ? element.opacity / 100 : undefined,
        },
    });
}

/** Map Excalidraw shape type to IR shape */
function mapExcalidrawShape(type: string): NodeShape {
    switch (type) {
        case 'rectangle':
            return 'rectangle';
        case 'ellipse':
            return 'ellipse';
        case 'diamond':
            return 'diamond';
        default:
            return 'rectangle';
    }
}

/** Map Excalidraw arrowhead to IR arrow type */
function mapExcalidrawArrowhead(arrowhead: string | null): ArrowHeadType {
    if (!arrowhead) return 'none';

    switch (arrowhead) {
        case 'arrow':
        case 'triangle':
            return 'arrow';
        case 'dot':
            return 'circle';
        case 'bar':
            return 'bar';
        case 'diamond':
            return 'diamond';
        default:
            return 'none';
    }
}
