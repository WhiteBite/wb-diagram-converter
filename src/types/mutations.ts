/**
 * Mutation Operation Types
 * 
 * Defines all possible diagram mutation operations using discriminated unions
 * for complete type safety. Each operation is a distinct type with its own
 * required parameters.
 * 
 * @example
 * ```typescript
 * const operation: MutationOperation = {
 *   type: 'addNode',
 *   config: { id: 'A', label: 'Node A' }
 * };
 * ```
 */

import type {
    Diagram,
    DiagramNode,
    DiagramEdge,
    DiagramGroup,
    Position,
    Size,
} from './ir';
import type { NodeConfig, EdgeConfig, GroupConfig } from './api';

// =============================================================================
// Node Operations
// =============================================================================

/**
 * Add a new node to the diagram
 */
export interface AddNodeOperation {
    type: 'addNode';
    config: NodeConfig;
}

/**
 * Update an existing node's properties
 */
export interface UpdateNodeOperation {
    type: 'updateNode';
    id: string;
    updates: Partial<DiagramNode>;
}

/**
 * Remove a node from the diagram
 */
export interface RemoveNodeOperation {
    type: 'removeNode';
    id: string;
    /** If true, also remove connected edges (default: true) */
    cascade?: boolean;
}

/**
 * Move a node to a new position
 */
export interface MoveNodeOperation {
    type: 'moveNode';
    id: string;
    position: Position;
}

/**
 * Resize a node
 */
export interface ResizeNodeOperation {
    type: 'resizeNode';
    id: string;
    size: Size;
}

// =============================================================================
// Edge Operations
// =============================================================================

/**
 * Add a new edge to the diagram
 */
export interface AddEdgeOperation {
    type: 'addEdge';
    config: EdgeConfig;
}

/**
 * Update an existing edge's properties
 */
export interface UpdateEdgeOperation {
    type: 'updateEdge';
    id: string;
    updates: Partial<DiagramEdge>;
}

/**
 * Remove an edge from the diagram
 */
export interface RemoveEdgeOperation {
    type: 'removeEdge';
    id: string;
}

/**
 * Reconnect an edge to different nodes
 */
export interface ReconnectEdgeOperation {
    type: 'reconnectEdge';
    id: string;
    source?: string;
    target?: string;
}

// =============================================================================
// Group Operations
// =============================================================================

/**
 * Add a new group to the diagram
 */
export interface AddGroupOperation {
    type: 'addGroup';
    config: GroupConfig;
}

/**
 * Update an existing group's properties
 */
export interface UpdateGroupOperation {
    type: 'updateGroup';
    id: string;
    updates: Partial<DiagramGroup>;
}

/**
 * Remove a group from the diagram
 */
export interface RemoveGroupOperation {
    type: 'removeGroup';
    id: string;
    /** If true, keep children as top-level elements (default: false) */
    ungroup?: boolean;
}

/**
 * Add elements to a group
 */
export interface AddToGroupOperation {
    type: 'addToGroup';
    groupId: string;
    elementIds: string[];
}

/**
 * Remove elements from a group
 */
export interface RemoveFromGroupOperation {
    type: 'removeFromGroup';
    groupId: string;
    elementIds: string[];
}

// =============================================================================
// Discriminated Union
// =============================================================================

/**
 * All possible mutation operations
 * 
 * This is a discriminated union type that provides complete type safety.
 * TypeScript can narrow the type based on the `type` property.
 * 
 * @example
 * ```typescript
 * function applyOperation(op: MutationOperation) {
 *   switch (op.type) {
 *     case 'addNode':
 *       // TypeScript knows op.config exists here
 *       return addNode(op.config);
 *     case 'updateNode':
 *       // TypeScript knows op.id and op.updates exist here
 *       return updateNode(op.id, op.updates);
 *     // ...
 *   }
 * }
 * ```
 */
export type MutationOperation =
    // Node operations
    | AddNodeOperation
    | UpdateNodeOperation
    | RemoveNodeOperation
    | MoveNodeOperation
    | ResizeNodeOperation
    // Edge operations
    | AddEdgeOperation
    | UpdateEdgeOperation
    | RemoveEdgeOperation
    | ReconnectEdgeOperation
    // Group operations
    | AddGroupOperation
    | UpdateGroupOperation
    | RemoveGroupOperation
    | AddToGroupOperation
    | RemoveFromGroupOperation;

// =============================================================================
// Mutation Results
// =============================================================================

/**
 * Result of applying a single operation
 */
export interface AppliedOperation {
    /** The operation that was applied */
    operation: MutationOperation;

    /** When the operation was applied */
    timestamp: number;

    /** Whether the operation succeeded */
    success: boolean;

    /** Error message if operation failed */
    error?: string;
}

/**
 * Result of applying one or more mutations
 */
export interface MutationResult {
    /** Whether all operations succeeded */
    success: boolean;

    /** The resulting diagram (may be partial if failed) */
    diagram: Diagram;

    /** List of applied operations with their results */
    operations: AppliedOperation[];

    /** Errors encountered during mutation */
    errors?: MutationError[];

    /** Warnings (non-fatal issues) */
    warnings?: string[];
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * Error codes for mutation failures
 */
export enum MutationErrorCode {
    // Element not found errors
    NODE_NOT_FOUND = 'NODE_NOT_FOUND',
    EDGE_NOT_FOUND = 'EDGE_NOT_FOUND',
    GROUP_NOT_FOUND = 'GROUP_NOT_FOUND',
    ELEMENT_NOT_FOUND = 'ELEMENT_NOT_FOUND',

    // Duplicate ID errors
    DUPLICATE_NODE_ID = 'DUPLICATE_NODE_ID',
    DUPLICATE_EDGE_ID = 'DUPLICATE_EDGE_ID',
    DUPLICATE_GROUP_ID = 'DUPLICATE_GROUP_ID',

    // Reference errors
    INVALID_NODE_REFERENCE = 'INVALID_NODE_REFERENCE',
    INVALID_EDGE_REFERENCE = 'INVALID_EDGE_REFERENCE',
    INVALID_GROUP_REFERENCE = 'INVALID_GROUP_REFERENCE',
    INVALID_PORT_REFERENCE = 'INVALID_PORT_REFERENCE',

    // Structural errors
    CIRCULAR_GROUP_DEPENDENCY = 'CIRCULAR_GROUP_DEPENDENCY',
    SELF_REFERENCING_EDGE = 'SELF_REFERENCING_EDGE',
    ORPHANED_EDGE = 'ORPHANED_EDGE',

    // Validation errors
    INVALID_POSITION = 'INVALID_POSITION',
    INVALID_SIZE = 'INVALID_SIZE',
    INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',

    // Operation errors
    OPERATION_FAILED = 'OPERATION_FAILED',
    BATCH_OPERATION_FAILED = 'BATCH_OPERATION_FAILED',
}

/**
 * Detailed error information for a mutation failure
 */
export interface MutationError {
    /** The operation that caused the error */
    operation: MutationOperation;

    /** Human-readable error message */
    message: string;

    /** Error code for programmatic handling */
    code: MutationErrorCode;

    /** Additional context about the error */
    context?: Record<string, unknown>;

    /** Stack trace (for debugging) */
    stack?: string;
}

// =============================================================================
// Batch Operations
// =============================================================================

/**
 * Options for batch operation execution
 */
export interface BatchOptions {
    /**
     * If true, stop on first error (default: false)
     * If false, continue applying operations and collect all errors
     */
    stopOnError?: boolean;

    /**
     * If true, validate the entire diagram after all operations (default: true)
     */
    validateAfter?: boolean;

    /**
     * If true, operations are applied atomically (all or nothing) (default: false)
     * If any operation fails, all changes are rolled back
     */
    atomic?: boolean;
}

/**
 * Result of a batch operation
 */
export interface BatchResult extends MutationResult {
    /** Number of operations that succeeded */
    successCount: number;

    /** Number of operations that failed */
    failureCount: number;

    /** Total number of operations attempted */
    totalCount: number;

    /** Whether the batch was rolled back (only if atomic: true) */
    rolledBack?: boolean;
}

// =============================================================================
// Operation Helpers
// =============================================================================

/**
 * Type guard to check if an operation is a node operation
 */
export function isNodeOperation(op: MutationOperation): op is
    | AddNodeOperation
    | UpdateNodeOperation
    | RemoveNodeOperation
    | MoveNodeOperation
    | ResizeNodeOperation {
    return op.type.includes('Node');
}

/**
 * Type guard to check if an operation is an edge operation
 */
export function isEdgeOperation(op: MutationOperation): op is
    | AddEdgeOperation
    | UpdateEdgeOperation
    | RemoveEdgeOperation
    | ReconnectEdgeOperation {
    return op.type.includes('Edge');
}

/**
 * Type guard to check if an operation is a group operation
 */
export function isGroupOperation(op: MutationOperation): op is
    | AddGroupOperation
    | UpdateGroupOperation
    | RemoveGroupOperation
    | AddToGroupOperation
    | RemoveFromGroupOperation {
    return op.type.includes('Group');
}

/**
 * Extract the element ID from an operation (if applicable)
 */
export function getOperationElementId(op: MutationOperation): string | undefined {
    switch (op.type) {
        case 'addNode':
        case 'addEdge':
        case 'addGroup':
            return op.config.id;
        case 'updateNode':
        case 'removeNode':
        case 'moveNode':
        case 'resizeNode':
        case 'updateEdge':
        case 'removeEdge':
        case 'reconnectEdge':
        case 'updateGroup':
        case 'removeGroup':
            return op.id;
        case 'addToGroup':
        case 'removeFromGroup':
            return op.groupId;
        default:
            return undefined;
    }
}
