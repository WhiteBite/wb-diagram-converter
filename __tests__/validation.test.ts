import { describe, it, expect } from 'vitest';
import { validateDiagram, isValidDiagram, getValidationErrors } from '../src/utils/validation';
import type { Diagram } from '../src/types';

/** Helper to create minimal valid diagram */
function createDiagram(overrides: Partial<Diagram> = {}): Diagram {
    return {
        id: 'test',
        type: 'flowchart',
        nodes: [],
        edges: [],
        groups: [],
        ...overrides,
    };
}

describe('validateDiagram', () => {
    describe('valid diagrams', () => {
        it('should validate empty diagram with warning', () => {
            const diagram = createDiagram();
            const result = validateDiagram(diagram);

            expect(result.valid).toBe(true);
            expect(result.issues.some(i => i.type === 'warning' && i.message.includes('no nodes'))).toBe(true);
        });

        it('should validate simple diagram', () => {
            const diagram = createDiagram({
                nodes: [
                    { id: 'A', type: 'node', label: 'A', shape: 'rectangle', style: {} },
                    { id: 'B', type: 'node', label: 'B', shape: 'rectangle', style: {} },
                ],
                edges: [
                    { id: 'e1', type: 'edge', source: 'A', target: 'B', arrow: { sourceType: 'none', targetType: 'arrow', lineType: 'solid' }, style: {} },
                ],
            });

            const result = validateDiagram(diagram);
            expect(result.valid).toBe(true);
            expect(result.issues.filter(i => i.type === 'error')).toHaveLength(0);
        });

        it('should validate diagram with groups', () => {
            const diagram = createDiagram({
                nodes: [
                    { id: 'A', type: 'node', label: 'A', shape: 'rectangle', style: {} },
                    { id: 'B', type: 'node', label: 'B', shape: 'rectangle', style: {} },
                ],
                groups: [
                    { id: 'G1', type: 'group', children: ['A', 'B'], style: {} },
                ],
            });

            const result = validateDiagram(diagram);
            expect(result.valid).toBe(true);
        });
    });

    describe('invalid diagrams', () => {
        it('should detect edge with non-existent source', () => {
            const diagram = createDiagram({
                nodes: [
                    { id: 'B', type: 'node', label: 'B', shape: 'rectangle', style: {} },
                ],
                edges: [
                    { id: 'e1', type: 'edge', source: 'A', target: 'B', arrow: { sourceType: 'none', targetType: 'arrow', lineType: 'solid' }, style: {} },
                ],
            });

            const result = validateDiagram(diagram);
            expect(result.valid).toBe(false);
            expect(result.issues.some(i => i.message.includes('source') && i.message.includes('A'))).toBe(true);
        });

        it('should detect edge with non-existent target', () => {
            const diagram = createDiagram({
                nodes: [
                    { id: 'A', type: 'node', label: 'A', shape: 'rectangle', style: {} },
                ],
                edges: [
                    { id: 'e1', type: 'edge', source: 'A', target: 'B', arrow: { sourceType: 'none', targetType: 'arrow', lineType: 'solid' }, style: {} },
                ],
            });

            const result = validateDiagram(diagram);
            expect(result.valid).toBe(false);
            expect(result.issues.some(i => i.message.includes('target') && i.message.includes('B'))).toBe(true);
        });

        it('should detect duplicate node IDs', () => {
            const diagram = createDiagram({
                nodes: [
                    { id: 'A', type: 'node', label: 'A1', shape: 'rectangle', style: {} },
                    { id: 'A', type: 'node', label: 'A2', shape: 'rectangle', style: {} },
                ],
            });

            const result = validateDiagram(diagram);
            expect(result.valid).toBe(false);
            expect(result.issues.some(i => i.message.includes('Duplicate'))).toBe(true);
        });

        it('should detect group with non-existent child', () => {
            const diagram = createDiagram({
                nodes: [
                    { id: 'A', type: 'node', label: 'A', shape: 'rectangle', style: {} },
                ],
                groups: [
                    { id: 'G1', type: 'group', children: ['A', 'B'], style: {} },
                ],
            });

            const result = validateDiagram(diagram);
            expect(result.valid).toBe(false);
            expect(result.issues.some(i => i.message.includes('non-existent child'))).toBe(true);
        });
    });

    describe('warnings', () => {
        it('should warn about self-loops', () => {
            const diagram = createDiagram({
                nodes: [
                    { id: 'A', type: 'node', label: 'A', shape: 'rectangle', style: {} },
                ],
                edges: [
                    { id: 'e1', type: 'edge', source: 'A', target: 'A', arrow: { sourceType: 'none', targetType: 'arrow', lineType: 'solid' }, style: {} },
                ],
            });

            const result = validateDiagram(diagram);
            expect(result.valid).toBe(true); // Self-loops are valid, just a warning
            expect(result.issues.some(i => i.type === 'warning' && i.message.includes('Self-loop'))).toBe(true);
        });
    });
});

describe('isValidDiagram', () => {
    it('should return true for valid diagram', () => {
        const diagram = createDiagram({
            nodes: [
                { id: 'A', type: 'node', label: 'A', shape: 'rectangle', style: {} },
            ],
        });
        expect(isValidDiagram(diagram)).toBe(true);
    });

    it('should return false for invalid diagram', () => {
        const diagram = createDiagram({
            edges: [
                { id: 'e1', type: 'edge', source: 'X', target: 'Y', arrow: { sourceType: 'none', targetType: 'arrow', lineType: 'solid' }, style: {} },
            ],
        });
        expect(isValidDiagram(diagram)).toBe(false);
    });
});

describe('getValidationErrors', () => {
    it('should return only errors, not warnings', () => {
        const diagram = createDiagram({
            nodes: [
                { id: 'A', type: 'node', label: 'A', shape: 'rectangle', style: {} },
            ],
            edges: [
                { id: 'e1', type: 'edge', source: 'A', target: 'A', arrow: { sourceType: 'none', targetType: 'arrow', lineType: 'solid' }, style: {} },
            ],
        });

        const errors = getValidationErrors(diagram);
        expect(errors).toHaveLength(0); // Self-loop is warning, not error
    });
});
