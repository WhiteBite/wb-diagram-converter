/**
 * IR Validation utilities
 * 
 * Validates diagram IR before generation
 */

import type { Diagram, DiagramNode, DiagramEdge, DiagramGroup } from '../types';
import type { ValidationIssue } from '../errors';

export interface ValidationResult {
    valid: boolean;
    issues: ValidationIssue[];
}

/** Validate diagram IR */
export function validateDiagram(diagram: Diagram): ValidationResult {
    const issues: ValidationIssue[] = [];

    // Collect all node IDs
    const nodeIds = new Set(diagram.nodes.map(n => n.id));
    const groupIds = new Set(diagram.groups.map(g => g.id));
    const allIds = new Set([...nodeIds, ...groupIds]);

    // Check for duplicate node IDs
    const seenNodeIds = new Set<string>();
    for (const node of diagram.nodes) {
        if (seenNodeIds.has(node.id)) {
            issues.push({
                type: 'error',
                message: `Duplicate node ID: ${node.id}`,
                nodeId: node.id,
            });
        }
        seenNodeIds.add(node.id);
    }

    // Validate edges
    for (let i = 0; i < diagram.edges.length; i++) {
        const edge = diagram.edges[i];

        // Check source exists
        if (!nodeIds.has(edge.source)) {
            issues.push({
                type: 'error',
                message: `Edge references non-existent source node: ${edge.source}`,
                path: `edges[${i}].source`,
                edgeId: edge.id,
            });
        }

        // Check target exists
        if (!nodeIds.has(edge.target)) {
            issues.push({
                type: 'error',
                message: `Edge references non-existent target node: ${edge.target}`,
                path: `edges[${i}].target`,
                edgeId: edge.id,
            });
        }

        // Check self-loop (warning, not error)
        if (edge.source === edge.target) {
            issues.push({
                type: 'warning',
                message: `Self-loop detected on node: ${edge.source}`,
                path: `edges[${i}]`,
                edgeId: edge.id,
                nodeId: edge.source,
            });
        }
    }

    // Validate groups
    for (let i = 0; i < diagram.groups.length; i++) {
        const group = diagram.groups[i];

        // Check children exist
        for (const childId of group.children) {
            if (!allIds.has(childId)) {
                issues.push({
                    type: 'error',
                    message: `Group "${group.id}" references non-existent child: ${childId}`,
                    path: `groups[${i}].children`,
                });
            }
        }
    }

    // Check for empty diagram (warning)
    if (diagram.nodes.length === 0) {
        issues.push({
            type: 'warning',
            message: 'Diagram has no nodes',
        });
    }

    return {
        valid: issues.filter(i => i.type === 'error').length === 0,
        issues,
    };
}

/** Quick check if diagram is valid (no errors) */
export function isValidDiagram(diagram: Diagram): boolean {
    return validateDiagram(diagram).valid;
}

/** Get only errors from validation */
export function getValidationErrors(diagram: Diagram): ValidationIssue[] {
    return validateDiagram(diagram).issues.filter(i => i.type === 'error');
}

/** Get only warnings from validation */
export function getValidationWarnings(diagram: Diagram): ValidationIssue[] {
    return validateDiagram(diagram).issues.filter(i => i.type === 'warning');
}
