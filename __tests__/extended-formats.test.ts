/**
 * Extended Formats Tests
 * 
 * Tests for D2, Structurizr, BPMN, GraphML, Lucidchart parsers and generators
 */

import { describe, it, expect } from 'vitest';
import { parseD2 } from '../src/parsers/d2';
import { parseStructurizr } from '../src/parsers/structurizr';
import { parseBpmn } from '../src/parsers/bpmn';
import { parseGraphml } from '../src/parsers/graphml';
import { parseLucidchart } from '../src/parsers/lucidchart';
import { generateD2 } from '../src/generators/d2';
import { generateStructurizr } from '../src/generators/structurizr';
import { generateBpmn } from '../src/generators/bpmn';
import { generateGraphML } from '../src/generators/graphml';
import type { Diagram } from '../src/types';

// =============================================================================
// D2 Parser Tests
// =============================================================================

describe('D2 Parser', () => {
    it('should parse simple nodes', () => {
        const code = `
            server
            database
        `;
        const diagram = parseD2(code);
        expect(diagram.nodes).toHaveLength(2);
        expect(diagram.nodes[0].id).toBe('server');
        expect(diagram.nodes[1].id).toBe('database');
    });

    it('should parse node with label', () => {
        const code = `server: Web Server`;
        const diagram = parseD2(code);
        expect(diagram.nodes[0].label).toBe('Web Server');
    });

    it('should parse edges with arrows', () => {
        const code = `
            a -> b
            b <-> c
            c -- d
        `;
        const diagram = parseD2(code);
        expect(diagram.edges).toHaveLength(3);

        // a -> b
        expect(diagram.edges[0].arrow.targetType).toBe('arrow');
        expect(diagram.edges[0].arrow.sourceType).toBe('none');

        // b <-> c (bidirectional)
        expect(diagram.edges[1].arrow.targetType).toBe('arrow');
        expect(diagram.edges[1].arrow.sourceType).toBe('arrow');

        // c -- d (no arrows)
        expect(diagram.edges[2].arrow.targetType).toBe('none');
        expect(diagram.edges[2].arrow.lineType).toBe('dashed');
    });

    it('should parse edge with label', () => {
        const code = `a -> b: sends data`;
        const diagram = parseD2(code);
        expect(diagram.edges[0].label).toBe('sends data');
    });

    it('should parse groups/containers', () => {
        const code = `
            backend: {
                api
                db
            }
        `;
        const diagram = parseD2(code);
        expect(diagram.groups).toHaveLength(1);
        expect(diagram.groups[0].id).toBe('backend');
        expect(diagram.groups[0].children).toContain('api');
        expect(diagram.groups[0].children).toContain('db');
    });
});

// =============================================================================
// D2 Generator Tests
// =============================================================================

describe('D2 Generator', () => {
    it('should generate simple diagram', () => {
        const diagram: Diagram = {
            id: 'test',
            type: 'flowchart',
            nodes: [
                { id: 'a', type: 'node', label: 'Node A', shape: 'rectangle', style: {} },
                { id: 'b', type: 'node', label: 'Node B', shape: 'rectangle', style: {} },
            ],
            edges: [
                { id: 'e1', type: 'edge', source: 'a', target: 'b', arrow: { sourceType: 'none', targetType: 'arrow', lineType: 'solid' }, style: {} },
            ],
            groups: [],
        };

        const output = generateD2(diagram);
        expect(output).toContain('a: Node A');
        expect(output).toContain('b: Node B');
        expect(output).toContain('a -> b');
    });

    it('should generate bidirectional arrows', () => {
        const diagram: Diagram = {
            id: 'test',
            type: 'flowchart',
            nodes: [
                { id: 'a', type: 'node', label: 'A', shape: 'rectangle', style: {} },
                { id: 'b', type: 'node', label: 'B', shape: 'rectangle', style: {} },
            ],
            edges: [
                { id: 'e1', type: 'edge', source: 'a', target: 'b', arrow: { sourceType: 'arrow', targetType: 'arrow', lineType: 'solid' }, style: {} },
            ],
            groups: [],
        };

        const output = generateD2(diagram);
        expect(output).toContain('<->');
    });
});

// =============================================================================
// Structurizr Parser Tests
// =============================================================================

describe('Structurizr Parser', () => {
    it('should parse person', () => {
        const code = `person user "User" "A user of the system"`;
        const diagram = parseStructurizr(code);
        expect(diagram.nodes).toHaveLength(1);
        expect(diagram.nodes[0].id).toBe('user');
        expect(diagram.nodes[0].label).toBe('User');
        expect(diagram.nodes[0].shape).toBe('actor');
    });

    it('should parse softwareSystem', () => {
        const code = `softwareSystem system "My System" "Description"`;
        const diagram = parseStructurizr(code);
        expect(diagram.nodes).toHaveLength(1);
        expect(diagram.nodes[0].id).toBe('system');
        expect(diagram.nodes[0].label).toBe('My System');
    });

    it('should parse container with technology', () => {
        const code = `container api "API" "Node.js"`;
        const diagram = parseStructurizr(code);
        expect(diagram.nodes[0].label).toContain('API');
        expect(diagram.nodes[0].label).toContain('Node.js');
    });

    it('should parse relationships', () => {
        const code = `
            person user "User"
            softwareSystem system "System"
            user -> system "Uses"
        `;
        const diagram = parseStructurizr(code);
        expect(diagram.edges).toHaveLength(1);
        expect(diagram.edges[0].source).toBe('user');
        expect(diagram.edges[0].target).toBe('system');
        expect(diagram.edges[0].label).toBe('Uses');
    });
});

// =============================================================================
// Structurizr Generator Tests
// =============================================================================

describe('Structurizr Generator', () => {
    it('should generate workspace structure', () => {
        const diagram: Diagram = {
            id: 'test',
            type: 'flowchart',
            nodes: [
                { id: 'user', type: 'node', label: 'User', shape: 'actor', style: {} },
                { id: 'system', type: 'node', label: 'System', shape: 'rectangle', style: {} },
            ],
            edges: [
                { id: 'e1', type: 'edge', source: 'user', target: 'system', label: 'Uses', arrow: { sourceType: 'none', targetType: 'arrow', lineType: 'solid' }, style: {} },
            ],
            groups: [],
        };

        const output = generateStructurizr(diagram);
        expect(output).toContain('workspace');
        expect(output).toContain('model');
        expect(output).toContain('person');
        expect(output).toContain('softwareSystem');
        expect(output).toContain('->');
    });
});

// =============================================================================
// BPMN Parser Tests (skipped - requires browser DOMParser)
// =============================================================================

describe('BPMN Parser', () => {
    it.skip('should parse BPMN XML with tasks (browser only)', () => {
        // DOMParser is not available in Node.js
    });

    it.skip('should identify start and end events (browser only)', () => {
        // DOMParser is not available in Node.js
    });
});

// =============================================================================
// BPMN Generator Tests
// =============================================================================

describe('BPMN Generator', () => {
    it('should generate valid BPMN XML', () => {
        const diagram: Diagram = {
            id: 'test',
            type: 'flowchart',
            nodes: [
                { id: 'start', type: 'node', label: 'Start', shape: 'circle', style: {}, metadata: { bpmnType: 'startEvent' } },
                { id: 'task1', type: 'node', label: 'Process', shape: 'rectangle', style: {} },
                { id: 'end', type: 'node', label: 'End', shape: 'circle', style: {}, metadata: { bpmnType: 'endEvent' } },
            ],
            edges: [
                { id: 'f1', type: 'edge', source: 'start', target: 'task1', arrow: { sourceType: 'none', targetType: 'arrow', lineType: 'solid' }, style: {} },
                { id: 'f2', type: 'edge', source: 'task1', target: 'end', arrow: { sourceType: 'none', targetType: 'arrow', lineType: 'solid' }, style: {} },
            ],
            groups: [],
        };

        const output = generateBpmn(diagram);
        expect(output).toContain('<?xml');
        expect(output).toContain('definitions');
        expect(output).toContain('process');
        expect(output).toContain('startEvent');
        expect(output).toContain('endEvent');
        expect(output).toContain('sequenceFlow');
    });
});

// =============================================================================
// GraphML Parser Tests (skipped - requires browser DOMParser)
// =============================================================================

describe('GraphML Parser', () => {
    it.skip('should parse GraphML with nodes (browser only)', () => {
        // DOMParser is not available in Node.js
    });

    it.skip('should parse edges (browser only)', () => {
        // DOMParser is not available in Node.js
    });
});

// =============================================================================
// GraphML Generator Tests
// =============================================================================

describe('GraphML Generator', () => {
    it('should generate valid GraphML', () => {
        const diagram: Diagram = {
            id: 'test',
            type: 'flowchart',
            nodes: [
                { id: 'a', type: 'node', label: 'Node A', shape: 'rectangle', style: {} },
                { id: 'b', type: 'node', label: 'Node B', shape: 'circle', style: {} },
            ],
            edges: [
                { id: 'e1', type: 'edge', source: 'a', target: 'b', arrow: { sourceType: 'none', targetType: 'arrow', lineType: 'solid' }, style: {} },
            ],
            groups: [],
        };

        const output = generateGraphML(diagram);
        expect(output).toContain('<?xml');
        expect(output).toContain('graphml');
        expect(output).toContain('<node id="a">');
        expect(output).toContain('<node id="b">');
        expect(output).toContain('<edge');
        expect(output).toContain('source="a"');
        expect(output).toContain('target="b"');
    });

    it('should include yEd extensions', () => {
        const diagram: Diagram = {
            id: 'test',
            type: 'flowchart',
            nodes: [{ id: 'n1', type: 'node', label: 'Test', shape: 'rectangle', style: {} }],
            edges: [],
            groups: [],
        };

        const output = generateGraphML(diagram);
        expect(output).toContain('xmlns:y="http://www.yworks.com/xml/graphml"');
        expect(output).toContain('y:ShapeNode');
    });
});

// =============================================================================
// Lucidchart Parser Tests
// =============================================================================

describe('Lucidchart Parser', () => {
    it('should parse Lucidchart JSON with shapes', () => {
        const json = JSON.stringify({
            shapes: [
                { id: 's1', text: 'Shape 1', type: 'rectangle' },
                { id: 's2', text: 'Shape 2', type: 'ellipse' },
            ],
            lines: [],
        });

        const diagram = parseLucidchart(json);
        expect(diagram.nodes).toHaveLength(2);
        expect(diagram.nodes[0].label).toBe('Shape 1');
    });

    it('should parse connections', () => {
        const json = JSON.stringify({
            shapes: [
                { id: 's1', text: 'A' },
                { id: 's2', text: 'B' },
            ],
            lines: [
                { id: 'l1', endpoint1: { shapeId: 's1' }, endpoint2: { shapeId: 's2' } },
            ],
        });

        const diagram = parseLucidchart(json);
        expect(diagram.edges).toHaveLength(1);
        expect(diagram.edges[0].source).toBe('s1');
        expect(diagram.edges[0].target).toBe('s2');
    });
});

// =============================================================================
// Round-trip Tests
// =============================================================================

describe('Round-trip conversions', () => {
    const simpleDiagram: Diagram = {
        id: 'roundtrip-test',
        type: 'flowchart',
        nodes: [
            { id: 'a', type: 'node', label: 'Start', shape: 'circle', style: {} },
            { id: 'b', type: 'node', label: 'Process', shape: 'rectangle', style: {} },
            { id: 'c', type: 'node', label: 'End', shape: 'circle', style: {} },
        ],
        edges: [
            { id: 'e1', type: 'edge', source: 'a', target: 'b', arrow: { sourceType: 'none', targetType: 'arrow', lineType: 'solid' }, style: {} },
            { id: 'e2', type: 'edge', source: 'b', target: 'c', arrow: { sourceType: 'none', targetType: 'arrow', lineType: 'solid' }, style: {} },
        ],
        groups: [],
    };

    it('D2: generate -> parse should preserve structure', () => {
        const d2Code = generateD2(simpleDiagram);
        const parsed = parseD2(d2Code);

        expect(parsed.nodes.length).toBe(simpleDiagram.nodes.length);
        expect(parsed.edges.length).toBe(simpleDiagram.edges.length);
    });

    it.skip('GraphML: generate -> parse should preserve structure (browser only)', () => {
        // DOMParser is not available in Node.js
    });
});
