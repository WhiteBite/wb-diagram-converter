/**
 * Diagram Mutator - Fluent API for modifying existing diagrams
 * 
 * All operations are immutable - returns new mutator instance.
 * Changes are not applied until apply() is called.
 */

import type {
    Diagram,
    DiagramNode,
    DiagramEdge,
    DiagramGroup,
    Position,
    Size,
} from '../types/ir';
import type {
    DiagramMutator as IMutator,
    NodeConfig,
    EdgeConfig,
    GroupConfig,
} from '../types/api';
import type { MutationOperation } from '../types/mutations';
import { cloneDiagram } from '../utils/ir-cloner';
import { validateDiagram } from '../utils/ir-validator';

/**
 * Implementation of DiagramMutator interface
 * All operations are immutable - returns new mutator instance
 */
class DiagramMutator implements IMutator {
    private readonly diagram: Diagram;
    private readonly operations: MutationOperation[];

    constructor(diagram: Diagram, operations: MutationOperation[] = []) {
        this.diagram = cloneDiagram(diagram);
        this.operations = [...operations];
    }

    /**
     * Create a new mutator with an additional operation
     */
    private clone(newOp: MutationOperation): DiagramMutator {
        return new DiagramMutator(this.diagram, [...this.operations, newOp]);
    }

    // =========================================================================
    // Node operations
    // =========================================================================

    addNode(config: NodeConfig): DiagramMutator {
        return this.clone({ type: 'addNode', config });
    }

    updateNode(id: string, updates: Partial<DiagramNode>): DiagramMutator {
        return this.clone({ type: 'updateNode', id, updates });
    }

    removeNode(id: string, cascade = true): DiagramMutator {
        return this.clone({ type: 'removeNode', id, cascade });
    }

    moveNode(id: string, position: Position): DiagramMutator {
        return this.clone({ type: 'moveNode', id, position });
    }

    resizeNode(id: string, size: Size): DiagramMutator {
        return this.clone({ type: 'resizeNode', id, size });
    }

    // =========================================================================
    // Edge operations
    // =========================================================================

    addEdge(config: EdgeConfig): DiagramMutator {
        return this.clone({ type: 'addEdge', config });
    }

    updateEdge(id: string, updates: Partial<DiagramEdge>): DiagramMutator {
        return this.clone({ type: 'updateEdge', id, updates });
    }

    removeEdge(id: string): DiagramMutator {
        return this.clone({ type: 'removeEdge', id });
    }

    reconnectEdge(id: string, source?: string, target?: string): DiagramMutator {
        return this.clone({ type: 'reconnectEdge', id, source, target });
    }

    // =========================================================================
    // Group operations
    // =========================================================================

    addGroup(config: GroupConfig): DiagramMutator {
        return this.clone({ type: 'addGroup', config });
    }

    updateGroup(id: string, updates: Partial<DiagramGroup>): DiagramMutator {
        return this.clone({ type: 'updateGroup', id, updates });
    }

    removeGroup(id: string, ungroup = false): DiagramMutator {
        return this.clone({ type: 'removeGroup', id, ungroup });
    }

    addToGroup(groupId: string, elementIds: string[]): DiagramMutator {
        return this.clone({ type: 'addToGroup', groupId, elementIds });
    }

    removeFromGroup(groupId: string, elementIds: string[]): DiagramMutator {
        return this.clone({ type: 'removeFromGroup', groupId, elementIds });
    }

    // =========================================================================
    // Batch operations
    // =========================================================================

    batch(operations: MutationOperation[]): DiagramMutator {
        return new DiagramMutator(this.diagram, [...this.operations, ...operations]);
    }

    // =========================================================================
    // Finalization
    // =========================================================================

    apply(): Diagram {
        let current = cloneDiagram(this.diagram);

        for (const op of this.operations) {
            current = applyOperation(current, op);
        }

        // Validate result
        const result = validateDiagram(current, {
            checkReferences: true,
            checkLayout: false,
        });

        if (!result.valid) {
            const firstError = result.errors[0];
            throw new Error(`Invalid diagram after mutations: ${firstError.message} (${firstError.path})`);
        }

        return current;
    }

    preview(): Diagram {
        let current = cloneDiagram(this.diagram);
        for (const op of this.operations) {
            current = applyOperation(current, op);
        }
        return current;
    }

    getOperations(): MutationOperation[] {
        return [...this.operations];
    }

    reset(): DiagramMutator {
        return new DiagramMutator(this.diagram, []);
    }
}

// =============================================================================
// Operation Application Functions
// =============================================================================

/**
 * Applies a single mutation operation to a diagram
 */
function applyOperation(diagram: Diagram, op: MutationOperation): Diagram {
    switch (op.type) {
        case 'addNode':
            return addNodeOp(diagram, op.config);
        case 'updateNode':
            return updateNodeOp(diagram, op.id, op.updates);
        case 'removeNode':
            return removeNodeOp(diagram, op.id, op.cascade);
        case 'moveNode':
            return moveNodeOp(diagram, op.id, op.position);
        case 'resizeNode':
            return resizeNodeOp(diagram, op.id, op.size);
        case 'addEdge':
            return addEdgeOp(diagram, op.config);
        case 'updateEdge':
            return updateEdgeOp(diagram, op.id, op.updates);
        case 'removeEdge':
            return removeEdgeOp(diagram, op.id);
        case 'reconnectEdge':
            return reconnectEdgeOp(diagram, op.id, op.source, op.target);
        case 'addGroup':
            return addGroupOp(diagram, op.config);
        case 'updateGroup':
            return updateGroupOp(diagram, op.id, op.updates);
        case 'removeGroup':
            return removeGroupOp(diagram, op.id, op.ungroup);
        case 'addToGroup':
            return addToGroupOp(diagram, op.groupId, op.elementIds);
        case 'removeFromGroup':
            return removeFromGroupOp(diagram, op.groupId, op.elementIds);
    }
}

// =============================================================================
// Node Operation Implementations
// =============================================================================

function addNodeOp(diagram: Diagram, config: NodeConfig): Diagram {
    // Check for duplicate ID
    const existingIds = new Set([
        ...diagram.nodes.map(n => n.id),
        ...diagram.groups.map(g => g.id),
    ]);

    if (existingIds.has(config.id)) {
        throw new Error(`Node with ID '${config.id}' already exists`);
    }

    const node: DiagramNode = {
        id: config.id,
        type: 'node',
        label: config.label,
        shape: config.shape || 'rectangle',
        position: config.position,
        size: config.size,
        style: {
            fill: '#ffffff',
            stroke: '#000000',
            strokeWidth: 2,
            fontSize: 14,
            fontFamily: 'Arial',
            fontColor: '#000000',
            fontWeight: 'normal',
            textAlign: 'center',
            opacity: 1,
            shadow: false,
            rounded: 0,
            ...config.style,
        },
        ports: config.ports,
        metadata: config.metadata,
    };

    return {
        ...diagram,
        nodes: [...diagram.nodes, node],
    };
}

function updateNodeOp(diagram: Diagram, id: string, updates: Partial<DiagramNode>): Diagram {
    const nodeIndex = diagram.nodes.findIndex(n => n.id === id);
    if (nodeIndex === -1) {
        throw new Error(`Node '${id}' not found`);
    }

    const updatedNodes = [...diagram.nodes];
    updatedNodes[nodeIndex] = {
        ...updatedNodes[nodeIndex],
        ...updates,
        id, // Preserve ID
        type: 'node', // Preserve type
    };

    return {
        ...diagram,
        nodes: updatedNodes,
    };
}

function removeNodeOp(diagram: Diagram, id: string, cascade?: boolean): Diagram {
    const nodeIndex = diagram.nodes.findIndex(n => n.id === id);
    if (nodeIndex === -1) {
        throw new Error(`Node '${id}' not found`);
    }

    const nodes = diagram.nodes.filter(n => n.id !== id);
    let edges = diagram.edges;

    // Remove connected edges if cascade is true
    if (cascade) {
        edges = edges.filter(e => e.source !== id && e.target !== id);
    } else {
        // Check if any edges reference this node
        const hasReferences = edges.some(e => e.source === id || e.target === id);
        if (hasReferences) {
            throw new Error(`Cannot remove node '${id}': it is referenced by edges (use cascade=true to remove edges)`);
        }
    }

    // Remove from groups
    const groups = diagram.groups.map(g => ({
        ...g,
        children: g.children.filter(childId => childId !== id),
    }));

    return {
        ...diagram,
        nodes,
        edges,
        groups,
    };
}

function moveNodeOp(diagram: Diagram, id: string, position: Position): Diagram {
    const nodeIndex = diagram.nodes.findIndex(n => n.id === id);
    if (nodeIndex === -1) {
        throw new Error(`Node '${id}' not found`);
    }

    const updatedNodes = [...diagram.nodes];
    updatedNodes[nodeIndex] = {
        ...updatedNodes[nodeIndex],
        position: { ...position },
    };

    return {
        ...diagram,
        nodes: updatedNodes,
    };
}

function resizeNodeOp(diagram: Diagram, id: string, size: Size): Diagram {
    const nodeIndex = diagram.nodes.findIndex(n => n.id === id);
    if (nodeIndex === -1) {
        throw new Error(`Node '${id}' not found`);
    }

    if (size.width <= 0 || size.height <= 0) {
        throw new Error(`Invalid size for node '${id}': dimensions must be positive`);
    }

    const updatedNodes = [...diagram.nodes];
    updatedNodes[nodeIndex] = {
        ...updatedNodes[nodeIndex],
        size: { ...size },
    };

    return {
        ...diagram,
        nodes: updatedNodes,
    };
}

// =============================================================================
// Edge Operation Implementations
// =============================================================================

function addEdgeOp(diagram: Diagram, config: EdgeConfig): Diagram {
    const nodeIds = new Set(diagram.nodes.map(n => n.id));

    // Validate source and target exist
    if (!nodeIds.has(config.source)) {
        throw new Error(`Source node '${config.source}' not found`);
    }
    if (!nodeIds.has(config.target)) {
        throw new Error(`Target node '${config.target}' not found`);
    }

    // Generate ID if not provided
    const id = config.id || `${config.source}-${config.target}`;

    // Check ID uniqueness
    const existingIds = new Set(diagram.edges.map(e => e.id));
    if (existingIds.has(id)) {
        throw new Error(`Edge with ID '${id}' already exists`);
    }

    const edge: DiagramEdge = {
        id,
        type: 'edge',
        source: config.source,
        target: config.target,
        sourcePort: config.sourcePort,
        targetPort: config.targetPort,
        label: config.label,
        labelPosition: config.labelPosition || 'middle',
        arrow: {
            sourceType: 'none',
            targetType: 'arrow',
            lineType: 'solid',
            ...config.arrow,
        },
        style: {
            stroke: '#000000',
            strokeWidth: 2,
            opacity: 1,
            ...config.style,
        },
        waypoints: config.waypoints,
        metadata: config.metadata,
    };

    return {
        ...diagram,
        edges: [...diagram.edges, edge],
    };
}

function updateEdgeOp(diagram: Diagram, id: string, updates: Partial<DiagramEdge>): Diagram {
    const edgeIndex = diagram.edges.findIndex(e => e.id === id);
    if (edgeIndex === -1) {
        throw new Error(`Edge '${id}' not found`);
    }

    const updatedEdges = [...diagram.edges];
    updatedEdges[edgeIndex] = {
        ...updatedEdges[edgeIndex],
        ...updates,
        id, // Preserve ID
        type: 'edge', // Preserve type
    };

    return {
        ...diagram,
        edges: updatedEdges,
    };
}

function removeEdgeOp(diagram: Diagram, id: string): Diagram {
    const edgeIndex = diagram.edges.findIndex(e => e.id === id);
    if (edgeIndex === -1) {
        throw new Error(`Edge '${id}' not found`);
    }

    return {
        ...diagram,
        edges: diagram.edges.filter(e => e.id !== id),
    };
}

function reconnectEdgeOp(diagram: Diagram, id: string, source?: string, target?: string): Diagram {
    const edgeIndex = diagram.edges.findIndex(e => e.id === id);
    if (edgeIndex === -1) {
        throw new Error(`Edge '${id}' not found`);
    }

    const nodeIds = new Set(diagram.nodes.map(n => n.id));
    const edge = diagram.edges[edgeIndex];

    const newSource = source || edge.source;
    const newTarget = target || edge.target;

    if (!nodeIds.has(newSource)) {
        throw new Error(`Source node '${newSource}' not found`);
    }
    if (!nodeIds.has(newTarget)) {
        throw new Error(`Target node '${newTarget}' not found`);
    }

    const updatedEdges = [...diagram.edges];
    updatedEdges[edgeIndex] = {
        ...edge,
        source: newSource,
        target: newTarget,
    };

    return {
        ...diagram,
        edges: updatedEdges,
    };
}

// =============================================================================
// Group Operation Implementations
// =============================================================================

function addGroupOp(diagram: Diagram, config: GroupConfig): Diagram {
    const allIds = new Set([
        ...diagram.nodes.map(n => n.id),
        ...diagram.groups.map(g => g.id),
    ]);

    // Validate group ID uniqueness
    if (allIds.has(config.id)) {
        throw new Error(`Group with ID '${config.id}' already exists`);
    }

    // Validate all children exist
    for (const childId of config.children) {
        if (!allIds.has(childId)) {
            throw new Error(`Child element '${childId}' not found`);
        }
    }

    const group: DiagramGroup = {
        id: config.id,
        type: 'group',
        label: config.label,
        children: config.children,
        position: config.position,
        size: config.size,
        style: {
            fill: '#f0f0f0',
            stroke: '#cccccc',
            strokeWidth: 1,
            opacity: 0.5,
            labelPosition: 'top',
            ...config.style,
        },
        collapsed: config.collapsed || false,
        metadata: config.metadata,
    };

    return {
        ...diagram,
        groups: [...diagram.groups, group],
    };
}

function updateGroupOp(diagram: Diagram, id: string, updates: Partial<DiagramGroup>): Diagram {
    const groupIndex = diagram.groups.findIndex(g => g.id === id);
    if (groupIndex === -1) {
        throw new Error(`Group '${id}' not found`);
    }

    const updatedGroups = [...diagram.groups];
    updatedGroups[groupIndex] = {
        ...updatedGroups[groupIndex],
        ...updates,
        id, // Preserve ID
        type: 'group', // Preserve type
    };

    return {
        ...diagram,
        groups: updatedGroups,
    };
}

function removeGroupOp(diagram: Diagram, id: string, ungroup?: boolean): Diagram {
    const groupIndex = diagram.groups.findIndex(g => g.id === id);
    if (groupIndex === -1) {
        throw new Error(`Group '${id}' not found`);
    }

    const group = diagram.groups[groupIndex];
    let groups = diagram.groups.filter(g => g.id !== id);

    if (!ungroup) {
        // Remove children as well
        const childrenToRemove = new Set(group.children);
        const nodes = diagram.nodes.filter(n => !childrenToRemove.has(n.id));
        groups = groups.filter(g => !childrenToRemove.has(g.id));

        // Remove edges connected to removed nodes
        const remainingNodeIds = new Set(nodes.map(n => n.id));
        const edges = diagram.edges.filter(e =>
            remainingNodeIds.has(e.source) && remainingNodeIds.has(e.target)
        );

        return {
            ...diagram,
            nodes,
            edges,
            groups,
        };
    }

    return {
        ...diagram,
        groups,
    };
}

function addToGroupOp(diagram: Diagram, groupId: string, elementIds: string[]): Diagram {
    const groupIndex = diagram.groups.findIndex(g => g.id === groupId);
    if (groupIndex === -1) {
        throw new Error(`Group '${groupId}' not found`);
    }

    const allIds = new Set([
        ...diagram.nodes.map(n => n.id),
        ...diagram.groups.map(g => g.id),
    ]);

    // Validate all elements exist
    for (const elementId of elementIds) {
        if (!allIds.has(elementId)) {
            throw new Error(`Element '${elementId}' not found`);
        }
    }

    const updatedGroups = [...diagram.groups];
    const group = updatedGroups[groupIndex];
    const newChildren = [...new Set([...group.children, ...elementIds])];

    updatedGroups[groupIndex] = {
        ...group,
        children: newChildren,
    };

    return {
        ...diagram,
        groups: updatedGroups,
    };
}

function removeFromGroupOp(diagram: Diagram, groupId: string, elementIds: string[]): Diagram {
    const groupIndex = diagram.groups.findIndex(g => g.id === groupId);
    if (groupIndex === -1) {
        throw new Error(`Group '${groupId}' not found`);
    }

    const updatedGroups = [...diagram.groups];
    const group = updatedGroups[groupIndex];
    const elementsToRemove = new Set(elementIds);
    const newChildren = group.children.filter(childId => !elementsToRemove.has(childId));

    updatedGroups[groupIndex] = {
        ...group,
        children: newChildren,
    };

    return {
        ...diagram,
        groups: updatedGroups,
    };
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Creates a mutator for an existing diagram
 * 
 * @param diagram - Diagram to mutate
 * @returns New diagram mutator instance
 * 
 * @example
 * const updated = mutateDiagram(diagram)
 *   .updateNode('A', { label: 'Updated' })
 *   .addEdge({ source: 'A', target: 'C' })
 *   .removeNode('B')
 *   .apply();
 */
export function mutateDiagram(diagram: Diagram): IMutator {
    return new DiagramMutator(diagram);
}
