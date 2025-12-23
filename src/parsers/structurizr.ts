/**
 * Structurizr DSL Parser
 * 
 * Parses Structurizr DSL (C4 model) to IR
 * https://structurizr.com/dsl
 */

import type { Diagram, DiagramNode, DiagramEdge, DiagramGroup, NodeShape } from '../types';

/** Parse Structurizr DSL to IR */
export function parseStructurizr(code: string): Diagram {
    const lines = code.split('\n');
    const nodes = new Map<string, DiagramNode>();
    const edges: DiagramEdge[] = [];
    const groups: DiagramGroup[] = [];

    let edgeId = 0;
    const containerStack: string[] = [];
    const nodeToContainer = new Map<string, string>();

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('//') || line.startsWith('#')) continue;

        // Parse person: person <id> <name> [description] [tags]
        const personMatch = line.match(/^person\s+(\w+)\s+"([^"]+)"(?:\s+"([^"]+)")?/i);
        if (personMatch) {
            const [, id, name] = personMatch;
            nodes.set(id, createNode(id, name, 'actor'));
            addToContainer(id, containerStack, nodeToContainer);
            continue;
        }

        // Parse softwareSystem: softwareSystem <id> <name> [description]
        const systemMatch = line.match(/^softwareSystem\s+(\w+)\s+"([^"]+)"(?:\s+"([^"]+)")?/i);
        if (systemMatch) {
            const [, id, name] = systemMatch;
            nodes.set(id, createNode(id, name, 'rectangle'));
            addToContainer(id, containerStack, nodeToContainer);
            continue;
        }

        // Parse container: container <id> <name> [technology] [description]
        const containerMatch = line.match(/^container\s+(\w+)\s+"([^"]+)"(?:\s+"([^"]+)")?/i);
        if (containerMatch) {
            const [, id, name, tech] = containerMatch;
            const node = createNode(id, tech ? `${name}\n[${tech}]` : name, 'rectangle');
            nodes.set(id, node);
            addToContainer(id, containerStack, nodeToContainer);
            continue;
        }

        // Parse component: component <id> <name> [technology] [description]
        const componentMatch = line.match(/^component\s+(\w+)\s+"([^"]+)"(?:\s+"([^"]+)")?/i);
        if (componentMatch) {
            const [, id, name, tech] = componentMatch;
            const node = createNode(id, tech ? `${name}\n[${tech}]` : name, 'rectangle');
            nodes.set(id, node);
            addToContainer(id, containerStack, nodeToContainer);
            continue;
        }

        // Parse relationship: <source> -> <target> [description] [technology]
        const relMatch = line.match(/^(\w+)\s*->\s*(\w+)(?:\s+"([^"]+)")?(?:\s+"([^"]+)")?/);
        if (relMatch) {
            const [, sourceId, targetId, desc, tech] = relMatch;
            const label = tech ? `${desc || ''} [${tech}]`.trim() : desc;

            edges.push({
                id: `edge-${edgeId++}`,
                type: 'edge',
                source: sourceId,
                target: targetId,
                label,
                arrow: { sourceType: 'none', targetType: 'arrow', lineType: 'solid' },
                style: {},
            });
            continue;
        }

        // Parse group/boundary: <type> <id> { or <type> <id> <name> {
        const groupMatch = line.match(/^(enterprise|group|softwareSystemBoundary|containerBoundary)\s+(\w+)(?:\s+"([^"]+)")?\s*\{/i);
        if (groupMatch) {
            const [, type, id, name] = groupMatch;
            groups.push({
                id,
                type: 'group',
                label: name || id,
                children: [],
                style: {},
                metadata: { structurizrType: type },
            });
            containerStack.push(id);
            continue;
        }

        // Closing brace
        if (line === '}') {
            containerStack.pop();
        }
    }

    // Assign nodes to groups
    for (const [nodeId, groupId] of nodeToContainer) {
        const group = groups.find(g => g.id === groupId);
        if (group) group.children.push(nodeId);
    }

    return {
        id: 'structurizr-diagram',
        type: 'flowchart',
        nodes: Array.from(nodes.values()),
        edges,
        groups,
        metadata: { source: 'structurizr' },
    };
}

function createNode(id: string, label: string, shape: NodeShape): DiagramNode {
    return { id, type: 'node', label, shape, style: {} };
}

function addToContainer(nodeId: string, stack: string[], map: Map<string, string>): void {
    if (stack.length > 0) {
        map.set(nodeId, stack[stack.length - 1]);
    }
}
