/**
 * Graphviz DOT parser
 * 
 * Parses DOT language to IR with support for:
 * - Graph attributes (bgcolor, fontname, etc.)
 * - Nested subgraphs
 * - Node/edge attributes
 * - Clusters
 */

import type { Diagram, DiagramNode, DiagramEdge, DiagramGroup, NodeShape, ArrowConfig } from '../types';
import { createEmptyDiagram, createNode, createEdge, createGroup, validateInput } from './base';

/** Graph-level attributes */
interface GraphAttributes {
    bgcolor?: string;
    fontname?: string;
    fontsize?: number;
    fontcolor?: string;
    label?: string;
    rankdir?: string;
    splines?: string;
    nodesep?: number;
    ranksep?: number;
}

/** Parse DOT to IR diagram */
export function parseDot(source: string): Diagram {
    validateInput(source, 'dot');

    const diagram = createEmptyDiagram('flowchart', 'dot');
    const nodeMap = new Map<string, DiagramNode>();

    // Parse graph attributes
    const graphAttrs = parseGraphAttributes(source);

    // Apply graph attributes to diagram metadata
    diagram.metadata = {
        source: 'dot',
        direction: graphAttrs.rankdir?.toUpperCase() || 'TB',
        ...graphAttrs,
    };

    // Set viewport background if specified
    if (graphAttrs.bgcolor) {
        diagram.viewport = {
            width: 800,
            height: 600,
            zoom: 1,
            offsetX: 0,
            offsetY: 0,
        };
        if (!diagram.metadata) diagram.metadata = { source: 'dot' };
        (diagram.metadata as Record<string, unknown>).backgroundColor = graphAttrs.bgcolor;
    }

    // Remove comments
    const cleanSource = removeComments(source);

    // Parse subgraphs recursively
    parseSubgraphs(cleanSource, diagram, nodeMap, null);

    // Parse remaining nodes and edges
    parseNodesAndEdges(cleanSource, diagram, nodeMap, null);

    return diagram;
}

/** Remove comments from DOT source */
function removeComments(source: string): string {
    return source
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/#.*$/gm, '');
}

/** Parse graph-level attributes */
function parseGraphAttributes(source: string): GraphAttributes {
    const attrs: GraphAttributes = {};

    // Match graph [ ... ] block
    const graphAttrMatch = source.match(/(?:di)?graph\s+\w*\s*\{[^}]*?graph\s*\[([^\]]+)\]/is);
    if (graphAttrMatch) {
        const parsed = parseAttributes(graphAttrMatch[1]);
        Object.assign(attrs, {
            bgcolor: parsed.bgcolor,
            fontname: parsed.fontname,
            fontsize: parsed.fontsize ? parseInt(parsed.fontsize) : undefined,
            fontcolor: parsed.fontcolor,
            label: parsed.label,
            rankdir: parsed.rankdir,
            splines: parsed.splines,
            nodesep: parsed.nodesep ? parseFloat(parsed.nodesep) : undefined,
            ranksep: parsed.ranksep ? parseFloat(parsed.ranksep) : undefined,
        });
    }

    // Also check for standalone rankdir
    const rankdirMatch = source.match(/rankdir\s*=\s*["']?(TB|BT|LR|RL)["']?/i);
    if (rankdirMatch && !attrs.rankdir) {
        attrs.rankdir = rankdirMatch[1].toUpperCase();
    }

    // Check for standalone bgcolor
    const bgcolorMatch = source.match(/bgcolor\s*=\s*["']?([^"'\s;]+)["']?/i);
    if (bgcolorMatch && !attrs.bgcolor) {
        attrs.bgcolor = bgcolorMatch[1];
    }

    return attrs;
}

/** Parse subgraphs recursively */
function parseSubgraphs(
    source: string,
    diagram: Diagram,
    nodeMap: Map<string, DiagramNode>,
    parentGroup: DiagramGroup | null
): void {
    // Match subgraph blocks (including nested)
    const subgraphRegex = /subgraph\s+(?:cluster_)?(\w+)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/gi;
    let match;

    while ((match = subgraphRegex.exec(source)) !== null) {
        const [fullMatch, name, content] = match;

        // Parse subgraph attributes
        const labelMatch = content.match(/label\s*=\s*["']([^"']+)["']/i);
        const styleMatch = content.match(/style\s*=\s*["']?(\w+)["']?/i);
        const colorMatch = content.match(/(?:fill)?color\s*=\s*["']?([^"'\s;]+)["']?/i);
        const bgcolorMatch = content.match(/bgcolor\s*=\s*["']?([^"'\s;]+)["']?/i);

        const group = createGroup(name, [], {
            label: labelMatch?.[1] || name,
            style: {
                fill: bgcolorMatch?.[1] || colorMatch?.[1],
                stroke: colorMatch?.[1],
                strokeDasharray: styleMatch?.[1] === 'dashed' ? '5,5' : undefined,
            },
        });

        diagram.groups.push(group);

        // Add to parent group if nested
        if (parentGroup) {
            parentGroup.children.push(group.id);
        }

        // Recursively parse nested subgraphs
        parseSubgraphs(content, diagram, nodeMap, group);

        // Parse nodes inside this subgraph
        parseNodesAndEdges(content, diagram, nodeMap, group);
    }
}

/** Parse nodes and edges from DOT content */
function parseNodesAndEdges(
    source: string,
    diagram: Diagram,
    nodeMap: Map<string, DiagramNode>,
    currentGroup: DiagramGroup | null
): void {
    // Split by semicolons and newlines
    const lines = source.split(/[;\n]/).map(l => l.trim()).filter(Boolean);

    for (const line of lines) {
        // Skip graph/digraph declaration and subgraph
        if (/^(strict\s+)?(di)?graph\s+/i.test(line)) continue;
        if (/^subgraph\s+/i.test(line)) continue;
        if (line === '{' || line === '}') continue;
        if (/^(graph|node|edge)\s*\[/i.test(line)) continue; // Skip default attributes

        // Parse edge: A -> B or A -- B (can have multiple targets: A -> B -> C)
        const edgeResult = parseEdgeLine(line, nodeMap, diagram, currentGroup);
        if (edgeResult.length > 0) {
            diagram.edges.push(...edgeResult);
            continue;
        }

        // Parse node definition: A [label="Label", shape=box]
        const nodeResult = parseNodeLine(line, currentGroup);
        if (nodeResult && !nodeMap.has(nodeResult.id)) {
            nodeMap.set(nodeResult.id, nodeResult);
            diagram.nodes.push(nodeResult);

            if (currentGroup) {
                currentGroup.children.push(nodeResult.id);
            }
        }
    }
}

/** Parse node definition */
function parseNodeLine(line: string, currentGroup: DiagramGroup | null): DiagramNode | null {
    // Pattern: nodeId [attr1=val1, attr2=val2]
    const match = line.match(/^(\w+)\s*\[([^\]]+)\]/);
    if (!match) {
        // Simple node without attributes
        const simpleMatch = line.match(/^(\w+)\s*$/);
        if (simpleMatch && !['graph', 'digraph', 'subgraph', 'node', 'edge'].includes(simpleMatch[1].toLowerCase())) {
            return createNode(simpleMatch[1], simpleMatch[1]);
        }
        return null;
    }

    const [, id, attrsStr] = match;
    const attrs = parseAttributes(attrsStr);

    const node = createNode(id, attrs.label || id, {
        shape: mapDotShape(attrs.shape),
        style: {
            fill: attrs.fillcolor || (attrs.style?.includes('filled') ? attrs.color : undefined),
            stroke: attrs.color,
            fontColor: attrs.fontcolor,
            fontSize: attrs.fontsize ? parseInt(attrs.fontsize) : undefined,
        },
    });

    // Store additional attributes in metadata
    if (attrs.tooltip || attrs.url || attrs.href) {
        node.metadata = {
            tooltip: attrs.tooltip,
            url: attrs.url || attrs.href,
        };
    }

    return node;
}

/** Parse edge line - supports chained edges like A -> B -> C */
function parseEdgeLine(
    line: string,
    nodeMap: Map<string, DiagramNode>,
    diagram: Diagram,
    currentGroup: DiagramGroup | null
): DiagramEdge[] {
    const edges: DiagramEdge[] = [];

    // Pattern: A -> B -> C [label="text"] or A -- B
    // First, extract attributes if present
    const attrMatch = line.match(/\[([^\]]+)\]\s*$/);
    const attrs = attrMatch ? parseAttributes(attrMatch[1]) : {};
    const lineWithoutAttrs = attrMatch ? line.replace(/\s*\[[^\]]+\]\s*$/, '') : line;

    // Split by arrow operators
    const parts = lineWithoutAttrs.split(/\s*(->|--)\s*/);
    if (parts.length < 3) return edges;

    // Determine if directed
    const isDirected = lineWithoutAttrs.includes('->');

    // Create edges for each pair
    for (let i = 0; i < parts.length - 2; i += 2) {
        const sourceId = parts[i].trim();
        const targetId = parts[i + 2].trim();

        if (!sourceId || !targetId) continue;

        // Ensure nodes exist
        ensureNode(sourceId, nodeMap, diagram, currentGroup);
        ensureNode(targetId, nodeMap, diagram, currentGroup);

        const edge = createEdge(sourceId, targetId, {
            label: attrs.label,
            arrow: {
                sourceType: attrs.dir === 'back' || attrs.dir === 'both' ? 'arrow' : 'none',
                targetType: isDirected && attrs.dir !== 'back' ? mapDotArrowhead(attrs.arrowhead) : 'none',
                lineType: attrs.style === 'dashed' ? 'dashed' : attrs.style === 'dotted' ? 'dotted' : 'solid',
            },
            style: {
                stroke: attrs.color,
                strokeWidth: attrs.penwidth ? parseFloat(attrs.penwidth) : undefined,
            },
        });

        edges.push(edge);
    }

    return edges;
}

/** Ensure node exists */
function ensureNode(
    id: string,
    nodeMap: Map<string, DiagramNode>,
    diagram: Diagram,
    currentGroup: DiagramGroup | null
): void {
    if (!nodeMap.has(id)) {
        const node = createNode(id, id);
        nodeMap.set(id, node);
        diagram.nodes.push(node);

        if (currentGroup) {
            currentGroup.children.push(id);
        }
    }
}

/** Parse DOT attributes string */
function parseAttributes(str: string): Record<string, string> {
    const attrs: Record<string, string> = {};

    // Match key=value or key="value" or key=<html>
    const regex = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)'|<([^>]*)>|(\S+))/g;
    let match;

    while ((match = regex.exec(str)) !== null) {
        const [, key, val1, val2, val3, val4] = match;
        attrs[key.toLowerCase()] = val1 ?? val2 ?? val3 ?? val4 ?? '';
    }

    return attrs;
}

/** Map DOT arrowhead to IR type */
function mapDotArrowhead(arrowhead?: string): 'none' | 'arrow' | 'open' | 'diamond' | 'diamond-filled' | 'circle' | 'circle-filled' | 'cross' | 'bar' {
    if (!arrowhead) return 'arrow';

    const map: Record<string, 'none' | 'arrow' | 'open' | 'diamond' | 'diamond-filled' | 'circle' | 'circle-filled' | 'cross' | 'bar'> = {
        'none': 'none',
        'normal': 'arrow',
        'open': 'open',
        'empty': 'open',
        'diamond': 'diamond',
        'odiamond': 'diamond',
        'dot': 'circle-filled',
        'odot': 'circle',
        'box': 'bar',
        'obox': 'bar',
        'crow': 'arrow',
        'inv': 'arrow',
        'tee': 'bar',
        'vee': 'open',
    };

    return map[arrowhead.toLowerCase()] || 'arrow';
}

/** Map DOT shape to IR shape */
function mapDotShape(shape?: string): NodeShape {
    if (!shape) return 'rectangle';

    const shapeMap: Record<string, NodeShape> = {
        'box': 'rectangle',
        'rect': 'rectangle',
        'rectangle': 'rectangle',
        'square': 'rectangle',
        'box3d': 'rectangle',
        'roundedbox': 'rounded-rectangle',
        'ellipse': 'ellipse',
        'oval': 'ellipse',
        'circle': 'circle',
        'doublecircle': 'circle',
        'point': 'circle',
        'diamond': 'diamond',
        'rhombus': 'diamond',
        'hexagon': 'hexagon',
        'parallelogram': 'parallelogram',
        'trapezium': 'trapezoid',
        'invtrapezium': 'trapezoid',
        'cylinder': 'cylinder',
        'note': 'note',
        'tab': 'note',
        'folder': 'document',
        'component': 'rectangle',
        'cds': 'cylinder',
        'actor': 'actor',
        'house': 'hexagon',
        'invhouse': 'hexagon',
        'star': 'diamond',
        'tripleoctagon': 'hexagon',
        'doubleoctagon': 'hexagon',
        'octagon': 'hexagon',
        'pentagon': 'hexagon',
        'septagon': 'hexagon',
        'plaintext': 'rectangle',
        'plain': 'rectangle',
        'none': 'rectangle',
        'record': 'rectangle',
        'Mrecord': 'rounded-rectangle',
    };

    return shapeMap[shape.toLowerCase()] || 'rectangle';
}
