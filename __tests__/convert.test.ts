import { describe, it, expect } from 'vitest';
import { convert, parseMermaid, generateDrawio, generateExcalidraw, autoLayout } from '../src/index';

describe('convert', () => {
    const simpleMermaid = `flowchart LR
    A[Start] --> B{Decision}
    B -->|Yes| C[Process]
    B -->|No| D[End]
    C --> E((Result))
    E --> D`;

    describe('Mermaid to Draw.io', () => {
        it('should convert simple flowchart without errors', () => {
            const result = convert(simpleMermaid, {
                from: 'mermaid',
                to: 'drawio',
                layout: {
                    algorithm: 'dagre',
                    direction: 'LR',
                },
            });

            expect(result.output).toBeDefined();
            expect(result.output).toContain('<?xml');
            expect(result.output).toContain('mxfile');
            expect(result.output).toContain('mxCell');
            expect(result.diagram).toBeDefined();
            expect(result.diagram.nodes.length).toBeGreaterThan(0);
        });

        it('should handle conversion without layout', () => {
            const result = convert(simpleMermaid, {
                from: 'mermaid',
                to: 'drawio',
                layout: {
                    algorithm: 'none',
                },
            });

            expect(result.output).toBeDefined();
            expect(result.output).toContain('mxfile');
        });
    });

    describe('Mermaid to Excalidraw', () => {
        it('should convert simple flowchart to Excalidraw', () => {
            const result = convert(simpleMermaid, {
                from: 'mermaid',
                to: 'excalidraw',
                layout: {
                    algorithm: 'dagre',
                    direction: 'LR',
                },
            });

            expect(result.output).toBeDefined();
            const parsed = JSON.parse(result.output);
            expect(parsed.type).toBe('excalidraw');
            expect(parsed.elements).toBeDefined();
            expect(parsed.elements.length).toBeGreaterThan(0);
        });
    });
});

describe('parseMermaid', () => {
    it('should parse flowchart with various node shapes', () => {
        const code = `flowchart LR
    A[Rectangle] --> B(Rounded)
    B --> C{Diamond}
    C --> D((Circle))
    D --> E[(Database)]`;

        const diagram = parseMermaid(code);

        expect(diagram.nodes.length).toBe(5);
        expect(diagram.edges.length).toBe(4);

        const nodeA = diagram.nodes.find(n => n.id === 'A');
        expect(nodeA?.shape).toBe('rectangle');

        const nodeB = diagram.nodes.find(n => n.id === 'B');
        expect(nodeB?.shape).toBe('rounded-rectangle');

        const nodeC = diagram.nodes.find(n => n.id === 'C');
        expect(nodeC?.shape).toBe('diamond');

        const nodeD = diagram.nodes.find(n => n.id === 'D');
        expect(nodeD?.shape).toBe('circle');

        const nodeE = diagram.nodes.find(n => n.id === 'E');
        expect(nodeE?.shape).toBe('cylinder');
    });

    it('should parse edge labels', () => {
        const code = `flowchart LR
    A --> |Yes| B
    A --> |No| C`;

        const diagram = parseMermaid(code);

        expect(diagram.edges.length).toBe(2);
        expect(diagram.edges[0].label).toBe('Yes');
        expect(diagram.edges[1].label).toBe('No');
    });

    it('should parse subgraphs', () => {
        const code = `flowchart TB
    subgraph Group1
        A --> B
    end
    C --> A`;

        const diagram = parseMermaid(code);

        expect(diagram.groups.length).toBe(1);
        expect(diagram.groups[0].id).toBe('Group1');
        expect(diagram.groups[0].children).toContain('A');
        expect(diagram.groups[0].children).toContain('B');
    });
});

describe('autoLayout', () => {
    it('should apply dagre layout without throwing', () => {
        const diagram = parseMermaid(`flowchart LR
    A[Start] --> B{Decision}
    B -->|Yes| C[Process]
    B -->|No| D[End]`);

        const layouted = autoLayout(diagram, {
            algorithm: 'dagre',
            direction: 'LR',
        });

        expect(layouted.nodes.length).toBe(4);

        // All nodes should have positions
        for (const node of layouted.nodes) {
            expect(node.position).toBeDefined();
            expect(node.position?.x).toBeGreaterThanOrEqual(0);
            expect(node.position?.y).toBeGreaterThanOrEqual(0);
        }
    });

    it('should fallback to simple layout on dagre error', () => {
        // Create a diagram that might cause dagre issues
        const diagram = parseMermaid(`flowchart LR
    A --> B
    B --> C
    C --> A`);

        // Should not throw
        const layouted = autoLayout(diagram, {
            algorithm: 'dagre',
            direction: 'LR',
        });

        expect(layouted.nodes.length).toBe(3);
        for (const node of layouted.nodes) {
            expect(node.position).toBeDefined();
        }
    });

    it('should skip layout when algorithm is none', () => {
        const diagram = parseMermaid(`flowchart LR
    A --> B`);

        const layouted = autoLayout(diagram, {
            algorithm: 'none',
        });

        // Positions should be undefined (not applied)
        expect(layouted.nodes[0].position).toBeUndefined();
    });

    it('should produce valid numeric positions (not NaN)', () => {
        // This test reproduces the NaN bug
        const diagram = parseMermaid(`flowchart LR
    A[Start] --> B{Decision}
    B -->|Yes| C[Process]
    B -->|No| D[End]
    C --> E((Result))
    E --> D`);

        const layouted = autoLayout(diagram, {
            algorithm: 'dagre',
            direction: 'LR',
        });

        expect(layouted.nodes.length).toBe(5);

        // All nodes must have valid numeric positions (not NaN)
        for (const node of layouted.nodes) {
            expect(node.position).toBeDefined();
            expect(Number.isNaN(node.position?.x)).toBe(false);
            expect(Number.isNaN(node.position?.y)).toBe(false);
            expect(typeof node.position?.x).toBe('number');
            expect(typeof node.position?.y).toBe('number');
            expect(node.position?.x).toBeGreaterThanOrEqual(0);
            expect(node.position?.y).toBeGreaterThanOrEqual(0);
        }
    });

    it('should use default options when not provided', () => {
        const diagram = parseMermaid(`flowchart TB
    A --> B`);

        // Call without options
        const layouted = autoLayout(diagram);

        expect(layouted.nodes.length).toBe(2);
        for (const node of layouted.nodes) {
            expect(node.position).toBeDefined();
            expect(Number.isNaN(node.position?.x)).toBe(false);
            expect(Number.isNaN(node.position?.y)).toBe(false);
        }
    });
});

describe('generateDrawio', () => {
    it('should generate valid XML', () => {
        const diagram = parseMermaid(`flowchart LR
    A[Start] --> B[End]`);

        const layouted = autoLayout(diagram, { algorithm: 'dagre', direction: 'LR' });
        const xml = generateDrawio(layouted);

        expect(xml).toContain('<?xml version="1.0"');
        expect(xml).toContain('<mxfile');
        expect(xml).toContain('</mxfile>');
        expect(xml).toContain('Start');
        expect(xml).toContain('End');
    });

    it('should include all nodes as mxCell', () => {
        const diagram = parseMermaid(`flowchart LR
    A --> B --> C --> D`);

        // Debug: check parsed nodes and edges
        expect(diagram.nodes.length).toBe(4);
        expect(diagram.edges.length).toBe(3);

        const layouted = autoLayout(diagram, { algorithm: 'dagre', direction: 'LR' });
        const xml = generateDrawio(layouted);

        // Count mxCell elements (2 root + 4 nodes + 3 edges = 9)
        const cellCount = (xml.match(/<mxCell/g) || []).length;
        expect(cellCount).toBeGreaterThanOrEqual(9);
    });

    it('should generate correct shape styles for diamond and circle', () => {
        const diagram = parseMermaid(`flowchart LR
    A{Diamond} --> B((Circle))`);

        expect(diagram.nodes[0].shape).toBe('diamond');
        expect(diagram.nodes[1].shape).toBe('circle');

        const layouted = autoLayout(diagram, { algorithm: 'dagre', direction: 'LR' });
        const xml = generateDrawio(layouted);

        // Diamond should use rhombus style
        expect(xml).toContain('style="rhombus');
        // Circle should use ellipse with aspect=fixed
        expect(xml).toContain('ellipse');
        expect(xml).toContain('aspect=fixed');
    });

    it('should connect edges with source and target', () => {
        const diagram = parseMermaid(`flowchart LR
    A --> B`);

        const layouted = autoLayout(diagram, { algorithm: 'dagre', direction: 'LR' });
        const xml = generateDrawio(layouted);

        // Edge should have source and target attributes
        expect(xml).toMatch(/edge="1".*source="\d+".*target="\d+"/);
    });

    it('should include edge labels', () => {
        const diagram = parseMermaid(`flowchart LR
    A -->|Yes| B`);

        const layouted = autoLayout(diagram, { algorithm: 'dagre', direction: 'LR' });
        const xml = generateDrawio(layouted);

        // Edge should have label
        expect(xml).toContain('value="Yes"');
    });
});

describe('generateExcalidraw', () => {
    it('should generate valid JSON', () => {
        const diagram = parseMermaid(`flowchart LR
    A[Start] --> B[End]`);

        const layouted = autoLayout(diagram, { algorithm: 'dagre', direction: 'LR' });
        const json = generateExcalidraw(layouted);

        const parsed = JSON.parse(json);
        expect(parsed.type).toBe('excalidraw');
        expect(parsed.version).toBe(2);
        expect(parsed.elements).toBeInstanceOf(Array);
    });

    it('should create elements for nodes and edges', () => {
        const diagram = parseMermaid(`flowchart LR
    A --> B`);

        const layouted = autoLayout(diagram, { algorithm: 'dagre', direction: 'LR' });
        const json = generateExcalidraw(layouted);

        const parsed = JSON.parse(json);

        // Should have rectangles for nodes and arrows for edges
        const rectangles = parsed.elements.filter((e: any) => e.type === 'rectangle');
        const arrows = parsed.elements.filter((e: any) => e.type === 'arrow');

        expect(rectangles.length).toBeGreaterThanOrEqual(2);
        expect(arrows.length).toBeGreaterThanOrEqual(1);
    });
});

describe('Mermaid to PlantUML', () => {
    it('should convert diamond shape to valid PlantUML syntax', () => {
        // Regression test: PlantUML doesn't support "diamond" keyword
        const result = convert(`flowchart LR
    A[Start] --> B{Decision}
    B -->|Yes| C[Process]`, {
            from: 'mermaid',
            to: 'plantuml',
        });

        expect(result.output).toBeDefined();
        expect(result.output).toContain('@startuml');
        expect(result.output).toContain('@enduml');

        // Should NOT contain invalid "diamond" keyword
        expect(result.output).not.toMatch(/^diamond\s+"/m);

        // Should use agent with <<choice>> stereotype for decision nodes
        expect(result.output).toContain('agent');
        expect(result.output).toContain('<<choice>>');
    });

    it('should generate valid PlantUML for all basic shapes', () => {
        const result = convert(`flowchart LR
    A[Rectangle] --> B(Rounded)
    B --> C{Diamond}
    C --> D((Circle))
    D --> E[(Database)]`, {
            from: 'mermaid',
            to: 'plantuml',
        });

        expect(result.output).toContain('@startuml');
        expect(result.output).toContain('rectangle');
        expect(result.output).toContain('card');      // rounded-rectangle
        expect(result.output).toContain('circle');
        expect(result.output).toContain('database');
    });
});

describe('Text encoding options', () => {
    it('should transliterate Cyrillic when option is set', () => {
        const result = convert(`flowchart LR
    A[Начало] --> B[Конец]`, {
            from: 'mermaid',
            to: 'plantuml',
            text: { transliterate: true },
        });

        // Should not contain Cyrillic
        expect(result.output).not.toMatch(/[а-яА-ЯёЁ]/);
        // Should contain transliterated text
        expect(result.output).toContain('Nachalo');
        expect(result.output).toContain('Konets');
    });

    it('should truncate labels when maxLength is set', () => {
        const result = convert(`flowchart LR
    A[This is a very long label that should be truncated] --> B[Short]`, {
            from: 'mermaid',
            to: 'plantuml',
            text: { maxLength: 20 },
        });

        // Should contain truncated label with ...
        expect(result.output).toContain('...');
        // Original long text should not be present
        expect(result.output).not.toContain('should be truncated');
    });

    it('should preserve Cyrillic when transliterate is false', () => {
        const result = convert(`flowchart LR
    A[Привет] --> B[Мир]`, {
            from: 'mermaid',
            to: 'excalidraw',
            text: { transliterate: false },
        });

        // Excalidraw (JSON) handles Unicode fine
        expect(result.output).toContain('Привет');
        expect(result.output).toContain('Мир');
    });
});


describe('Mermaid to Mermaid (roundtrip)', () => {
    it('should preserve node shapes in roundtrip conversion', () => {
        const input = `flowchart LR
    A[Start] --> B{Decision}
    B -->|Yes| C[Process]
    B -->|No| D[End]
    C --> E((Result))
    E --> D`;

        const result = convert(input, {
            from: 'mermaid',
            to: 'mermaid',
        });

        // Check that shapes are preserved
        expect(result.output).toContain('[Start]');
        expect(result.output).toContain('{Decision}');
        expect(result.output).toContain('[Process]');
        expect(result.output).toContain('[End]');
        expect(result.output).toContain('((Result))');

        // Check that edge labels are preserved
        expect(result.output).toContain('|Yes|');
        expect(result.output).toContain('|No|');
    });

    it('should preserve all shape types', () => {
        const input = `flowchart TB
    A[Rectangle] --> B(Rounded)
    B --> C{Diamond}
    C --> D((Circle))
    D --> E[(Database)]
    E --> F{{Hexagon}}`;

        const result = convert(input, {
            from: 'mermaid',
            to: 'mermaid',
        });

        expect(result.output).toContain('[Rectangle]');
        expect(result.output).toContain('(Rounded)');
        expect(result.output).toContain('{Diamond}');
        expect(result.output).toContain('((Circle))');
        expect(result.output).toContain('[(Database)]');
        expect(result.output).toContain('{{Hexagon}}');
    });
});
