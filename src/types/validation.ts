/**
 * Validation Types for Diagram Structure
 * 
 * Comprehensive validation system with detailed error reporting.
 * Validates diagram structure, references, layout, and semantic correctness.
 * 
 * @example
 * ```typescript
 * const result = validateDiagram(diagram, { strict: true });
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */

import type {
    Diagram,
    DiagramNode,
    DiagramEdge,
    DiagramGroup,
} from './ir';

// =============================================================================
// Validation Result Types
// =============================================================================

/**
 * Result of diagram validation
 */
export interface ValidationResult {
    /** Whether the diagram is valid */
    valid: boolean;

    /** Critical errors that prevent diagram usage */
    errors: ValidationIssueError[];

    /** Non-critical issues that should be addressed */
    warnings: ValidationWarning[];

    /** Informational messages */
    info?: ValidationInfo[];

    /** Validation statistics */
    stats?: ValidationStats;
}

/**
 * Statistics about the validation process
 */
export interface ValidationStats {
    /** Total number of nodes validated */
    nodeCount: number;

    /** Total number of edges validated */
    edgeCount: number;

    /** Total number of groups validated */
    groupCount: number;

    /** Number of errors found */
    errorCount: number;

    /** Number of warnings found */
    warningCount: number;

    /** Validation duration in milliseconds */
    durationMs: number;
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * Critical validation error
 * 
 * Errors indicate structural problems that prevent the diagram from being
 * used or converted. These must be fixed.
 */
export interface ValidationIssueError {
    /** JSON path to the problematic element (e.g., 'nodes[0].id', 'edges[2].source') */
    path: string;

    /** Human-readable error message */
    message: string;

    /** Error code for programmatic handling */
    code: ValidationErrorCode;

    /** Severity level */
    severity: 'error';

    /** Element ID if applicable */
    elementId?: string;

    /** Additional context about the error */
    context?: Record<string, unknown>;

    /** Suggested fix (if available) */
    suggestion?: string;
}

/**
 * Non-critical validation warning
 * 
 * Warnings indicate potential issues that don't prevent diagram usage
 * but may cause problems or unexpected behavior.
 */
export interface ValidationWarning {
    /** JSON path to the element */
    path: string;

    /** Human-readable warning message */
    message: string;

    /** Warning code for programmatic handling */
    code: ValidationWarningCode;

    /** Severity level */
    severity: 'warning';

    /** Element ID if applicable */
    elementId?: string;

    /** Additional context */
    context?: Record<string, unknown>;

    /** Suggested improvement */
    suggestion?: string;
}

/**
 * Informational validation message
 * 
 * Info messages provide helpful information about the diagram
 * without indicating any problems.
 */
export interface ValidationInfo {
    /** JSON path to the element */
    path: string;

    /** Informational message */
    message: string;

    /** Severity level */
    severity: 'info';

    /** Additional context */
    context?: Record<string, unknown>;
}

// =============================================================================
// Error Codes
// =============================================================================

/**
 * Error codes for critical validation failures
 */
export enum ValidationErrorCode {
    // Required field errors
    MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
    MISSING_ID = 'MISSING_ID',
    MISSING_LABEL = 'MISSING_LABEL',
    MISSING_SOURCE = 'MISSING_SOURCE',
    MISSING_TARGET = 'MISSING_TARGET',

    // Type errors
    INVALID_TYPE = 'INVALID_TYPE',
    INVALID_NODE_SHAPE = 'INVALID_NODE_SHAPE',
    INVALID_ARROW_TYPE = 'INVALID_ARROW_TYPE',
    INVALID_LINE_TYPE = 'INVALID_LINE_TYPE',
    INVALID_DIAGRAM_TYPE = 'INVALID_DIAGRAM_TYPE',

    // Reference errors
    INVALID_REFERENCE = 'INVALID_REFERENCE',
    INVALID_NODE_REFERENCE = 'INVALID_NODE_REFERENCE',
    INVALID_EDGE_REFERENCE = 'INVALID_EDGE_REFERENCE',
    INVALID_GROUP_REFERENCE = 'INVALID_GROUP_REFERENCE',
    INVALID_PORT_REFERENCE = 'INVALID_PORT_REFERENCE',
    DANGLING_REFERENCE = 'DANGLING_REFERENCE',

    // Duplicate errors
    DUPLICATE_ID = 'DUPLICATE_ID',
    DUPLICATE_NODE_ID = 'DUPLICATE_NODE_ID',
    DUPLICATE_EDGE_ID = 'DUPLICATE_EDGE_ID',
    DUPLICATE_GROUP_ID = 'DUPLICATE_GROUP_ID',

    // Structural errors
    CIRCULAR_REFERENCE = 'CIRCULAR_REFERENCE',
    CIRCULAR_GROUP_DEPENDENCY = 'CIRCULAR_GROUP_DEPENDENCY',
    SELF_REFERENCING_EDGE = 'SELF_REFERENCING_EDGE',
    NESTED_GROUP_CONFLICT = 'NESTED_GROUP_CONFLICT',

    // Value errors
    INVALID_POSITION = 'INVALID_POSITION',
    INVALID_SIZE = 'INVALID_SIZE',
    INVALID_VIEWPORT = 'INVALID_VIEWPORT',
    INVALID_COLOR = 'INVALID_COLOR',
    INVALID_NUMBER = 'INVALID_NUMBER',
    NEGATIVE_VALUE = 'NEGATIVE_VALUE',
    OUT_OF_RANGE = 'OUT_OF_RANGE',

    // Structure errors
    EMPTY_DIAGRAM = 'EMPTY_DIAGRAM',
    EMPTY_GROUP = 'EMPTY_GROUP',
    INVALID_STRUCTURE = 'INVALID_STRUCTURE',
}

/**
 * Warning codes for non-critical issues
 */
export enum ValidationWarningCode {
    // Missing optional fields
    MISSING_POSITION = 'MISSING_POSITION',
    MISSING_SIZE = 'MISSING_SIZE',
    MISSING_STYLE = 'MISSING_STYLE',
    MISSING_VIEWPORT = 'MISSING_VIEWPORT',
    MISSING_METADATA = 'MISSING_METADATA',

    // Layout issues
    OVERLAPPING_NODES = 'OVERLAPPING_NODES',
    NODES_TOO_CLOSE = 'NODES_TOO_CLOSE',
    INCONSISTENT_SPACING = 'INCONSISTENT_SPACING',
    POSITION_OUT_OF_VIEWPORT = 'POSITION_OUT_OF_VIEWPORT',

    // Connectivity issues
    DISCONNECTED_NODE = 'DISCONNECTED_NODE',
    ISOLATED_SUBGRAPH = 'ISOLATED_SUBGRAPH',
    MULTIPLE_EDGES_SAME_DIRECTION = 'MULTIPLE_EDGES_SAME_DIRECTION',

    // Content issues
    EMPTY_LABEL = 'EMPTY_LABEL',
    LONG_LABEL = 'LONG_LABEL',
    SPECIAL_CHARACTERS = 'SPECIAL_CHARACTERS',

    // Style issues
    INCONSISTENT_STYLE = 'INCONSISTENT_STYLE',
    DEFAULT_STYLE = 'DEFAULT_STYLE',
    INVISIBLE_ELEMENT = 'INVISIBLE_ELEMENT',

    // Performance issues
    TOO_MANY_NODES = 'TOO_MANY_NODES',
    TOO_MANY_EDGES = 'TOO_MANY_EDGES',
    COMPLEX_LAYOUT = 'COMPLEX_LAYOUT',

    // Semantic issues
    UNUSUAL_STRUCTURE = 'UNUSUAL_STRUCTURE',
    DEPRECATED_FEATURE = 'DEPRECATED_FEATURE',
}

// =============================================================================
// Validation Options
// =============================================================================

/**
 * Options for diagram validation
 */
export interface ValidationOptions {
    /**
     * Strict mode: treat warnings as errors (default: false)
     */
    strict?: boolean;

    /**
     * Validate all ID references (default: true)
     */
    checkReferences?: boolean;

    /**
     * Validate layout (positions, sizes, overlaps) (default: true)
     */
    checkLayout?: boolean;

    /**
     * Allow missing positions (auto-layout) (default: true)
     */
    allowAutoLayout?: boolean;

    /**
     * Allow missing sizes (auto-size) (default: true)
     */
    allowAutoSize?: boolean;

    /**
     * Check for disconnected nodes (default: false)
     */
    checkConnectivity?: boolean;

    /**
     * Check for style consistency (default: false)
     */
    checkStyleConsistency?: boolean;

    /**
     * Maximum allowed nodes (default: undefined = no limit)
     */
    maxNodes?: number;

    /**
     * Maximum allowed edges (default: undefined = no limit)
     */
    maxEdges?: number;

    /**
     * Custom validation rules
     */
    customRules?: ValidationRule[];
}

// =============================================================================
// Validator Interfaces
// =============================================================================

/**
 * Validator for diagram elements
 */
export interface DiagramValidator {
    /**
     * Validate the entire diagram
     */
    validate(diagram: Diagram, options?: ValidationOptions): ValidationResult;

    /**
     * Validate diagram structure only (no element validation)
     */
    validateStructure(diagram: Diagram): ValidationIssueError[];

    /**
     * Validate all references are valid
     */
    validateReferences(diagram: Diagram): ValidationIssueError[];
}

/**
 * Validator for individual nodes
 */
export interface NodeValidator {
    /**
     * Validate a single node
     */
    validate(node: DiagramNode, diagram?: Diagram): ValidationIssueError[];

    /**
     * Validate node position
     */
    validatePosition(node: DiagramNode, viewport?: { width: number; height: number }): ValidationIssueError[];

    /**
     * Validate node size
     */
    validateSize(node: DiagramNode): ValidationIssueError[];

    /**
     * Validate node style
     */
    validateStyle(node: DiagramNode): ValidationIssueError[];
}

/**
 * Validator for individual edges
 */
export interface EdgeValidator {
    /**
     * Validate a single edge
     */
    validate(edge: DiagramEdge, nodes: DiagramNode[]): ValidationIssueError[];

    /**
     * Validate edge references (source, target, ports)
     */
    validateReferences(edge: DiagramEdge, nodes: DiagramNode[]): ValidationIssueError[];

    /**
     * Validate edge style
     */
    validateStyle(edge: DiagramEdge): ValidationIssueError[];

    /**
     * Validate edge waypoints
     */
    validateWaypoints(edge: DiagramEdge): ValidationIssueError[];
}

/**
 * Validator for individual groups
 */
export interface GroupValidator {
    /**
     * Validate a single group
     */
    validate(group: DiagramGroup, elements: (DiagramNode | DiagramGroup)[]): ValidationIssueError[];

    /**
     * Validate group children references
     */
    validateChildren(group: DiagramGroup, elements: (DiagramNode | DiagramGroup)[]): ValidationIssueError[];

    /**
     * Check for circular dependencies in nested groups
     */
    validateNesting(group: DiagramGroup, allGroups: DiagramGroup[]): ValidationIssueError[];

    /**
     * Validate group style
     */
    validateStyle(group: DiagramGroup): ValidationIssueError[];
}

// =============================================================================
// Custom Validation Rules
// =============================================================================

/**
 * Custom validation rule
 */
export interface ValidationRule {
    /** Unique rule identifier */
    id: string;

    /** Human-readable rule name */
    name: string;

    /** Rule description */
    description: string;

    /** Rule severity */
    severity: 'error' | 'warning' | 'info';

    /**
     * Validation function
     * 
     * @param diagram - Diagram to validate
     * @returns Array of validation issues found
     */
    validate: (diagram: Diagram) => Array<ValidationIssueError | ValidationWarning | ValidationInfo>;
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Check if a validation result has any errors
 */
export function hasErrors(result: ValidationResult): boolean {
    return result.errors.length > 0;
}

/**
 * Check if a validation result has any warnings
 */
export function hasWarnings(result: ValidationResult): boolean {
    return result.warnings.length > 0;
}

/**
 * Get all issues (errors + warnings) from a validation result
 */
export function getAllIssues(result: ValidationResult): Array<ValidationIssueError | ValidationWarning> {
    return [...result.errors, ...result.warnings];
}

/**
 * Filter validation issues by element ID
 */
export function getIssuesForElement(
    result: ValidationResult,
    elementId: string
): Array<ValidationIssueError | ValidationWarning> {
    return [
        ...result.errors.filter(e => e.elementId === elementId),
        ...result.warnings.filter(w => w.elementId === elementId),
    ];
}

/**
 * Group validation issues by error code
 */
export function groupIssuesByCode(
    result: ValidationResult
): Map<ValidationErrorCode | ValidationWarningCode, Array<ValidationIssueError | ValidationWarning>> {
    const grouped = new Map();

    for (const error of result.errors) {
        const existing = grouped.get(error.code) || [];
        grouped.set(error.code, [...existing, error]);
    }

    for (const warning of result.warnings) {
        const existing = grouped.get(warning.code) || [];
        grouped.set(warning.code, [...existing, warning]);
    }

    return grouped;
}

/**
 * Format validation result as human-readable string
 */
export function formatValidationResult(result: ValidationResult): string {
    const lines: string[] = [];

    if (result.valid) {
        lines.push('✓ Diagram is valid');
    } else {
        lines.push('✗ Diagram validation failed');
    }

    if (result.errors.length > 0) {
        lines.push(`\nErrors (${result.errors.length}):`);
        for (const error of result.errors) {
            lines.push(`  • [${error.code}] ${error.path}: ${error.message}`);
        }
    }

    if (result.warnings.length > 0) {
        lines.push(`\nWarnings (${result.warnings.length}):`);
        for (const warning of result.warnings) {
            lines.push(`  • [${warning.code}] ${warning.path}: ${warning.message}`);
        }
    }

    if (result.stats) {
        lines.push(`\nValidated ${result.stats.nodeCount} nodes, ${result.stats.edgeCount} edges, ${result.stats.groupCount} groups in ${result.stats.durationMs}ms`);
    }

    return lines.join('\n');
}
