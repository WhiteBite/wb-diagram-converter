/**
 * D2 Parser
 * 
 * Parses D2 diagram language to IR
 * D2 is a modern diagram scripting language
 * https://d2lang.com/
 */

import type { Diagram, DiagramNode, DiagramEdge, DiagramGroup, NodeShape } from '../types';

/** Parse D2 code to IR */
export function parseD2(code: string): Diagram {
    const lines = code.split('\n');
    const nodes = new Map<string, DiagramNode>();
    const edges: DiagramEdge[] = [];
    const groups: DiagramGroup[] = [];

    let edgeId = 0;
    const groupStack: string[] = [];
    const nodeToGroup = new Map<string, string>();

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        // Check for group/container definition: name: { or name { 
        const groupMatch = line.match(/^(\w+)\s*:\s*\{?\s*$/) || line.match(/^(\w+)\s*\{\s*$/);
        if (groupMatch && line.includes('{')) {
            const groupId = groupMatch[1];
            groups.push({
                id: groupId,
                type: 'group',
                label: groupId,
                children: [],
                style: {},
            });
            groupStack.push(groupId);
            continue;
        }

        // Check for closing brace
        if (line === '}') {
            groupStack.pop();
            continue;
        }

        // Parse edge: a -> b or a -- b or a <-> b
        const edgeMatch = line.match(/^(\w+)\s*(->|<->|--|<-)\s*(\w+)(?:\s*:\s*(.+))?$/);
        if (edgeMatch) {
            const [, sourceId, arrow, targetId, label] = edgeMatch;

            // Ensure nodes exist
            ensureNode(nodes, sourceId, groupStack, nodeToGroup);
            ensureNode(nodes, targetId, groupStack, nodeToGroup);

            edges.push({
                id: `edge-${edgeId++}`,
                type: 'edge',
                source: sourceId,
                target: targetId,
                label: label?.trim(),
                arrow: {
                    sourceType: arrow === '<->' || arrow === '<-' ? 'arrow' : 'none',
                    targetType: arrow === '->' || arrow === '<->' ? 'arrow' : 'none',
                    lineType: arrow === '--' ? 'dashed' : 'solid',
                },
                style: {},
            });
            continue;
        }

        // Parse node definition: name: label or name: { shape: ... }
        const nodeMatch = line.match(/^(\w+)\s*:\s*(.+)$/);
        if (nodeMatch) {
            const [, id, value] = nodeMatch;
            const shape = detectD2Shape(value);
            const label = value.replace(/\{.*\}/, '').trim();

            const node = ensureNode(nodes, id, groupStack, nodeToGroup);
            node.label = label || id;
            node.shape = shape;
            continue;
        }

        // Simple node reference
        const simpleNode = line.match(/^(\w+)$/);
        if (simpleNode) {
            ensureNode(nodes, simpleNode[1], groupStack, nodeToGroup);
        }
    }

    // Assign nodes to groups
    for (const [nodeId, groupId] of nodeToGroup) {
        const group = groups.find(g => g.id === groupId);
        if (group) {
            group.children.push(nodeId);
        }
    }

    return {
        id: 'd2-diagram',
        type: 'flowchart',
        nodes: Array.from(nodes.values()),
        edges,
        groups,
        metadata: { source: 'd2' },
    };
}

function ensureNode(
    nodes: Map<string, DiagramNode>,
    id: string,
    groupStack: string[],
    nodeToGroup: Map<string, string>
): DiagramNode {
    if (!nodes.has(id)) {
        const node: DiagramNode = {
            id,
            type: 'node',
            label: id,
            shape: 'rectangle',
            style: {},
        };
        nodes.set(id, node);

        if (groupStack.length > 0) {
            nodeToGroup.set(id, groupStack[groupStack.length - 1]);
        }
    }
    return nodes.get(id)!;
}

function detectD2Shape(value: string): NodeShape {
    const lower = value.toLowerCase();
    if (lower.includes('circle') || lower.includes('oval')) return 'circle';
    if (lower.includes('diamond')) return 'diamond';
    if (lower.includes('cylinder') || lower.includes('database')) return 'cylinder';
    if (lower.includes('hexagon')) return 'hexagon';
    if (lower.includes('cloud')) return 'cloud';
    if (lower.includes('person') || lower.includes('actor')) return 'actor';
    return 'rectangle';
}
