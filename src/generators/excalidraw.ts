/**
 * Excalidraw generator
 * 
 * Generates Excalidraw JSON format from IR
 */

import type { Diagram, DiagramNode, DiagramEdge } from '../types';
import { generateId, EXCALIDRAW_SHAPE_MAP, getExcalidrawRoundness, generateExcalidrawArrow } from '../utils';

interface ExcalidrawElement {
    id: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    angle: number;
    strokeColor: string;
    backgroundColor: string;
    fillStyle: string;
    strokeWidth: number;
    strokeStyle: string;
    roughness: number;
    opacity: number;
    groupIds: string[];
    strokeSharpness?: string;
    boundElements?: Array<{ id: string; type: string }>;
    updated?: number;
    link?: null;
    locked?: boolean;
    [key: string]: unknown;
}

interface ExcalidrawArrowElement extends ExcalidrawElement {
    type: 'arrow' | 'line';
    points: Array<[number, number]>;
    startBinding: { elementId: string; focus: number; gap: number } | null;
    endBinding: { elementId: string; focus: number; gap: number } | null;
    startArrowhead: string | null;
    endArrowhead: string | null;
}

interface ExcalidrawTextElement extends ExcalidrawElement {
    type: 'text';
    text: string;
    fontSize: number;
    fontFamily: number;
    textAlign: string;
    verticalAlign: string;
    baseline: number;
    containerId: string | null;
    originalText: string;
}

interface ExcalidrawFile {
    type: 'excalidraw';
    version: number;
    source: string;
    elements: ExcalidrawElement[];
    appState: {
        viewBackgroundColor: string;
        gridSize: null;
    };
    files: Record<string, unknown>;
}

/** Generate Excalidraw JSON from diagram */
export function generateExcalidraw(diagram: Diagram): string {
    const elements: ExcalidrawElement[] = [];
    const nodeElementMap = new Map<string, string>(); // node.id -> element.id

    // Generate node elements
    for (const node of diagram.nodes) {
        const elementId = generateId();
        nodeElementMap.set(node.id, elementId);

        const { x, y } = node.position || { x: 100, y: 100 };
        const { width, height } = node.size || getDefaultSize(node.shape);

        const element = createNodeElement(node, elementId, x, y, width, height);
        elements.push(element);

        // Add text element for label
        if (node.label) {
            const textElement = createTextElement(node.label, elementId, x, y, width, height);
            elements.push(textElement);

            // Link text to container
            element.boundElements = element.boundElements || [];
            element.boundElements.push({ id: textElement.id, type: 'text' });
        }
    }

    // Generate edge elements
    for (const edge of diagram.edges) {
        const sourceElementId = nodeElementMap.get(edge.source);
        const targetElementId = nodeElementMap.get(edge.target);

        if (!sourceElementId || !targetElementId) {
            console.warn(`Edge references unknown node: ${edge.source} -> ${edge.target}`);
            continue;
        }

        const sourceNode = diagram.nodes.find(n => n.id === edge.source);
        const targetNode = diagram.nodes.find(n => n.id === edge.target);

        if (!sourceNode || !targetNode) continue;

        const arrowElement = createArrowElement(
            edge,
            sourceElementId,
            targetElementId,
            sourceNode,
            targetNode
        );
        elements.push(arrowElement);

        // Update bound elements on nodes
        const sourceElement = elements.find(e => e.id === sourceElementId);
        const targetElement = elements.find(e => e.id === targetElementId);

        if (sourceElement) {
            sourceElement.boundElements = sourceElement.boundElements || [];
            sourceElement.boundElements.push({ id: arrowElement.id, type: 'arrow' });
        }

        if (targetElement) {
            targetElement.boundElements = targetElement.boundElements || [];
            targetElement.boundElements.push({ id: arrowElement.id, type: 'arrow' });
        }

        // Add label if present
        if (edge.label) {
            const labelElement = createEdgeLabelElement(edge, arrowElement);
            elements.push(labelElement);
        }
    }

    const file: ExcalidrawFile = {
        type: 'excalidraw',
        version: 2,
        source: 'https://whitebite.github.io/wb-diagrams',
        elements,
        appState: {
            viewBackgroundColor: '#ffffff',
            gridSize: null,
        },
        files: {},
    };

    return JSON.stringify(file, null, 2);
}

/** Create Excalidraw element for node */
function createNodeElement(
    node: DiagramNode,
    elementId: string,
    x: number,
    y: number,
    width: number,
    height: number
): ExcalidrawElement {
    const type = EXCALIDRAW_SHAPE_MAP[node.shape] || 'rectangle';
    const roundness = getExcalidrawRoundness(node.shape);

    const element: ExcalidrawElement = {
        id: elementId,
        type,
        x,
        y,
        width,
        height,
        angle: 0,
        strokeColor: node.style.stroke || '#1e1e1e',
        backgroundColor: node.style.fill || 'transparent',
        fillStyle: node.style.fill ? 'solid' : 'hachure',
        strokeWidth: node.style.strokeWidth || 2,
        strokeStyle: 'solid',
        roughness: 1,
        opacity: node.style.opacity !== undefined ? node.style.opacity * 100 : 100,
        groupIds: [],
        updated: Date.now(),
        link: null,
        locked: false,
    };

    if (roundness) {
        element.roundness = roundness;
    }

    return element;
}

/** Create Excalidraw text element */
function createTextElement(
    text: string,
    containerId: string,
    containerX: number,
    containerY: number,
    containerWidth: number,
    containerHeight: number
): ExcalidrawTextElement {
    return {
        id: generateId(),
        type: 'text',
        x: containerX + containerWidth / 2,
        y: containerY + containerHeight / 2,
        width: containerWidth - 20,
        height: 25,
        angle: 0,
        strokeColor: '#1e1e1e',
        backgroundColor: 'transparent',
        fillStyle: 'hachure',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 1,
        opacity: 100,
        groupIds: [],
        text,
        fontSize: 16,
        fontFamily: 1, // Virgil
        textAlign: 'center',
        verticalAlign: 'middle',
        baseline: 18,
        containerId,
        originalText: text,
        updated: Date.now(),
        link: null,
        locked: false,
    };
}

/** Create Excalidraw arrow element */
function createArrowElement(
    edge: DiagramEdge,
    sourceElementId: string,
    targetElementId: string,
    sourceNode: DiagramNode,
    targetNode: DiagramNode
): ExcalidrawArrowElement {
    const sourcePos = sourceNode.position || { x: 100, y: 100 };
    const sourceSize = sourceNode.size || getDefaultSize(sourceNode.shape);
    const targetPos = targetNode.position || { x: 300, y: 100 };
    const targetSize = targetNode.size || getDefaultSize(targetNode.shape);

    // Calculate arrow start and end points
    const startX = sourcePos.x + sourceSize.width;
    const startY = sourcePos.y + sourceSize.height / 2;
    const endX = targetPos.x;
    const endY = targetPos.y + targetSize.height / 2;

    const arrowConfig = generateExcalidrawArrow(edge.arrow);

    return {
        id: generateId(),
        type: 'arrow',
        x: startX,
        y: startY,
        width: endX - startX,
        height: endY - startY,
        angle: 0,
        strokeColor: edge.style.stroke || '#1e1e1e',
        backgroundColor: 'transparent',
        fillStyle: 'hachure',
        strokeWidth: edge.style.strokeWidth || 2,
        strokeStyle: arrowConfig.strokeStyle,
        roughness: 1,
        opacity: edge.style.opacity !== undefined ? edge.style.opacity * 100 : 100,
        groupIds: [],
        points: [
            [0, 0],
            [endX - startX, endY - startY],
        ],
        startBinding: {
            elementId: sourceElementId,
            focus: 0,
            gap: 5,
        },
        endBinding: {
            elementId: targetElementId,
            focus: 0,
            gap: 5,
        },
        startArrowhead: arrowConfig.startArrowhead,
        endArrowhead: arrowConfig.endArrowhead,
        updated: Date.now(),
        link: null,
        locked: false,
    };
}

/** Create label element for edge */
function createEdgeLabelElement(
    edge: DiagramEdge,
    arrowElement: ExcalidrawArrowElement
): ExcalidrawTextElement {
    // Position label at middle of arrow
    const midX = arrowElement.x + arrowElement.width / 2;
    const midY = arrowElement.y + arrowElement.height / 2 - 20;

    return {
        id: generateId(),
        type: 'text',
        x: midX,
        y: midY,
        width: 100,
        height: 25,
        angle: 0,
        strokeColor: '#1e1e1e',
        backgroundColor: '#ffffff',
        fillStyle: 'solid',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        groupIds: [],
        text: edge.label || '',
        fontSize: 14,
        fontFamily: 1,
        textAlign: 'center',
        verticalAlign: 'middle',
        baseline: 14,
        containerId: null,
        originalText: edge.label || '',
        updated: Date.now(),
        link: null,
        locked: false,
    };
}

/** Get default size for shape */
function getDefaultSize(shape: string): { width: number; height: number } {
    switch (shape) {
        case 'circle':
            return { width: 80, height: 80 };
        case 'diamond':
            return { width: 100, height: 100 };
        case 'cylinder':
            return { width: 80, height: 100 };
        case 'actor':
            return { width: 60, height: 100 };
        default:
            return { width: 150, height: 75 };
    }
}
