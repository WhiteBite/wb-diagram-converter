/**
 * Mermaid diagram parser
 * 
 * Parses Mermaid flowchart syntax to IR
 */

import type { Diagram, DiagramNode, DiagramEdge, DiagramGroup, DiagramType, NodeShape } from '../types';
import { generateId, parseMermaidArrow, detectMermaidShape } from '../utils';
import { validateInput } from './base';

/** Parse Mermaid diagram to IR */
export function parseMermaid(source: string): Diagram {
    validateInput(source, 'mermaid');

    const lines = source.trim().split('\n');
    const nodes: DiagramNode[] = [];
    const edges: DiagramEdge[] = [];
    const groups: DiagramGroup[] = [];

    const nodeMap = new Map<string, DiagramNode>();
    const groupStack: DiagramGroup[] = [];

    let diagramType: DiagramType = 'flowchart';
    let direction = 'TB';

    for (const rawLine of lines) {
        const line = rawLine.trim();

        // Skip empty lines and comments
        if (!line || line.startsWith('%%')) {
            continue;
        }

        // Detect diagram type and direction
        const headerMatch = line.match(/^(flowchart|graph)\s+(TB|BT|LR|RL|TD)/i);
        if (headerMatch) {
            diagramType = 'flowchart';
            direction = headerMatch[2].toUpperCase();
            continue;
        }

        // Handle subgraph start
        const subgraphMatch = line.match(/^subgraph\s+(\w+)(?:\s*\[([^\]]+)\])?/i);
        if (subgraphMatch) {
            const [, id, label] = subgraphMatch;
            const group: DiagramGroup = {
                id,
                type: 'group',
                label: label || id,
                children: [],
                style: {},
            };
            groups.push(group);
            groupStack.push(group);
            continue;
        }

        // Handle subgraph end
        if (line.toLowerCase() === 'end') {
            groupStack.pop();
            continue;
        }

        // Parse edges: A --> B or A -->|label| B
        // Also handles chains: A --> B --> C
        const edgeMatches = parseEdgeLine(line);
        if (edgeMatches && edgeMatches.length > 0) {
            for (const edgeMatch of edgeMatches) {
                const { sourceId, sourceLabel, arrow, targetId, targetLabel, edgeLabel } = edgeMatch;

                // Create source node if not exists
                if (!nodeMap.has(sourceId)) {
                    const node = createNode(sourceId, sourceLabel);
                    nodes.push(node);
                    nodeMap.set(sourceId, node);
                    addToCurrentGroup(node.id, groupStack);
                } else if (sourceLabel && sourceLabel !== sourceId) {
                    // Update label if provided
                    const node = nodeMap.get(sourceId)!;
                    const { shape, label } = detectMermaidShape(sourceLabel);
                    node.label = label;
                    node.shape = shape;
                }

                // Create target node if not exists
                if (!nodeMap.has(targetId)) {
                    const node = createNode(targetId, targetLabel);
                    nodes.push(node);
                    nodeMap.set(targetId, node);
                    addToCurrentGroup(node.id, groupStack);
                } else if (targetLabel && targetLabel !== targetId) {
                    const node = nodeMap.get(targetId)!;
                    const { shape, label } = detectMermaidShape(targetLabel);
                    node.label = label;
                    node.shape = shape;
                }

                // Create edge
                const edge: DiagramEdge = {
                    id: generateId(),
                    type: 'edge',
                    source: sourceId,
                    target: targetId,
                    label: edgeLabel,
                    arrow: parseMermaidArrow(arrow),
                    style: {},
                };
                edges.push(edge);
            }

            continue;
        }

        // Parse standalone node definition: A[Label]
        // Shape patterns in order of specificity
        const standalonePattern = /^(\w+)(\(\([^)]+\)\)|{{[^}]+}}|\[\([^)]+\)\]|\[\[[^\]]+\]\]|\[[^\]]+\]|\([^)]+\)|\{[^}]+\})/;
        const nodeMatch = line.match(standalonePattern);
        if (nodeMatch && !nodeMap.has(nodeMatch[1])) {
            const [, id, labelPart] = nodeMatch;
            const node = createNode(id, labelPart);
            nodes.push(node);
            nodeMap.set(id, node);
            addToCurrentGroup(node.id, groupStack);
            continue;
        }

        // Parse style definitions: style A fill:#f9f
        const styleMatch = line.match(/^style\s+(\w+)\s+(.+)/i);
        if (styleMatch) {
            const [, nodeId, styleStr] = styleMatch;
            const node = nodeMap.get(nodeId);
            if (node) {
                applyMermaidStyle(node, styleStr);
            }
            continue;
        }

        // Parse class definitions: classDef className fill:#f9f
        // Parse class assignments: class A,B className
        // (simplified - full implementation would track class definitions)
    }

    return {
        id: generateId(),
        type: diagramType,
        nodes,
        edges,
        groups,
        metadata: {
            source: 'mermaid',
            direction,
        },
    };
}

/** Edge match result type */
interface EdgeMatch {
    sourceId: string;
    sourceLabel?: string;
    arrow: string;
    targetId: string;
    targetLabel?: string;
    edgeLabel?: string;
}

/** Parse edge line - supports chains like A --> B --> C --> D */
function parseEdgeLine(line: string): EdgeMatch[] | null {
    const shapePattern = '\\(\\([^)]+\\)\\)|{{[^}]+}}|\\[\\([^)]+\\)\\]|\\[\\[[^\\]]+\\]\\]|\\[[^\\]]+\\]|\\([^)]+\\)|\\{[^}]+\\}';
    const arrowPattern = '[<>x\\-o=.]+';

    const results: EdgeMatch[] = [];
    let remaining = line.trim();

    // Match first node: ID + optional shape
    const firstNodeRegex = new RegExp(`^(\\w+)(${shapePattern})?\\s*`);
    const firstMatch = remaining.match(firstNodeRegex);
    if (!firstMatch) return null;

    let currentId = firstMatch[1];
    let currentLabel = firstMatch[2];
    remaining = remaining.slice(firstMatch[0].length);

    // Parse chain: (arrow |label|? nodeId shape?)+
    const chainRegex = new RegExp(`^(${arrowPattern})\\s*(?:\\|([^|]*)\\|)?\\s*(\\w+)(${shapePattern})?\\s*`);

    let chainMatch: RegExpMatchArray | null;
    while ((chainMatch = remaining.match(chainRegex)) !== null) {
        const [full, arrow, edgeLabel, targetId, targetLabel] = chainMatch;

        if (!isValidArrow(arrow)) break;

        results.push({
            sourceId: currentId,
            sourceLabel: currentLabel?.trim(),
            arrow: arrow.trim(),
            targetId,
            targetLabel: targetLabel?.trim(),
            edgeLabel: edgeLabel?.trim(),
        });

        currentId = targetId;
        currentLabel = targetLabel;
        remaining = remaining.slice(full.length);
    }

    return results.length > 0 ? results : null;
}

/** Check if string is a valid Mermaid arrow */
function isValidArrow(str: string): boolean {
    const arrowChars = /^[<>x\-o=.]+$/;
    return arrowChars.test(str) && str.length >= 2;
}

/** Create node from ID and optional label */
function createNode(id: string, labelPart?: string): DiagramNode {
    let shape: NodeShape = 'rectangle';
    let label = id;

    if (labelPart) {
        const detected = detectMermaidShape(labelPart);
        shape = detected.shape;
        label = detected.label;
    }

    return {
        id,
        type: 'node',
        label,
        shape,
        style: {},
    };
}

/** Add node to current group if any */
function addToCurrentGroup(nodeId: string, groupStack: DiagramGroup[]): void {
    if (groupStack.length > 0) {
        const currentGroup = groupStack[groupStack.length - 1];
        currentGroup.children.push(nodeId);
    }
}

/** Apply Mermaid style string to node */
function applyMermaidStyle(node: DiagramNode, styleStr: string): void {
    const parts = styleStr.split(',').map(p => p.trim());

    for (const part of parts) {
        const [key, value] = part.split(':').map(s => s.trim());

        switch (key) {
            case 'fill':
                node.style.fill = value;
                break;
            case 'stroke':
                node.style.stroke = value;
                break;
            case 'stroke-width':
                node.style.strokeWidth = parseInt(value);
                break;
            case 'color':
                node.style.fontColor = value;
                break;
            case 'font-size':
                node.style.fontSize = parseInt(value);
                break;
        }
    }
}
