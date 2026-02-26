/**
 * Mermaid diagram parser
 * 
 * Parses Mermaid flowchart syntax to IR
 * 
 * Supported features:
 * - Comments (%% comment)
 * - Node styles (style A fill:#f9f)
 * - Class definitions (classDef, class)
 * - Direction inside subgraph (direction TB)
 * - Edge labels in multiple formats (A -->|text| B, A -- text --> B)
 * - Special characters in node text
 */

import type { Diagram, DiagramNode, DiagramEdge, DiagramGroup, DiagramType, NodeShape, NodeStyle } from '../types';
import { generateId, parseMermaidArrow, detectMermaidShape } from '../utils';
import { validateInput } from './base';

/** Class definition storage */
interface ClassDef {
    name: string;
    style: NodeStyle;
}

/** Parse Mermaid diagram to IR */
export function parseMermaid(source: string): Diagram {
    validateInput(source, 'mermaid');

    // Pre-process: remove inline comments and normalize
    const cleanedSource = preprocessSource(source);
    const lines = cleanedSource.split('\n');
    
    const nodes: DiagramNode[] = [];
    const edges: DiagramEdge[] = [];
    const groups: DiagramGroup[] = [];

    const nodeMap = new Map<string, DiagramNode>();
    const groupStack: DiagramGroup[] = [];
    const classDefs = new Map<string, ClassDef>();

    let diagramType: DiagramType = 'flowchart';
    let direction = 'TB';

    for (const rawLine of lines) {
        const line = rawLine.trim();

        // Skip empty lines and full-line comments
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

        // Handle direction inside subgraph: direction TB
        const directionMatch = line.match(/^direction\s+(TB|BT|LR|RL|TD)/i);
        if (directionMatch) {
            // Store direction in current group if any
            if (groupStack.length > 0) {
                const currentGroup = groupStack[groupStack.length - 1];
                currentGroup.metadata = {
                    ...currentGroup.metadata,
                    direction: directionMatch[1].toUpperCase(),
                };
            }
            continue;
        }

        // Handle subgraph start - improved pattern for quoted labels
        const subgraphMatch = line.match(/^subgraph\s+(\w+)(?:\s*\[([^\]]+)\]|\s+"([^"]+)"|\s+([^\s\[]+))?/i);
        if (subgraphMatch) {
            const [, id, bracketLabel, quotedLabel, plainLabel] = subgraphMatch;
            const label = bracketLabel || quotedLabel || plainLabel || id;
            const group: DiagramGroup = {
                id,
                type: 'group',
                label: unescapeText(label),
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

        // Parse classDef: classDef className fill:#f9f,stroke:#333
        const classDefMatch = line.match(/^classDef\s+(\w+)\s+(.+)/i);
        if (classDefMatch) {
            const [, className, styleStr] = classDefMatch;
            const style = parseMermaidStyleString(styleStr);
            classDefs.set(className, { name: className, style });
            continue;
        }

        // Parse class assignment: class A,B,C className
        const classAssignMatch = line.match(/^class\s+([\w,\s]+)\s+(\w+)/i);
        if (classAssignMatch) {
            const [, nodeIds, className] = classAssignMatch;
            const classDef = classDefs.get(className);
            if (classDef) {
                const ids = nodeIds.split(',').map(id => id.trim());
                for (const nodeId of ids) {
                    const node = nodeMap.get(nodeId);
                    if (node) {
                        node.style = { ...node.style, ...classDef.style };
                        node.metadata = {
                            ...node.metadata,
                            className,
                        };
                    }
                }
            }
            continue;
        }

        // Parse edges: A --> B or A -->|label| B or A -- text --> B
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
                    node.label = unescapeText(label);
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
                    node.label = unescapeText(label);
                    node.shape = shape;
                }

                // Create edge
                const edge: DiagramEdge = {
                    id: generateId(),
                    type: 'edge',
                    source: sourceId,
                    target: targetId,
                    label: edgeLabel ? unescapeText(edgeLabel) : undefined,
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

        // Parse inline class assignment: A:::className
        const inlineClassMatch = line.match(/^(\w+):::(\w+)/);
        if (inlineClassMatch) {
            const [, nodeId, className] = inlineClassMatch;
            const classDef = classDefs.get(className);
            if (classDef) {
                let node = nodeMap.get(nodeId);
                if (!node) {
                    node = createNode(nodeId);
                    nodes.push(node);
                    nodeMap.set(nodeId, node);
                    addToCurrentGroup(node.id, groupStack);
                }
                node.style = { ...node.style, ...classDef.style };
                node.metadata = { ...node.metadata, className };
            }
            continue;
        }
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

/** Pre-process source: remove inline comments, handle multi-line */
function preprocessSource(source: string): string {
    return source
        .split('\n')
        .map(line => {
            // Remove inline comments (but not %% at start of line - those are handled later)
            const commentIndex = line.indexOf('%%');
            if (commentIndex > 0) {
                // Check if %% is inside quotes
                const beforeComment = line.slice(0, commentIndex);
                const quoteCount = (beforeComment.match(/"/g) || []).length;
                if (quoteCount % 2 === 0) {
                    // Not inside quotes, safe to remove
                    return line.slice(0, commentIndex);
                }
            }
            return line;
        })
        .join('\n');
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

    // Parse chain: supports multiple edge label formats:
    // 1. A -->|text| B (pipe format)
    // 2. A -- text --> B (inline text format)
    // 3. A --> B (no label)
    
    // Pattern for pipe-style labels: -->|text|
    const pipeChainRegex = new RegExp(`^(${arrowPattern})\\s*(?:\\|([^|]*)\\|)?\\s*(\\w+)(${shapePattern})?\\s*`);
    
    // Pattern for inline text labels: -- text -->
    const inlineTextRegex = new RegExp(`^--\\s+([^-]+?)\\s+(${arrowPattern})\\s*(\\w+)(${shapePattern})?\\s*`);

    let chainMatch: RegExpMatchArray | null;
    
    while (remaining.length > 0) {
        // Try inline text format first: -- text -->
        const inlineMatch = remaining.match(inlineTextRegex);
        if (inlineMatch) {
            const [full, edgeLabel, arrow, targetId, targetLabel] = inlineMatch;
            
            if (isValidArrow(arrow)) {
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
                continue;
            }
        }
        
        // Try pipe format: -->|text| or just -->
        chainMatch = remaining.match(pipeChainRegex);
        if (chainMatch) {
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
            continue;
        }
        
        // No more matches
        break;
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
        label = unescapeText(detected.label);
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

/** Unescape special characters in text */
function unescapeText(text: string): string {
    return text
        .replace(/#quot;/g, '"')
        .replace(/#amp;/g, '&')
        .replace(/#lt;/g, '<')
        .replace(/#gt;/g, '>')
        .replace(/#semi;/g, ';')
        .replace(/#colon;/g, ':')
        .replace(/#pipe;/g, '|')
        .replace(/#lpar;/g, '(')
        .replace(/#rpar;/g, ')')
        .replace(/#lbrace;/g, '{')
        .replace(/#rbrace;/g, '}')
        .replace(/#lbrack;/g, '[')
        .replace(/#rbrack;/g, ']')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/\\n/g, '\n');
}

/** Parse Mermaid style string to NodeStyle */
function parseMermaidStyleString(styleStr: string): NodeStyle {
    const style: NodeStyle = {};
    const parts = styleStr.split(',').map(p => p.trim());

    for (const part of parts) {
        const colonIndex = part.indexOf(':');
        if (colonIndex === -1) continue;
        
        const key = part.slice(0, colonIndex).trim();
        const value = part.slice(colonIndex + 1).trim();

        switch (key) {
            case 'fill':
                style.fill = value;
                break;
            case 'stroke':
                style.stroke = value;
                break;
            case 'stroke-width':
                style.strokeWidth = parseInt(value);
                break;
            case 'color':
                style.fontColor = value;
                break;
            case 'font-size':
                style.fontSize = parseInt(value);
                break;
            case 'font-weight':
                style.fontWeight = value === 'bold' ? 'bold' : 'normal';
                break;
            case 'font-family':
                style.fontFamily = value;
                break;
            case 'opacity':
                style.opacity = parseFloat(value);
                break;
            case 'rx':
            case 'ry':
                // Border radius
                style.rounded = parseInt(value);
                break;
        }
    }

    return style;
}

/** Apply Mermaid style string to node */
function applyMermaidStyle(node: DiagramNode, styleStr: string): void {
    const parsedStyle = parseMermaidStyleString(styleStr);
    node.style = { ...node.style, ...parsedStyle };
}
