/**
 * Structurizr DSL Parser
 *
 * Parses Structurizr DSL (C4 model) to IR
 * https://structurizr.com/dsl
 */

import type { Diagram, DiagramNode, DiagramEdge, DiagramGroup, NodeShape } from '../types';
import { validateInput } from './base';

/** Parse Structurizr DSL to IR */
export function parseStructurizr(code: string): Diagram {
    validateInput(code, 'structurizr');

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

        // Backward compatibility: support non-assignment form used by older tests
        // person <id> "Name" ...
        // softwareSystem <id> "Name" ...
        // container <id> "Name" ...
        // component <id> "Name" ...
        const legacyPerson = line.match(
            /^person\s+(\w+)\s+"([^"]*(?:""[^"]*)*)"(?:\s+"([^"]+)")?/i
        );
        if (legacyPerson) {
            const [, id, name] = legacyPerson;
            nodes.set(id, createNode(id, unquoteStructurizrLabel(name), 'actor'));
            addToContainer(id, containerStack, nodeToContainer);
            continue;
        }

        const legacySystem = line.match(
            /^softwareSystem\s+(\w+)\s+"([^"]*(?:""[^"]*)*)"(?:\s+"([^"]+)")?/i
        );
        if (legacySystem) {
            const [, id, name] = legacySystem;
            nodes.set(id, createNode(id, unquoteStructurizrLabel(name), 'rectangle'));
            addToContainer(id, containerStack, nodeToContainer);
            continue;
        }

        const legacyContainer = line.match(
            /^container\s+(\w+)\s+"([^"]*(?:""[^"]*)*)"(?:\s+"([^"]+)")?/i
        );
        if (legacyContainer) {
            const [, id, name, tech] = legacyContainer;
            const normalizedName = unquoteStructurizrLabel(name);
            const node = createNode(
                id,
                tech ? `${normalizedName}\n[${tech}]` : normalizedName,
                'rectangle'
            );
            nodes.set(id, node);
            addToContainer(id, containerStack, nodeToContainer);
            continue;
        }

        const legacyComponent = line.match(
            /^component\s+(\w+)\s+"([^"]*(?:""[^"]*)*)"(?:\s+"([^"]+)")?/i
        );
        if (legacyComponent) {
            const [, id, name, tech] = legacyComponent;
            const normalizedName = unquoteStructurizrLabel(name);
            const node = createNode(
                id,
                tech ? `${normalizedName}\n[${tech}]` : normalizedName,
                'rectangle'
            );
            nodes.set(id, node);
            addToContainer(id, containerStack, nodeToContainer);
            continue;
        }

        // Parse person assignment: <id> = person "Name" [description]
        const personMatch = line.match(
            /^(\w+)\s*=\s*person\s+"([^"]*(?:""[^"]*)*)"(?:\s+"([^"]+)"+)?/i
        );
        if (personMatch) {
            const [, id, name] = personMatch;
            nodes.set(id, createNode(id, unquoteStructurizrLabel(name), 'actor'));
            addToContainer(id, containerStack, nodeToContainer);

            if (line.includes('{')) {
                containerStack.push(id);
            }
            continue;
        }

        // Parse softwareSystem assignment: <id> = softwareSystem "Name" [description]
        const systemMatch = line.match(
            /^(\w+)\s*=\s*softwareSystem\s+"([^"]*(?:""[^"]*)*)"(?:\s+"([^"]+)")?/i
        );
        if (systemMatch) {
            const [, id, name] = systemMatch;
            const normalizedName = unquoteStructurizrLabel(name);
            nodes.set(id, createNode(id, normalizedName, 'rectangle'));
            addToContainer(id, containerStack, nodeToContainer);

            if (line.includes('{')) {
                if (!groups.some(g => g.id === id)) {
                    groups.push({
                        id,
                        type: 'group',
                        label: normalizedName,
                        children: [],
                        style: {},
                        metadata: { structurizrType: 'softwareSystem' },
                    });
                }
                containerStack.push(id);
            }
            continue;
        }

        // Parse container assignment: <id> = container "Name" [technology] [description]
        const containerMatch = line.match(
            /^(\w+)\s*=\s*container\s+"([^"]*(?:""[^"]*)*)"(?:\s+"([^"]+)")?/i
        );
        if (containerMatch) {
            const [, id, name, tech] = containerMatch;
            const normalizedName = unquoteStructurizrLabel(name);
            const node = createNode(
                id,
                tech ? `${normalizedName}\n[${tech}]` : normalizedName,
                'rectangle'
            );
            nodes.set(id, node);
            addToContainer(id, containerStack, nodeToContainer);

            if (line.includes('{')) {
                if (!groups.some(g => g.id === id)) {
                    groups.push({
                        id,
                        type: 'group',
                        label: normalizedName,
                        children: [],
                        style: {},
                        metadata: { structurizrType: 'container' },
                    });
                }
                containerStack.push(id);
            }
            continue;
        }

        // Parse component assignment: <id> = component "Name" [technology] [description]
        const componentMatch = line.match(
            /^(\w+)\s*=\s*component\s+"([^"]*(?:""[^"]*)*)"(?:\s+"([^"]+)")?/i
        );
        if (componentMatch) {
            const [, id, name, tech] = componentMatch;
            const normalizedName = unquoteStructurizrLabel(name);
            const node = createNode(
                id,
                tech ? `${normalizedName}\n[${tech}]` : normalizedName,
                'rectangle'
            );
            nodes.set(id, node);
            addToContainer(id, containerStack, nodeToContainer);

            if (line.includes('{')) {
                containerStack.push(id);
            }
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

        // Parse group/boundary: <type> <id> { or <type> <id> "name" {
        const groupMatch = line.match(
            /^(enterprise|group|softwareSystemBoundary|containerBoundary)\s+(\w+)(?:\s+"([^"]+)")?\s*\{/i
        );
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

function unquoteStructurizrLabel(label: string): string {
    let result = label.trim();

    while (
        (result.startsWith('"') && result.endsWith('"')) ||
        (result.startsWith("'") && result.endsWith("'"))
    ) {
        result = result.slice(1, -1).trim();
    }

    return result.replace(/""/g, '"');
}

function createNode(id: string, label: string, shape: NodeShape): DiagramNode {
    return { id, type: 'node', label, shape, style: {} };
}

function addToContainer(nodeId: string, stack: string[], map: Map<string, string>): void {
    if (stack.length > 0) {
        map.set(nodeId, stack[stack.length - 1]);
    }
}
