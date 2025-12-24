/**
 * Fluent API Types for Diagram Manipulation
 * 
 * Provides type-safe builder and mutator interfaces for creating and modifying diagrams.
 * All operations are immutable and return new instances.
 * 
 * @example
 * ```typescript
 * const diagram = createDiagram()
 *   .setType('flowchart')
 *   .setName('My Diagram')
 *   .addNode({ id: 'A', label: 'Start', shape: 'rounded-rectangle' })
 *   .addNode({ id: 'B', label: 'Process', shape: 'rectangle' })
 *   .addEdge({ source: 'A', target: 'B' })
 *   .build();
 * ```
 */

import type {
    Diagram,
    DiagramType,
    DiagramNode,
    DiagramEdge,
    DiagramGroup,
    NodeShape,
    NodeStyle,
    EdgeStyle,
    GroupStyle,
    ArrowConfig,
    Position,
    Size,
    Viewport,
    Port,
    LabelPosition,
} from './ir';

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Configuration for creating a new node
 * 
 * Only id and label are required. All other properties have sensible defaults:
 * - shape: 'rectangle'
 * - position: undefined (auto-layout)
 * - size: undefined (auto-size)
 * - style: default theme styles
 */
export interface NodeConfig {
    /** Unique identifier for the node */
    id: string;

    /** Display label/text */
    label: string;

    /** Node shape (default: 'rectangle') */
    shape?: NodeShape;

    /** Position on canvas (undefined = auto-layout) */
    position?: Position;

    /** Node dimensions (undefined = auto-size) */
    size?: Size;

    /** Visual styling (merged with defaults) */
    style?: Partial<NodeStyle>;

    /** Connection ports (optional) */
    ports?: Port[];

    /** Custom metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Configuration for creating a new edge
 * 
 * Only source and target are required. Defaults:
 * - id: auto-generated from source-target
 * - arrow: solid line with standard arrow head
 * - style: default theme styles
 */
export interface EdgeConfig {
    /** Auto-generated if not provided (format: "source-target") */
    id?: string;

    /** Source node ID */
    source: string;

    /** Target node ID */
    target: string;

    /** Specific port on source node (optional) */
    sourcePort?: string;

    /** Specific port on target node (optional) */
    targetPort?: string;

    /** Edge label text (optional) */
    label?: string;

    /** Label position along edge (default: 'middle') */
    labelPosition?: LabelPosition;

    /** Arrow configuration (default: solid line with arrow head) */
    arrow?: Partial<ArrowConfig>;

    /** Visual styling (merged with defaults) */
    style?: Partial<EdgeStyle>;

    /** Routing waypoints (optional) */
    waypoints?: Position[];

    /** Custom metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Configuration for creating a new group/container
 * 
 * Only id and children are required. Defaults:
 * - label: undefined (no label)
 * - position: calculated from children
 * - size: calculated from children
 * - style: default theme styles
 */
export interface GroupConfig {
    /** Unique identifier for the group */
    id: string;

    /** Group label (optional) */
    label?: string;

    /** IDs of contained nodes/groups */
    children: string[];

    /** Position on canvas (undefined = auto-calculate) */
    position?: Position;

    /** Group dimensions (undefined = auto-calculate) */
    size?: Size;

    /** Visual styling (merged with defaults) */
    style?: Partial<GroupStyle>;

    /** Whether group is collapsed (default: false) */
    collapsed?: boolean;

    /** Custom metadata */
    metadata?: Record<string, unknown>;
}

// =============================================================================
// Builder API
// =============================================================================

/**
 * Fluent API for creating new diagrams from scratch
 * 
 * Uses the Builder pattern with immutable operations. Each method returns
 * a new builder instance, allowing for method chaining.
 * 
 * @example
 * ```typescript
 * const diagram = createDiagram()
 *   .setType('flowchart')
 *   .setName('User Flow')
 *   .addNode({ id: 'start', label: 'Start', shape: 'circle' })
 *   .addNode({ id: 'process', label: 'Process Data' })
 *   .addEdge({ source: 'start', target: 'process' })
 *   .setViewport({ width: 1200, height: 800, zoom: 1 })
 *   .build();
 * ```
 */
export interface DiagramBuilder {
    /**
     * Set the diagram type/category
     * 
     * @param type - Diagram type (flowchart, sequence, class, etc.)
     * @returns New builder instance
     */
    setType(type: DiagramType): DiagramBuilder;

    /**
     * Set the diagram name
     * 
     * @param name - Human-readable diagram name
     * @returns New builder instance
     */
    setName(name: string): DiagramBuilder;

    /**
     * Add a node to the diagram
     * 
     * @param config - Node configuration
     * @returns New builder instance
     * @throws {Error} If node with same ID already exists
     */
    addNode(config: NodeConfig): DiagramBuilder;

    /**
     * Add an edge to the diagram
     * 
     * @param config - Edge configuration
     * @returns New builder instance
     * @throws {Error} If source or target node doesn't exist
     */
    addEdge(config: EdgeConfig): DiagramBuilder;

    /**
     * Add a group/container to the diagram
     * 
     * @param config - Group configuration
     * @returns New builder instance
     * @throws {Error} If any child element doesn't exist
     */
    addGroup(config: GroupConfig): DiagramBuilder;

    /**
     * Set the viewport/canvas configuration
     * 
     * @param viewport - Viewport settings
     * @returns New builder instance
     */
    setViewport(viewport: Viewport): DiagramBuilder;

    /**
     * Set custom metadata
     * 
     * @param metadata - Metadata key-value pairs
     * @returns New builder instance
     */
    setMetadata(metadata: Record<string, unknown>): DiagramBuilder;

    /**
     * Build and return the final diagram
     * 
     * Validates the diagram structure and returns the complete diagram object.
     * 
     * @returns Complete diagram
     * @throws {Error} If diagram is invalid
     */
    build(): Diagram;

    /**
     * Preview the diagram without validation
     * 
     * Useful for inspecting the diagram during construction.
     * 
     * @returns Current diagram state (may be incomplete)
     */
    preview(): Partial<Diagram>;
}

// =============================================================================
// Mutator API
// =============================================================================

/**
 * Fluent API for modifying existing diagrams
 * 
 * All operations are immutable and return a new mutator instance.
 * Changes are not applied until `apply()` is called.
 * 
 * @example
 * ```typescript
 * const updated = mutateDiagram(diagram)
 *   .updateNode('A', { label: 'Updated Label' })
 *   .addEdge({ source: 'A', target: 'C' })
 *   .removeNode('B')
 *   .apply();
 * ```
 */
export interface DiagramMutator {
    // -------------------------------------------------------------------------
    // Node Operations
    // -------------------------------------------------------------------------

    /**
     * Add a new node to the diagram
     * 
     * @param config - Node configuration
     * @returns New mutator instance
     * @throws {Error} If node with same ID already exists
     */
    addNode(config: NodeConfig): DiagramMutator;

    /**
     * Update an existing node
     * 
     * @param id - Node ID to update
     * @param updates - Partial node properties to update
     * @returns New mutator instance
     * @throws {Error} If node doesn't exist
     */
    updateNode(id: string, updates: Partial<DiagramNode>): DiagramMutator;

    /**
     * Remove a node from the diagram
     * 
     * @param id - Node ID to remove
     * @param cascade - If true, also remove connected edges (default: true)
     * @returns New mutator instance
     * @throws {Error} If node doesn't exist
     */
    removeNode(id: string, cascade?: boolean): DiagramMutator;

    /**
     * Move a node to a new position
     * 
     * @param id - Node ID to move
     * @param position - New position
     * @returns New mutator instance
     * @throws {Error} If node doesn't exist
     */
    moveNode(id: string, position: Position): DiagramMutator;

    /**
     * Resize a node
     * 
     * @param id - Node ID to resize
     * @param size - New size
     * @returns New mutator instance
     * @throws {Error} If node doesn't exist
     */
    resizeNode(id: string, size: Size): DiagramMutator;

    // -------------------------------------------------------------------------
    // Edge Operations
    // -------------------------------------------------------------------------

    /**
     * Add a new edge to the diagram
     * 
     * @param config - Edge configuration
     * @returns New mutator instance
     * @throws {Error} If source or target node doesn't exist
     */
    addEdge(config: EdgeConfig): DiagramMutator;

    /**
     * Update an existing edge
     * 
     * @param id - Edge ID to update
     * @param updates - Partial edge properties to update
     * @returns New mutator instance
     * @throws {Error} If edge doesn't exist
     */
    updateEdge(id: string, updates: Partial<DiagramEdge>): DiagramMutator;

    /**
     * Remove an edge from the diagram
     * 
     * @param id - Edge ID to remove
     * @returns New mutator instance
     * @throws {Error} If edge doesn't exist
     */
    removeEdge(id: string): DiagramMutator;

    /**
     * Reconnect an edge to different nodes
     * 
     * @param id - Edge ID to reconnect
     * @param source - New source node ID (optional)
     * @param target - New target node ID (optional)
     * @returns New mutator instance
     * @throws {Error} If edge or nodes don't exist
     */
    reconnectEdge(id: string, source?: string, target?: string): DiagramMutator;

    // -------------------------------------------------------------------------
    // Group Operations
    // -------------------------------------------------------------------------

    /**
     * Add a new group to the diagram
     * 
     * @param config - Group configuration
     * @returns New mutator instance
     * @throws {Error} If any child element doesn't exist
     */
    addGroup(config: GroupConfig): DiagramMutator;

    /**
     * Update an existing group
     * 
     * @param id - Group ID to update
     * @param updates - Partial group properties to update
     * @returns New mutator instance
     * @throws {Error} If group doesn't exist
     */
    updateGroup(id: string, updates: Partial<DiagramGroup>): DiagramMutator;

    /**
     * Remove a group from the diagram
     * 
     * @param id - Group ID to remove
     * @param ungroup - If true, keep children as top-level elements (default: false)
     * @returns New mutator instance
     * @throws {Error} If group doesn't exist
     */
    removeGroup(id: string, ungroup?: boolean): DiagramMutator;

    /**
     * Add elements to a group
     * 
     * @param groupId - Group ID
     * @param elementIds - Element IDs to add
     * @returns New mutator instance
     * @throws {Error} If group or elements don't exist
     */
    addToGroup(groupId: string, elementIds: string[]): DiagramMutator;

    /**
     * Remove elements from a group
     * 
     * @param groupId - Group ID
     * @param elementIds - Element IDs to remove
     * @returns New mutator instance
     * @throws {Error} If group or elements don't exist
     */
    removeFromGroup(groupId: string, elementIds: string[]): DiagramMutator;

    // -------------------------------------------------------------------------
    // Batch Operations
    // -------------------------------------------------------------------------

    /**
     * Apply multiple operations in a single transaction
     * 
     * More efficient than chaining individual operations.
     * Operations should be of type MutationOperation from mutations.ts
     * 
     * @param operations - Array of mutation operations
     * @returns New mutator instance
     */
    batch(operations: unknown[]): DiagramMutator;

    // -------------------------------------------------------------------------
    // Finalization
    // -------------------------------------------------------------------------

    /**
     * Apply all pending mutations and return the updated diagram
     * 
     * Validates the final diagram structure.
     * 
     * @returns Updated diagram
     * @throws {Error} If resulting diagram is invalid
     */
    apply(): Diagram;

    /**
     * Preview the diagram with pending mutations without validation
     * 
     * Useful for inspecting changes before applying.
     * 
     * @returns Diagram with pending changes (may be invalid)
     */
    preview(): Diagram;

    /**
     * Get the list of pending operations
     * 
     * Operations are of type MutationOperation from mutations.ts
     * 
     * @returns Array of operations that will be applied
     */
    getOperations(): unknown[];

    /**
     * Reset all pending operations
     * 
     * @returns New mutator instance with no pending operations
     */
    reset(): DiagramMutator;
}

// =============================================================================
// Factory Functions (to be implemented)
// =============================================================================

/**
 * Create a new diagram builder
 * 
 * @param id - Optional diagram ID (auto-generated if not provided)
 * @returns New diagram builder instance
 */
export type CreateDiagramBuilder = (id?: string) => DiagramBuilder;

/**
 * Create a mutator for an existing diagram
 * 
 * @param diagram - Diagram to mutate
 * @returns New diagram mutator instance
 */
export type CreateDiagramMutator = (diagram: Diagram) => DiagramMutator;
