/**
 * Tests for Diagram Mutator API
 */

import { describe, it, expect } from 'vitest';
import { createDiagram } from '../src/api/builder';
import { mutateDiagram } from '../src/api/mutator';
import type { Diagram } from '../src/types';

describe('DiagramMutator', () => {
    let baseDiagram: Diagram;

    // Helper to create a base diagram for testing
    function createBaseDiagram(): Diagram {
        return createDiagram()
            .setType('flowchart')
            .addNode({ id: 'A', label: 'Node A' })
            .addNode({ id: 'B', label: 'Node B' })
            .addNode({ id: 'C', label: 'Node C' })
            .addEdge({ source: 'A', target: 'B' })
            .addEdge({ source: 'B', target: 'C' })
            .build();
    }

    describe('node mutations', () => {
        it('should add new node', () => {
            baseDiagram = createBaseDiagram();
            const updated = mutateDiagram(baseDiagram)
                .addNode({ id: 'D', label: 'Node D' })
                .apply();

            expect(updated.nodes).toHaveLength(4);
            expect(updated.nodes[3].id).toBe('D');
            expect(baseDiagram.nodes).toHaveLength(3); // Original unchanged
        });

        it('should update node label', () => {
            baseDiagram = createBaseDiagram();
            const updated = mutateDiagram(baseDiagram)
                .updateNode('A', { label: 'Updated A' })
                .apply();

            expect(updated.nodes[0].label).toBe('Updated A');
            expect(baseDiagram.nodes[0].label).toBe('Node A'); // Original unchanged
        });

        it('should update node style', () => {
            baseDiagram = createBaseDiagram();
            const updated = mutateDiagram(baseDiagram)
                .updateNode('A', { style: { fill: '#ff0000' } })
                .apply();

            expect(updated.nodes[0].style.fill).toBe('#ff0000');
        });

        it('should move node', () => {
            baseDiagram = createBaseDiagram();
            const updated = mutateDiagram(baseDiagram)
                .moveNode('A', { x: 200, y: 300 })
                .apply();

            expect(updated.nodes[0].position).toEqual({ x: 200, y: 300 });
        });

        it('should resize node', () => {
            baseDiagram = createBaseDiagram();
            const updated = mutateDiagram(baseDiagram)
                .resizeNode('A', { width: 150, height: 100 })
                .apply();

            expect(updated.nodes[0].size).toEqual({ width: 150, height: 100 });
        });

        it('should remove node with cascade', () => {
            baseDiagram = createBaseDiagram();
            const updated = mutateDiagram(baseDiagram)
                .removeNode('B', true)
                .apply();

            expect(updated.nodes).toHaveLength(2);
            expect(updated.nodes.find(n => n.id === 'B')).toBeUndefined();
            // Edges A->B and B->C should be removed
            expect(updated.edges).toHaveLength(0);
        });

        it('should throw error when removing node without cascade if edges exist', () => {
            baseDiagram = createBaseDiagram();
            expect(() => {
                mutateDiagram(baseDiagram)
                    .removeNode('B', false)
                    .apply();
            }).toThrow('it is referenced by edges');
        });

        it('should throw error for non-existent node', () => {
            baseDiagram = createBaseDiagram();
            expect(() => {
                mutateDiagram(baseDiagram)
                    .updateNode('Z', { label: 'Updated' })
                    .apply();
            }).toThrow("Node 'Z' not found");
        });
    });

    describe('edge mutations', () => {
        it('should add new edge', () => {
            baseDiagram = createBaseDiagram();
            const updated = mutateDiagram(baseDiagram)
                .addEdge({ source: 'A', target: 'C' })
                .apply();

            expect(updated.edges).toHaveLength(3);
            expect(updated.edges[2].source).toBe('A');
            expect(updated.edges[2].target).toBe('C');
        });

        it('should update edge label', () => {
            baseDiagram = createBaseDiagram();
            const updated = mutateDiagram(baseDiagram)
                .updateEdge('A-B', { label: 'connects to' })
                .apply();

            expect(updated.edges[0].label).toBe('connects to');
        });

        it('should update edge arrow style', () => {
            baseDiagram = createBaseDiagram();
            const updated = mutateDiagram(baseDiagram)
                .updateEdge('A-B', { arrow: { lineType: 'dashed', targetType: 'diamond' } })
                .apply();

            expect(updated.edges[0].arrow.lineType).toBe('dashed');
            expect(updated.edges[0].arrow.targetType).toBe('diamond');
        });

        it('should remove edge', () => {
            baseDiagram = createBaseDiagram();
            const updated = mutateDiagram(baseDiagram)
                .removeEdge('A-B')
                .apply();

            expect(updated.edges).toHaveLength(1);
            expect(updated.edges.find(e => e.id === 'A-B')).toBeUndefined();
        });

        it('should reconnect edge source', () => {
            baseDiagram = createBaseDiagram();
            const updated = mutateDiagram(baseDiagram)
                .reconnectEdge('A-B', 'C', undefined)
                .apply();

            expect(updated.edges[0].source).toBe('C');
            expect(updated.edges[0].target).toBe('B');
        });

        it('should reconnect edge target', () => {
            baseDiagram = createBaseDiagram();
            const updated = mutateDiagram(baseDiagram)
                .reconnectEdge('A-B', undefined, 'C')
                .apply();

            expect(updated.edges[0].source).toBe('A');
            expect(updated.edges[0].target).toBe('C');
        });

        it('should throw error for non-existent edge', () => {
            baseDiagram = createBaseDiagram();
            expect(() => {
                mutateDiagram(baseDiagram)
                    .updateEdge('X-Y', { label: 'Updated' })
                    .apply();
            }).toThrow("Edge 'X-Y' not found");
        });
    });

    describe('group mutations', () => {
        it('should add new group', () => {
            baseDiagram = createBaseDiagram();
            const updated = mutateDiagram(baseDiagram)
                .addGroup({ id: 'G1', children: ['A', 'B'] })
                .apply();

            expect(updated.groups).toHaveLength(1);
            expect(updated.groups[0].children).toEqual(['A', 'B']);
        });

        it('should update group label', () => {
            baseDiagram = createDiagram()
                .setType('flowchart')
                .addNode({ id: 'A', label: 'Node A' })
                .addGroup({ id: 'G1', children: ['A'] })
                .build();

            const updated = mutateDiagram(baseDiagram)
                .updateGroup('G1', { label: 'Updated Group' })
                .apply();

            expect(updated.groups[0].label).toBe('Updated Group');
        });

        it('should add elements to group', () => {
            baseDiagram = createDiagram()
                .setType('flowchart')
                .addNode({ id: 'A', label: 'Node A' })
                .addNode({ id: 'B', label: 'Node B' })
                .addNode({ id: 'C', label: 'Node C' })
                .addGroup({ id: 'G1', children: ['A'] })
                .build();

            const updated = mutateDiagram(baseDiagram)
                .addToGroup('G1', ['B', 'C'])
                .apply();

            expect(updated.groups[0].children).toEqual(['A', 'B', 'C']);
        });

        it('should remove elements from group', () => {
            baseDiagram = createDiagram()
                .setType('flowchart')
                .addNode({ id: 'A', label: 'Node A' })
                .addNode({ id: 'B', label: 'Node B' })
                .addNode({ id: 'C', label: 'Node C' })
                .addGroup({ id: 'G1', children: ['A', 'B', 'C'] })
                .build();

            const updated = mutateDiagram(baseDiagram)
                .removeFromGroup('G1', ['B'])
                .apply();

            expect(updated.groups[0].children).toEqual(['A', 'C']);
        });

        it('should remove group with ungroup=true', () => {
            baseDiagram = createDiagram()
                .setType('flowchart')
                .addNode({ id: 'A', label: 'Node A' })
                .addNode({ id: 'B', label: 'Node B' })
                .addGroup({ id: 'G1', children: ['A', 'B'] })
                .build();

            const updated = mutateDiagram(baseDiagram)
                .removeGroup('G1', true)
                .apply();

            expect(updated.groups).toHaveLength(0);
            expect(updated.nodes).toHaveLength(2); // Nodes preserved
        });

        it('should remove group with ungroup=false (removes children)', () => {
            baseDiagram = createDiagram()
                .setType('flowchart')
                .addNode({ id: 'A', label: 'Node A' })
                .addNode({ id: 'B', label: 'Node B' })
                .addNode({ id: 'C', label: 'Node C' })
                .addEdge({ source: 'A', target: 'B' })
                .addGroup({ id: 'G1', children: ['A', 'B'] })
                .build();

            const updated = mutateDiagram(baseDiagram)
                .removeGroup('G1', false)
                .apply();

            expect(updated.groups).toHaveLength(0);
            expect(updated.nodes).toHaveLength(1); // Only C remains
            expect(updated.nodes[0].id).toBe('C');
            expect(updated.edges).toHaveLength(0); // Edge removed
        });
    });

    describe('batch operations', () => {
        it('should apply multiple operations in sequence', () => {
            baseDiagram = createBaseDiagram();
            const updated = mutateDiagram(baseDiagram)
                .updateNode('A', { label: 'Updated A' })
                .updateNode('B', { label: 'Updated B' })
                .addNode({ id: 'D', label: 'Node D' })
                .addEdge({ source: 'C', target: 'D' })
                .apply();

            expect(updated.nodes[0].label).toBe('Updated A');
            expect(updated.nodes[1].label).toBe('Updated B');
            expect(updated.nodes).toHaveLength(4);
            expect(updated.edges).toHaveLength(3);
        });

        it('should apply batch operations', () => {
            baseDiagram = createBaseDiagram();
            const updated = mutateDiagram(baseDiagram)
                .batch([
                    { type: 'updateNode', id: 'A', updates: { label: 'Batch A' } },
                    { type: 'updateNode', id: 'B', updates: { label: 'Batch B' } },
                ])
                .apply();

            expect(updated.nodes[0].label).toBe('Batch A');
            expect(updated.nodes[1].label).toBe('Batch B');
        });
    });

    describe('immutability', () => {
        it('should not modify original diagram', () => {
            baseDiagram = createBaseDiagram();
            const originalNodeCount = baseDiagram.nodes.length;
            const originalLabel = baseDiagram.nodes[0].label;

            mutateDiagram(baseDiagram)
                .addNode({ id: 'D', label: 'Node D' })
                .updateNode('A', { label: 'Modified' })
                .apply();

            expect(baseDiagram.nodes).toHaveLength(originalNodeCount);
            expect(baseDiagram.nodes[0].label).toBe(originalLabel);
        });

        it('should return new mutator instance on each operation', () => {
            baseDiagram = createBaseDiagram();
            const mutator1 = mutateDiagram(baseDiagram);
            const mutator2 = mutator1.addNode({ id: 'D', label: 'Node D' });

            expect(mutator1).not.toBe(mutator2);
        });
    });

    describe('preview and reset', () => {
        it('should preview mutations without validation', () => {
            baseDiagram = createBaseDiagram();
            const preview = mutateDiagram(baseDiagram)
                .addNode({ id: 'D', label: 'Node D' })
                .updateNode('A', { label: 'Updated A' })
                .preview();

            expect(preview.nodes).toHaveLength(4);
            expect(preview.nodes[0].label).toBe('Updated A');
        });

        it('should get pending operations', () => {
            baseDiagram = createBaseDiagram();
            const mutator = mutateDiagram(baseDiagram)
                .addNode({ id: 'D', label: 'Node D' })
                .updateNode('A', { label: 'Updated A' });

            const operations = mutator.getOperations();
            expect(operations).toHaveLength(2);
            expect(operations[0].type).toBe('addNode');
            expect(operations[1].type).toBe('updateNode');
        });

        it('should reset pending operations', () => {
            baseDiagram = createBaseDiagram();
            const mutator = mutateDiagram(baseDiagram)
                .addNode({ id: 'D', label: 'Node D' })
                .updateNode('A', { label: 'Updated A' })
                .reset();

            expect(mutator.getOperations()).toHaveLength(0);
        });
    });

    describe('validation', () => {
        it('should validate diagram after mutations', () => {
            baseDiagram = createBaseDiagram();
            const updated = mutateDiagram(baseDiagram)
                .addNode({ id: 'D', label: 'Node D' })
                .addEdge({ source: 'C', target: 'D' })
                .apply();

            expect(updated.nodes).toHaveLength(4);
            expect(updated.edges).toHaveLength(3);
        });

        it('should validate diagram structure after mutations', () => {
            baseDiagram = createBaseDiagram();
            // Empty diagram is valid (just has warnings), so this should succeed
            const updated = mutateDiagram(baseDiagram)
                .removeNode('A', true)
                .removeNode('B', true)
                .removeNode('C', true)
                .apply();

            expect(updated.nodes).toHaveLength(0);
            expect(updated.edges).toHaveLength(0);
        });
    });

    describe('complex mutations', () => {
        it('should handle complex workflow', () => {
            baseDiagram = createBaseDiagram();
            const updated = mutateDiagram(baseDiagram)
                // Add new nodes
                .addNode({ id: 'D', label: 'Node D' })
                .addNode({ id: 'E', label: 'Node E' })
                // Update existing nodes
                .updateNode('A', { label: 'Start', shape: 'circle' })
                .updateNode('C', { label: 'End', shape: 'circle' })
                // Add new edges
                .addEdge({ source: 'C', target: 'D' })
                .addEdge({ source: 'D', target: 'E' })
                // Create group
                .addGroup({ id: 'G1', label: 'Process Group', children: ['B', 'D'] })
                // Update edge styles
                .updateEdge('A-B', { label: 'start', arrow: { lineType: 'dashed' } })
                .apply();

            expect(updated.nodes).toHaveLength(5);
            expect(updated.edges).toHaveLength(4);
            expect(updated.groups).toHaveLength(1);
            expect(updated.nodes[0].label).toBe('Start');
            expect(updated.edges[0].label).toBe('start');
        });
    });
});
