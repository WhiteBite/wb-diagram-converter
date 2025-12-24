/**
 * IR Validation Utilities
 * 
 * Comprehensive validation system for diagram structure with detailed error reporting.
 * Validates references, layout, and semantic correctness.
 */

import type {
    Diagram,
    DiagramNode,
    DiagramEdge,
    DiagramGroup,
} from '../types/ir';
import type {
    ValidationResult,
    ValidationIssueError,
    ValidationWarning,
    ValidationOptions,
    ValidationErrorCode,
    ValidationWarningCode,
    ValidationStats,
} from '../types/validation';

/**
 * Validate the entire diagram structure
 * 
 * @param diagram - Diagram to validate
 * @param options - Validation options
 * @returns Validation result with errors and warnings
 * 
 * @example
 * const result = validateDiagram(diagram, { checkLayout: true });
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 */
export function validateDiagram(
    diagram: Diagram,
    options: ValidationOptions = {}
): ValidationResult {
    const startTime = Date.now();
    const errors: ValidationIssueError[] = [];
    const warnings: ValidationWarning[] = [];

    // Default options
    const opts = {
        strict: false,
        checkReferences: true,
        checkLayout: true,
        allowAutoLayout: true,
        allowAutoSize: true,
        checkConnectivity: false,
        checkStyleConsistency: false,
        ...options,
    };

    // Validate basic structure
    errors.push(...validateDiagramStructure(diagram));

    // Validate ID uniqueness
    errors.push(...validateIdUniqueness(diagram));

    // Validate references
    if (opts.checkReferences) {
        errors.push(...validateReferences(diagram));
    }

    // Validate layout
    if (opts.checkLayout) {
        const layoutIssues = validateLayout(diagram, opts);
        errors.push(...layoutIssues.errors);
        warnings.push(...layoutIssues.warnings);
    }

    // Check connectivity
    if (opts.checkConnectivity) {
        warnings.push(...checkConnectivity(diagram));
    }

    // Check style consistency
    if (opts.checkStyleConsistency) {
        warnings.push(...checkStyleConsistency(diagram));
    }

    // Check size limits
    if (opts.maxNodes && diagram.nodes.length > opts.maxNodes) {
        warnings.push({
            path: 'nodes',
            message: `Diagram has ${diagram.nodes.length} nodes (max: ${opts.maxNodes})`,
            code: 'TOO_MANY_NODES' as ValidationWarningCode,
            severity: 'warning',
        });
    }

    if (opts.maxEdges && diagram.edges.length > opts.maxEdges) {
        warnings.push({
            path: 'edges',
            message: `Diagram has ${diagram.edges.length} edges (max: ${opts.maxEdges})`,
            code: 'TOO_MANY_EDGES' as ValidationWarningCode,
            severity: 'warning',
        });
    }

    // In strict mode, treat warnings as errors
    const finalErrors = opts.strict ? [...errors, ...warnings as any] : errors;

    const stats: ValidationStats = {
        nodeCount: diagram.nodes.length,
        edgeCount: diagram.edges.length,
        groupCount: diagram.groups.length,
        errorCount: finalErrors.length,
        warningCount: warnings.length,
        durationMs: Date.now() - startTime,
    };

    return {
        valid: finalErrors.length === 0,
        errors: finalErrors,
        warnings: opts.strict ? [] : warnings,
        stats,
    };
}

/**
 * Validates basic diagram structure
 */
function validateDiagramStructure(diagram: Diagram): ValidationIssueError[] {
    const errors: ValidationIssueError[] = [];

    // Check required fields
    if (!diagram.id || diagram.id.trim() === '') {
        errors.push({
            path: 'id',
            message: 'Diagram ID is required',
            code: 'MISSING_ID' as ValidationErrorCode,
            severity: 'error',
        });
    }

    if (!diagram.type) {
        errors.push({
            path: 'type',
            message: 'Diagram type is required',
            code: 'MISSING_REQUIRED_FIELD' as ValidationErrorCode,
            severity: 'error',
        });
    }

    if (!Array.isArray(diagram.nodes)) {
        errors.push({
            path: 'nodes',
            message: 'Nodes must be an array',
            code: 'INVALID_TYPE' as ValidationErrorCode,
            severity: 'error',
        });
    }

    if (!Array.isArray(diagram.edges)) {
        errors.push({
            path: 'edges',
            message: 'Edges must be an array',
            code: 'INVALID_TYPE' as ValidationErrorCode,
            severity: 'error',
        });
    }

    if (!Array.isArray(diagram.groups)) {
        errors.push({
            path: 'groups',
            message: 'Groups must be an array',
            code: 'INVALID_TYPE' as ValidationErrorCode,
            severity: 'error',
        });
    }

    return errors;
}

/**
 * Validates ID uniqueness across all elements
 */
function validateIdUniqueness(diagram: Diagram): ValidationIssueError[] {
    const errors: ValidationIssueError[] = [];
    const seenIds = new Map<string, { type: string; index: number }>();

    // Check node IDs
    diagram.nodes.forEach((node, index) => {
        if (!node.id || node.id.trim() === '') {
            errors.push({
                path: `nodes[${index}].id`,
                message: 'Node ID is required',
                code: 'MISSING_ID' as ValidationErrorCode,
                severity: 'error',
                elementId: node.id,
            });
            return;
        }

        const existing = seenIds.get(node.id);
        if (existing) {
            errors.push({
                path: `nodes[${index}].id`,
                message: `Duplicate ID "${node.id}" (already used by ${existing.type}[${existing.index}])`,
                code: 'DUPLICATE_ID' as ValidationErrorCode,
                severity: 'error',
                elementId: node.id,
            });
        } else {
            seenIds.set(node.id, { type: 'node', index });
        }
    });

    // Check edge IDs
    diagram.edges.forEach((edge, index) => {
        if (!edge.id || edge.id.trim() === '') {
            errors.push({
                path: `edges[${index}].id`,
                message: 'Edge ID is required',
                code: 'MISSING_ID' as ValidationErrorCode,
                severity: 'error',
                elementId: edge.id,
            });
            return;
        }

        const existing = seenIds.get(edge.id);
        if (existing) {
            errors.push({
                path: `edges[${index}].id`,
                message: `Duplicate ID "${edge.id}" (already used by ${existing.type}[${existing.index}])`,
                code: 'DUPLICATE_ID' as ValidationErrorCode,
                severity: 'error',
                elementId: edge.id,
            });
        } else {
            seenIds.set(edge.id, { type: 'edge', index });
        }
    });

    // Check group IDs
    diagram.groups.forEach((group, index) => {
        if (!group.id || group.id.trim() === '') {
            errors.push({
                path: `groups[${index}].id`,
                message: 'Group ID is required',
                code: 'MISSING_ID' as ValidationErrorCode,
                severity: 'error',
                elementId: group.id,
            });
            return;
        }

        const existing = seenIds.get(group.id);
        if (existing) {
            errors.push({
                path: `groups[${index}].id`,
                message: `Duplicate ID "${group.id}" (already used by ${existing.type}[${existing.index}])`,
                code: 'DUPLICATE_ID' as ValidationErrorCode,
                severity: 'error',
                elementId: group.id,
            });
        } else {
            seenIds.set(group.id, { type: 'group', index });
        }
    });

    return errors;
}

/**
 * Validates all references are valid
 */
function validateReferences(diagram: Diagram): ValidationIssueError[] {
    const errors: ValidationIssueError[] = [];
    const nodeIds = new Set(diagram.nodes.map(n => n.id));
    const allIds = new Set([...nodeIds, ...diagram.groups.map(g => g.id)]);

    // Validate edge references
    diagram.edges.forEach((edge, index) => {
        if (!edge.source) {
            errors.push({
                path: `edges[${index}].source`,
                message: 'Edge source is required',
                code: 'MISSING_SOURCE' as ValidationErrorCode,
                severity: 'error',
                elementId: edge.id,
            });
        } else if (!nodeIds.has(edge.source)) {
            errors.push({
                path: `edges[${index}].source`,
                message: `Edge references non-existent source node: ${edge.source}`,
                code: 'INVALID_NODE_REFERENCE' as ValidationErrorCode,
                severity: 'error',
                elementId: edge.id,
                context: { source: edge.source },
            });
        }

        if (!edge.target) {
            errors.push({
                path: `edges[${index}].target`,
                message: 'Edge target is required',
                code: 'MISSING_TARGET' as ValidationErrorCode,
                severity: 'error',
                elementId: edge.id,
            });
        } else if (!nodeIds.has(edge.target)) {
            errors.push({
                path: `edges[${index}].target`,
                message: `Edge references non-existent target node: ${edge.target}`,
                code: 'INVALID_NODE_REFERENCE' as ValidationErrorCode,
                severity: 'error',
                elementId: edge.id,
                context: { target: edge.target },
            });
        }

        // Check for self-loops (warning)
        if (edge.source === edge.target) {
            // This is handled in warnings section
        }
    });

    // Validate group children references
    diagram.groups.forEach((group, index) => {
        if (!group.children || group.children.length === 0) {
            errors.push({
                path: `groups[${index}].children`,
                message: `Group "${group.id}" has no children`,
                code: 'EMPTY_GROUP' as ValidationErrorCode,
                severity: 'error',
                elementId: group.id,
            });
        } else {
            group.children.forEach((childId, childIndex) => {
                if (!allIds.has(childId)) {
                    errors.push({
                        path: `groups[${index}].children[${childIndex}]`,
                        message: `Group "${group.id}" references non-existent child: ${childId}`,
                        code: 'INVALID_REFERENCE' as ValidationErrorCode,
                        severity: 'error',
                        elementId: group.id,
                        context: { childId },
                    });
                }
            });
        }
    });

    // Check for circular group dependencies
    errors.push(...checkCircularGroupDependencies(diagram));

    return errors;
}

/**
 * Check for circular dependencies in group nesting
 */
function checkCircularGroupDependencies(diagram: Diagram): ValidationIssueError[] {
    const errors: ValidationIssueError[] = [];
    const groupMap = new Map(diagram.groups.map(g => [g.id, g]));

    function hasCircularDependency(groupId: string, visited = new Set<string>()): boolean {
        if (visited.has(groupId)) {
            return true;
        }

        visited.add(groupId);
        const group = groupMap.get(groupId);
        if (!group) return false;

        for (const childId of group.children) {
            const childGroup = groupMap.get(childId);
            if (childGroup && hasCircularDependency(childId, new Set(visited))) {
                return true;
            }
        }

        return false;
    }

    diagram.groups.forEach((group, index) => {
        if (hasCircularDependency(group.id)) {
            errors.push({
                path: `groups[${index}]`,
                message: `Circular dependency detected in group: ${group.id}`,
                code: 'CIRCULAR_GROUP_DEPENDENCY' as ValidationErrorCode,
                severity: 'error',
                elementId: group.id,
            });
        }
    });

    return errors;
}

/**
 * Validates layout (positions, sizes)
 */
function validateLayout(
    diagram: Diagram,
    options: ValidationOptions
): { errors: ValidationIssueError[]; warnings: ValidationWarning[] } {
    const errors: ValidationIssueError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate node positions and sizes
    diagram.nodes.forEach((node, index) => {
        // Check position
        if (!node.position) {
            if (!options.allowAutoLayout) {
                errors.push({
                    path: `nodes[${index}].position`,
                    message: `Node "${node.id}" is missing position`,
                    code: 'INVALID_POSITION' as ValidationErrorCode,
                    severity: 'error',
                    elementId: node.id,
                });
            }
        } else {
            if (typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
                errors.push({
                    path: `nodes[${index}].position`,
                    message: `Node "${node.id}" has invalid position`,
                    code: 'INVALID_POSITION' as ValidationErrorCode,
                    severity: 'error',
                    elementId: node.id,
                });
            }
            if (isNaN(node.position.x) || isNaN(node.position.y)) {
                errors.push({
                    path: `nodes[${index}].position`,
                    message: `Node "${node.id}" has NaN position values`,
                    code: 'INVALID_POSITION' as ValidationErrorCode,
                    severity: 'error',
                    elementId: node.id,
                });
            }
        }

        // Check size
        if (!node.size) {
            if (!options.allowAutoSize) {
                errors.push({
                    path: `nodes[${index}].size`,
                    message: `Node "${node.id}" is missing size`,
                    code: 'INVALID_SIZE' as ValidationErrorCode,
                    severity: 'error',
                    elementId: node.id,
                });
            }
        } else {
            if (typeof node.size.width !== 'number' || typeof node.size.height !== 'number') {
                errors.push({
                    path: `nodes[${index}].size`,
                    message: `Node "${node.id}" has invalid size`,
                    code: 'INVALID_SIZE' as ValidationErrorCode,
                    severity: 'error',
                    elementId: node.id,
                });
            }
            if (node.size.width <= 0 || node.size.height <= 0) {
                errors.push({
                    path: `nodes[${index}].size`,
                    message: `Node "${node.id}" has non-positive size`,
                    code: 'INVALID_SIZE' as ValidationErrorCode,
                    severity: 'error',
                    elementId: node.id,
                });
            }
        }
    });

    return { errors, warnings };
}

/**
 * Check connectivity issues
 */
function checkConnectivity(diagram: Diagram): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    const connectedNodes = new Set<string>();

    // Mark all nodes that have edges
    diagram.edges.forEach(edge => {
        connectedNodes.add(edge.source);
        connectedNodes.add(edge.target);

        // Check for self-loops
        if (edge.source === edge.target) {
            warnings.push({
                path: `edges[${diagram.edges.indexOf(edge)}]`,
                message: `Self-loop detected on node: ${edge.source}`,
                code: 'SELF_REFERENCING_EDGE' as ValidationWarningCode,
                severity: 'warning',
                elementId: edge.id,
            });
        }
    });

    // Find disconnected nodes
    diagram.nodes.forEach((node, index) => {
        if (!connectedNodes.has(node.id)) {
            warnings.push({
                path: `nodes[${index}]`,
                message: `Node "${node.id}" is not connected to any edges`,
                code: 'DISCONNECTED_NODE' as ValidationWarningCode,
                severity: 'warning',
                elementId: node.id,
            });
        }
    });

    return warnings;
}

/**
 * Check style consistency
 */
function checkStyleConsistency(diagram: Diagram): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    // This is a placeholder for style consistency checks
    // Could check for consistent colors, fonts, etc.
    return warnings;
}

/**
 * Quick check if diagram is valid (no errors)
 */
export function isValidDiagram(diagram: Diagram, options?: ValidationOptions): boolean {
    return validateDiagram(diagram, options).valid;
}

/**
 * Get only errors from validation
 */
export function getValidationErrors(diagram: Diagram, options?: ValidationOptions): ValidationIssueError[] {
    return validateDiagram(diagram, options).errors;
}

/**
 * Get only warnings from validation
 */
export function getValidationWarnings(diagram: Diagram, options?: ValidationOptions): ValidationWarning[] {
    return validateDiagram(diagram, options).warnings;
}
