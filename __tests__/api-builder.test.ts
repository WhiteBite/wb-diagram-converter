/**
 * Tests for Diagram Builder API
 */

import { describe, it, expect } from 'vitest';
import { createDiagram } from '../src/api/builder';

describe('DiagramBuilder', () => {
    describe('basic construction', () => {
        it('should create empty diagram with defaults', () => {
            const diagram = createDiagram()
                .setType('flowchart')
                .build();

            expect(diagram.id).toBeDefined();
            expect(diagram.type).toBe('flowchart');
            expect(diagram.nodes).toEqual([]);
            expect(diagram.edges).toEqual([]);
            expect(diagram.groups).toEqual([]);
        });

        it('should create diagram with custom ID', () => {
            const diagram = createDiagram('custom-id')
                .setType('flowchart')
                .build();

            expect(diagram.id).toBe('custom-id');
        });

        it('should set diagram name', () => {
            const diagram = createDiagram()
                .setType('flowchart')
                .setName('My Diagram')
                .build();

            expect(diagram.name).toBe('My Diagram');
        });
    });

    describe('node operations', () => {
        it('should add node with minimal config', () => {
            const diagram = createDiagram()
                .setType('flowchart')
                .addNode({ id: 'A', label: 'Node A' })
                .build();

            expect(diagram.nodes).toHaveLength(1);
            expect(diagram.nodes[0].id).toBe('A');
            expect(diagram.nodes[0].label).toBe('Node A');
            expect(diagram.nodes[0].shape).toBe('rectangle'); // default
        });

        it('should add node with full config', () => {
            const diagram = createDiagram()
                .setType('flowchart')
                .addNode({
                    id: 'A',
                    label: 'Start',
                    shape: 'circle',
                    position: { x: 100, y: 100 },
                    size: { width: 80, height: 80 },
                    style: { fill: '#ff0000' },
                })
                .build();

            const node = diagram.nodes[0];
            expect(node.shape).toBe('circle');
            expect(node.position).toEqual({ x: 100, y: 100 });
            expect(node.size).toEqual({ width: 80, height: 80 });
            expect(node.style.fill).toBe('#ff0000');
        });

        it('should add multiple nodes', () => {
            const diagram = createDiagram()
                .setType('flowchart')
                .addNode({ id: 'A', label: 'Node A' })
                .addNode({ id: 'B', label: 'Node B' })
                .addNode({ id: 'C', label: 'Node C' })
                .build();

            expect(diagram.nodes).toHaveLength(3);
            expect(diagram.nodes.map(n => n.id)).toEqual(['A', 'B', 'C']);
        });

        it('should throw error for duplicate node ID', () => {
            expect(() => {
                createDiagram()
                    .setType('flowchart')
                    .addNode({ id: 'A', label: 'Node A' })
                    .addNode({ id: 'A', label: 'Duplicate' })
                    .build();
            }).toThrow("Node with ID 'A' already exists");
        });

        it('should apply default styles to nodes', () => {
            const diagram = createDiagram()
                .setType('flowchart')
                .addNode({ id: 'A', label: 'Node A' })
                .build();

            const node = diagram.nodes[0];
            expect(node.style.fill).toBe('#ffffff');
            expect(node.style.stroke).toBe('#000000');
            expect(node.style.strokeWidth).toBe(2);
            expect(node.style.fontSize).toBe(14);
        });
    });

    describe('edge operations', () => {
        it('should add edge with minimal config', () => {
            const diagram = createDiagram()
                .setType('flowchart')
                .addNode({ id: 'A', label: 'Node A' })
                .addNode({ id: 'B', label: 'Node B' })
                .addEdge({ source: 'A', target: 'B' })
                .build();

            expect(diagram.edges).toHaveLength(1);
            expect(diagram.edges[0].source).toBe('A');
            expect(diagram.edges[0].target).toBe('B');
            expect(diagram.edges[0].id).toBe('A-B'); // auto-generated
        });

        it('should add edge with custom ID', () => {
            const diagram = createDiagram()
                .setType('flowchart')
                .addNode({ id: 'A', label: 'Node A' })
                .addNode({ id: 'B', label: 'Node B' })
                .addEdge({ id: 'custom-edge', source: 'A', target: 'B' })
                .build();

            expect(diagram.edges[0].id).toBe('custom-edge');
        });

        it('should add edge with label and arrow config', () => {
            const diagram = createDiagram()
                .setType('flowchart')
                .addNode({ id: 'A', label: 'Node A' })
                .addNode({ id: 'B', label: 'Node B' })
                .addEdge({
                    source: 'A',
                    target: 'B',
                    label: 'connects to',
                    arrow: { lineType: 'dashed', targetType: 'diamond' },
                })
                .build();

            const edge = diagram.edges[0];
            expect(edge.label).toBe('connects to');
            expect(edge.arrow.lineType).toBe('dashed');
            expect(edge.arrow.targetType).toBe('diamond');
        });

        it('should throw error if source node not found', () => {
            expect(() => {
                createDiagram()
                    .setType('flowchart')
                    .addNode({ id: 'B', label: 'Node B' })
                    .addEdge({ source: 'A', target: 'B' })
                    .build();
            }).toThrow("Source node 'A' not found");
        });

        it('should throw error if target node not found', () => {
            expect(() => {
                createDiagram()
                    .setType('flowchart')
                    .addNode({ id: 'A', label: 'Node A' })
                    .addEdge({ source: 'A', target: 'B' })
                    .build();
            }).toThrow("Target node 'B' not found");
        });

        it('should throw error for duplicate edge ID', () => {
            expect(() => {
                createDiagram()
                    .setType('flowchart')
                    .addNode({ id: 'A', label: 'Node A' })
                    .addNode({ id: 'B', label: 'Node B' })
                    .addEdge({ id: 'edge1', source: 'A', target: 'B' })
                    .addEdge({ id: 'edge1', source: 'B', target: 'A' })
                    .build();
            }).toThrow("Edge with ID 'edge1' already exists");
        });
    });

    describe('group operations', () => {
        it('should add group with children', () => {
            const diagram = createDiagram()
                .setType('flowchart')
                .addNode({ id: 'A', label: 'Node A' })
                .addNode({ id: 'B', label: 'Node B' })
                .addGroup({ id: 'G1', children: ['A', 'B'] })
                .build();

            expect(diagram.groups).toHaveLength(1);
            expect(diagram.groups[0].id).toBe('G1');
            expect(diagram.groups[0].children).toEqual(['A', 'B']);
        });

        it('should add group with label and style', () => {
            const diagram = createDiagram()
                .setType('flowchart')
                .addNode({ id: 'A', label: 'Node A' })
                .addGroup({
                    id: 'G1',
                    label: 'Group 1',
                    children: ['A'],
                    style: { fill: '#eeeeee' },
                })
                .build();

            const group = diagram.groups[0];
            expect(group.label).toBe('Group 1');
            expect(group.style.fill).toBe('#eeeeee');
        });

        it('should throw error if child not found', () => {
            expect(() => {
                createDiagram()
                    .setType('flowchart')
                    .addNode({ id: 'A', label: 'Node A' })
                    .addGroup({ id: 'G1', children: ['A', 'B'] })
                    .build();
            }).toThrow("Child element 'B' not found");
        });

        it('should throw error for duplicate group ID', () => {
            expect(() => {
                createDiagram()
                    .setType('flowchart')
                    .addNode({ id: 'A', label: 'Node A' })
                    .addNode({ id: 'B', label: 'Node B' })
                    .addGroup({ id: 'G1', children: ['A'] })
                    .addGroup({ id: 'G1', children: ['B'] })
                    .build();
            }).toThrow("Group with ID 'G1' already exists");
        });
    });

    describe('viewport and metadata', () => {
        it('should set viewport', () => {
            const diagram = createDiagram()
                .setType('flowchart')
                .setViewport({ width: 1200, height: 800, zoom: 1.5 })
                .build();

            expect(diagram.viewport).toEqual({ width: 1200, height: 800, zoom: 1.5 });
        });

        it('should set metadata', () => {
            const diagram = createDiagram()
                .setType('flowchart')
                .setMetadata({ author: 'Test User', version: '1.0' })
                .build();

            expect(diagram.metadata).toMatchObject({ author: 'Test User', version: '1.0' });
        });
    });

    describe('immutability', () => {
        it('should return new builder instance on each operation', () => {
            const builder1 = createDiagram().setType('flowchart');
            const builder2 = builder1.addNode({ id: 'A', label: 'Node A' });

            expect(builder1).not.toBe(builder2);
        });

        it('should not affect previous builder state', () => {
            const builder1 = createDiagram()
                .setType('flowchart')
                .addNode({ id: 'A', label: 'Node A' });

            const diagram1 = builder1.build();

            const builder2 = builder1.addNode({ id: 'B', label: 'Node B' });
            const diagram2 = builder2.build();

            expect(diagram1.nodes).toHaveLength(1);
            expect(diagram2.nodes).toHaveLength(2);
        });
    });

    describe('preview', () => {
        it('should preview diagram without validation', () => {
            const preview = createDiagram()
                .setType('flowchart')
                .addNode({ id: 'A', label: 'Node A' })
                .preview();

            expect(preview.nodes).toHaveLength(1);
            expect(preview.type).toBe('flowchart');
        });
    });

    describe('complex diagrams', () => {
        it('should build complete flowchart', () => {
            const diagram = createDiagram()
                .setType('flowchart')
                .setName('User Registration Flow')
                .addNode({ id: 'start', label: 'Start', shape: 'circle' })
                .addNode({ id: 'input', label: 'Enter Details', shape: 'rectangle' })
                .addNode({ id: 'validate', label: 'Validate', shape: 'diamond' })
                .addNode({ id: 'save', label: 'Save User', shape: 'rectangle' })
                .addNode({ id: 'end', label: 'End', shape: 'circle' })
                .addEdge({ source: 'start', target: 'input' })
                .addEdge({ source: 'input', target: 'validate' })
                .addEdge({ source: 'validate', target: 'save', label: 'valid' })
                .addEdge({ source: 'validate', target: 'input', label: 'invalid' })
                .addEdge({ source: 'save', target: 'end' })
                .build();

            expect(diagram.nodes).toHaveLength(5);
            expect(diagram.edges).toHaveLength(5);
            expect(diagram.name).toBe('User Registration Flow');
        });
    });
});
