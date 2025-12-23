/**
 * GraphML Parser
 * 
 * Parses GraphML XML format to IR
 * Standard XML format for graphs (yEd, Gephi, etc.)
 */

import type { Diagram, DiagramNode, DiagramEdge, DiagramGroup, NodeShape } from '../types';

/** Parse GraphML XML to IR */
export function parseGraphml(xml: string): Diagram {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');

    const nodes: DiagramNode[] = [];
    const edges: DiagramEdge[] = [];
    const groups: DiagramGroup[] = [];

    // Parse key definitions for data attributes
    const keys = new Map<string, { for: string; name: string }>();
    doc.querySelectorAll('key').forEach(key => {
        const id = key.getAttribute('id') || '';
        const forAttr = key.getAttribute('for') || 'all';
        const name = key.getAttribute('attr.name') || id;
        keys.set(id, { for: forAttr, name });
    });

    // Parse nodes
    const nodeElements = doc.querySelectorAll('graph > node');
    nodeElements.forEach(nodeEl => {
        const id = nodeEl.getAttribute('id') || `node-${nodes.length}`;

        // Check if it's a group node (has nested graph)
        const nestedGraph = nodeEl.querySelector('graph');
        if (nestedGraph) {
            const label = getDataValue(nodeEl, 'label', keys) || id;
            groups.push({
                id,
                type: 'group',
                label,
                children: [],
                style: {},
            });

            // Parse nested nodes
            nestedGraph.querySelectorAll(':scope > node').forEach(nested => {
                const nestedId = nested.getAttribute('id') || '';
                const nestedLabel = getDataValue(nested, 'label', keys) || nestedId;
                const shape = detectGraphmlShape(nested, keys);

                nodes.push({ id: nestedId, type: 'node', label: nestedLabel, shape, style: {} });

                const group = groups.find(g => g.id === id);
                if (group) group.children.push(nestedId);
            });
        } else {
            const label = getDataValue(nodeEl, 'label', keys) || id;
            const shape = detectGraphmlShape(nodeEl, keys);
            nodes.push({ id, type: 'node', label, shape, style: {} });
        }
    });

    // Parse edges
    const edgeElements = doc.querySelectorAll('graph > edge');
    edgeElements.forEach(edgeEl => {
        const id = edgeEl.getAttribute('id') || `edge-${edges.length}`;
        const source = edgeEl.getAttribute('source') || '';
        const target = edgeEl.getAttribute('target') || '';
        const label = getDataValue(edgeEl, 'label', keys) || '';
        const directed = edgeEl.closest('graph')?.getAttribute('edgedefault') !== 'undirected';

        if (source && target) {
            edges.push({
                id,
                type: 'edge',
                source,
                target,
                label: label || undefined,
                arrow: {
                    sourceType: 'none',
                    targetType: directed ? 'arrow' : 'none',
                    lineType: 'solid',
                },
                style: {},
            });
        }
    });

    return {
        id: 'graphml-diagram',
        type: 'flowchart',
        nodes,
        edges,
        groups,
        metadata: { source: 'graphml' },
    };
}

function getDataValue(element: Element, attrName: string, keys: Map<string, { for: string; name: string }>): string | null {
    // Find key id for this attribute name
    for (const [keyId, keyInfo] of keys) {
        if (keyInfo.name === attrName || keyId === attrName) {
            const dataEl = element.querySelector(`data[key="${keyId}"]`);
            if (dataEl) return dataEl.textContent;
        }
    }
    // Try direct data element
    const directData = element.querySelector(`data[key="${attrName}"]`);
    return directData?.textContent || null;
}

function detectGraphmlShape(element: Element, keys: Map<string, { for: string; name: string }>): NodeShape {
    const shapeData = getDataValue(element, 'shape', keys) || getDataValue(element, 'type', keys) || '';
    const lower = shapeData.toLowerCase();

    if (lower.includes('ellipse') || lower.includes('circle')) return 'ellipse';
    if (lower.includes('diamond')) return 'diamond';
    if (lower.includes('hexagon')) return 'hexagon';
    if (lower.includes('cylinder') || lower.includes('database')) return 'cylinder';
    if (lower.includes('rounded')) return 'rounded-rectangle';

    return 'rectangle';
}
