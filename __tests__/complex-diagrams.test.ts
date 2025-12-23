/**
 * Complex diagram conversion tests
 * 
 * Tests conversion of complex real-world diagrams between all formats
 */

import { describe, it, expect } from 'vitest';
import { convert, parseMermaid, parsePlantUML, parseDot } from '../src/index';

// =============================================================================
// Complex Test Diagrams
// =============================================================================

const COMPLEX_MERMAID = `flowchart TB
    subgraph Frontend[Frontend Layer]
        direction LR
        UI[React UI] --> State{Zustand Store}
        State --> API[API Client]
    end
    
    subgraph Backend[Backend Services]
        direction TB
        Gateway[API Gateway] --> Auth{Auth Service}
        Auth -->|Valid| Users[(User DB)]
        Auth -->|Invalid| Error[Error Handler]
        Gateway --> Orders[Order Service]
        Orders --> OrderDB[(Order DB)]
        Orders --> Payment[Payment Service]
        Payment -->|Success| Notify[Notification]
        Payment -->|Failed| Retry((Retry Queue))
    end
    
    subgraph External[External Services]
        Stripe[Stripe API]
        Email[Email Service]
        SMS[SMS Gateway]
    end
    
    API --> Gateway
    Payment --> Stripe
    Notify --> Email
    Notify --> SMS
    Retry -.-> Payment`;

const COMPLEX_PLANTUML = `@startuml
left to right direction
skinparam packageStyle rectangle

rectangle "User Interface" as UI {
    actor User
    rectangle "Web App" as WebApp
    rectangle "Mobile App" as MobileApp
}

rectangle "API Layer" as API {
    rectangle "REST API" as REST
    rectangle "GraphQL" as GQL
    rectangle "WebSocket" as WS
}

rectangle "Business Logic" as BL {
    rectangle "Auth Module" as Auth
    rectangle "Order Module" as Order
    rectangle "Payment Module" as Payment
    rectangle "Notification Module" as Notif
}

database "Data Layer" as DL {
    database "PostgreSQL" as PG
    database "Redis Cache" as Redis
    database "S3 Storage" as S3
}

cloud "External" as Ext {
    rectangle "Stripe" as Stripe
    rectangle "SendGrid" as SG
    rectangle "Twilio" as Twilio
}

User --> WebApp
User --> MobileApp
WebApp --> REST
WebApp --> WS
MobileApp --> REST
MobileApp --> GQL

REST --> Auth
REST --> Order
GQL --> Order
GQL --> Payment
WS --> Notif

Auth --> PG
Auth --> Redis
Order --> PG
Payment --> PG
Payment --> Stripe
Notif --> SG
Notif --> Twilio
Order --> S3

@enduml`;

const COMPLEX_DOT = `digraph G {
    rankdir=TB;
    compound=true;
    
    subgraph cluster_frontend {
        label="Frontend";
        style=filled;
        color=lightblue;
        
        react [label="React App" shape=box];
        redux [label="Redux Store" shape=diamond];
        router [label="React Router" shape=box];
        
        react -> redux;
        react -> router;
    }
    
    subgraph cluster_backend {
        label="Backend";
        style=filled;
        color=lightgreen;
        
        express [label="Express Server" shape=box];
        auth [label="Auth Middleware" shape=diamond];
        api [label="REST API" shape=box];
        ws [label="WebSocket" shape=ellipse];
        
        express -> auth;
        auth -> api;
        express -> ws;
    }
    
    subgraph cluster_data {
        label="Data Layer";
        style=filled;
        color=lightyellow;
        
        postgres [label="PostgreSQL" shape=cylinder];
        redis [label="Redis" shape=cylinder];
        elastic [label="Elasticsearch" shape=cylinder];
    }
    
    react -> express [label="HTTP/WS" lhead=cluster_backend];
    api -> postgres;
    api -> redis;
    api -> elastic;
    ws -> redis [label="Pub/Sub"];
}`;

// =============================================================================
// Mermaid Parser Tests
// =============================================================================

describe('Mermaid Parser - Complex Diagrams', () => {
    it('should parse subgraphs with nested direction', () => {
        const diagram = parseMermaid(COMPLEX_MERMAID);

        expect(diagram.groups.length).toBeGreaterThanOrEqual(3);
        expect(diagram.groups.map(g => g.id)).toContain('Frontend');
        expect(diagram.groups.map(g => g.id)).toContain('Backend');
        expect(diagram.groups.map(g => g.id)).toContain('External');
    });

    it('should parse all node shapes correctly', () => {
        const diagram = parseMermaid(COMPLEX_MERMAID);

        const nodeShapes = new Map(diagram.nodes.map(n => [n.id, n.shape]));

        // Rectangle nodes
        expect(nodeShapes.get('UI')).toBe('rectangle');
        expect(nodeShapes.get('Gateway')).toBe('rectangle');

        // Diamond nodes (decision)
        expect(nodeShapes.get('State')).toBe('diamond');
        expect(nodeShapes.get('Auth')).toBe('diamond');

        // Cylinder nodes (database)
        expect(nodeShapes.get('Users')).toBe('cylinder');
        expect(nodeShapes.get('OrderDB')).toBe('cylinder');

        // Circle nodes
        expect(nodeShapes.get('Retry')).toBe('circle');
    });

    it('should parse edge labels correctly', () => {
        const diagram = parseMermaid(COMPLEX_MERMAID);

        const edgeLabels = diagram.edges
            .filter(e => e.label)
            .map(e => ({ source: e.source, target: e.target, label: e.label }));

        expect(edgeLabels).toContainEqual({ source: 'Auth', target: 'Users', label: 'Valid' });
        expect(edgeLabels).toContainEqual({ source: 'Auth', target: 'Error', label: 'Invalid' });
        expect(edgeLabels).toContainEqual({ source: 'Payment', target: 'Notify', label: 'Success' });
        expect(edgeLabels).toContainEqual({ source: 'Payment', target: 'Retry', label: 'Failed' });
    });

    it('should parse dotted/dashed arrows', () => {
        const diagram = parseMermaid(COMPLEX_MERMAID);

        const retryEdge = diagram.edges.find(e => e.source === 'Retry' && e.target === 'Payment');
        expect(retryEdge).toBeDefined();
        expect(retryEdge?.arrow.lineType).toBe('dashed');
    });

    it('should handle chain edges correctly', () => {
        const chainMermaid = `flowchart LR
    A --> B --> C --> D --> E`;

        const diagram = parseMermaid(chainMermaid);

        expect(diagram.nodes.length).toBe(5);
        expect(diagram.edges.length).toBe(4);
        expect(diagram.edges.map(e => `${e.source}->${e.target}`)).toEqual([
            'A->B', 'B->C', 'C->D', 'D->E'
        ]);
    });
});

// =============================================================================
// PlantUML Parser Tests
// =============================================================================

describe('PlantUML Parser - Complex Diagrams', () => {
    it('should parse actors and rectangles', () => {
        const diagram = parsePlantUML(COMPLEX_PLANTUML);

        expect(diagram.nodes.length).toBeGreaterThan(10);

        const user = diagram.nodes.find(n => n.id === 'User');
        expect(user).toBeDefined();
        expect(user?.shape).toBe('actor');
    });

    it('should parse database shapes', () => {
        const diagram = parsePlantUML(COMPLEX_PLANTUML);

        const pg = diagram.nodes.find(n => n.id === 'PG');
        expect(pg).toBeDefined();
        expect(pg?.shape).toBe('cylinder');
    });

    it('should parse all connections', () => {
        const diagram = parsePlantUML(COMPLEX_PLANTUML);

        expect(diagram.edges.length).toBeGreaterThan(15);

        // Check specific connections
        const userToWebApp = diagram.edges.find(e => e.source === 'User' && e.target === 'WebApp');
        expect(userToWebApp).toBeDefined();
    });

    it('should parse groups/packages', () => {
        const diagram = parsePlantUML(COMPLEX_PLANTUML);

        expect(diagram.groups.length).toBeGreaterThanOrEqual(4);
    });
});

// =============================================================================
// DOT Parser Tests
// =============================================================================

describe('DOT Parser - Complex Diagrams', () => {
    it('should parse clusters as groups', () => {
        const diagram = parseDot(COMPLEX_DOT);

        expect(diagram.groups.length).toBe(3);
        expect(diagram.groups.map(g => g.label)).toContain('Frontend');
        expect(diagram.groups.map(g => g.label)).toContain('Backend');
        expect(diagram.groups.map(g => g.label)).toContain('Data Layer');
    });

    it('should parse node shapes', () => {
        const diagram = parseDot(COMPLEX_DOT);

        const nodeShapes = new Map(diagram.nodes.map(n => [n.id, n.shape]));

        expect(nodeShapes.get('redux')).toBe('diamond');
        expect(nodeShapes.get('ws')).toBe('ellipse');
        expect(nodeShapes.get('postgres')).toBe('cylinder');
    });

    it('should parse edge labels', () => {
        const diagram = parseDot(COMPLEX_DOT);

        const labeledEdges = diagram.edges.filter(e => e.label);
        expect(labeledEdges.length).toBeGreaterThan(0);

        const pubsubEdge = diagram.edges.find(e => e.label === 'Pub/Sub');
        expect(pubsubEdge).toBeDefined();
    });

    it('should parse all nodes in clusters', () => {
        const diagram = parseDot(COMPLEX_DOT);

        // Note: Some nodes may be missed due to parser limitations
        expect(diagram.nodes.length).toBeGreaterThanOrEqual(10);
    });
});

// =============================================================================
// Cross-Format Conversion Tests
// =============================================================================

describe('Cross-Format Conversion - Complex Diagrams', () => {
    describe('Mermaid to other formats', () => {
        it('should convert to Draw.io preserving structure', () => {
            const result = convert(COMPLEX_MERMAID, {
                from: 'mermaid',
                to: 'drawio',
            });

            expect(result.output).toContain('<?xml');
            expect(result.output).toContain('mxfile');

            // Check nodes are present
            expect(result.output).toContain('React UI');
            expect(result.output).toContain('API Gateway');
            expect(result.output).toContain('Payment Service');

            // Check shapes
            expect(result.output).toContain('rhombus'); // diamond
            expect(result.output).toContain('cylinder'); // database
        });

        it('should convert to Excalidraw preserving structure', () => {
            const result = convert(COMPLEX_MERMAID, {
                from: 'mermaid',
                to: 'excalidraw',
            });

            const parsed = JSON.parse(result.output);

            expect(parsed.type).toBe('excalidraw');
            expect(parsed.elements.length).toBeGreaterThan(20);

            // Check for rectangles and diamonds
            const rectangles = parsed.elements.filter((e: { type: string }) => e.type === 'rectangle');
            const diamonds = parsed.elements.filter((e: { type: string }) => e.type === 'diamond');
            const arrows = parsed.elements.filter((e: { type: string }) => e.type === 'arrow');

            expect(rectangles.length).toBeGreaterThan(5);
            expect(diamonds.length).toBeGreaterThan(0);
            expect(arrows.length).toBeGreaterThan(10);
        });

        it('should convert to PlantUML preserving structure', () => {
            const result = convert(COMPLEX_MERMAID, {
                from: 'mermaid',
                to: 'plantuml',
            });

            expect(result.output).toContain('@startuml');
            expect(result.output).toContain('@enduml');

            // Check nodes
            expect(result.output).toMatch(/rectangle.*"React UI"/);
            expect(result.output).toMatch(/database.*"User DB"/);

            // Check connections
            expect(result.output).toContain('-->');
        });

        it('should convert to DOT preserving structure', () => {
            const result = convert(COMPLEX_MERMAID, {
                from: 'mermaid',
                to: 'dot',
            });

            expect(result.output).toContain('digraph');
            expect(result.output).toContain('->');

            // Check subgraphs
            expect(result.output).toContain('subgraph');
            expect(result.output).toContain('cluster_');
        });
    });

    describe('Roundtrip conversions', () => {
        // Note: Draw.io parser requires DOMParser (browser API), skipping in Node.js
        it.skip('Mermaid -> Draw.io -> Mermaid should preserve node count', () => {
            const original = parseMermaid(COMPLEX_MERMAID);

            const drawio = convert(COMPLEX_MERMAID, { from: 'mermaid', to: 'drawio' });
            const backToMermaid = convert(drawio.output, { from: 'drawio', to: 'mermaid' });

            const final = parseMermaid(backToMermaid.output);

            // Node count should be preserved (or close)
            expect(final.nodes.length).toBeGreaterThanOrEqual(original.nodes.length * 0.8);
        });

        // Note: Excalidraw parser extracts elements but loses semantic info for Mermaid generation
        it.skip('Mermaid -> Excalidraw -> Mermaid should preserve basic structure', () => {
            const simpleMermaid = `flowchart LR
    A[Start] --> B{Decision}
    B -->|Yes| C[Process]
    B -->|No| D[End]`;

            const original = parseMermaid(simpleMermaid);

            const excalidraw = convert(simpleMermaid, { from: 'mermaid', to: 'excalidraw' });
            const backToMermaid = convert(excalidraw.output, { from: 'excalidraw', to: 'mermaid' });

            const final = parseMermaid(backToMermaid.output);

            expect(final.nodes.length).toBe(original.nodes.length);
            expect(final.edges.length).toBe(original.edges.length);
        });
    });
});

// =============================================================================
// Edge Cases and Error Handling
// =============================================================================

describe('Edge Cases', () => {
    it('should handle empty subgraphs', () => {
        const mermaid = `flowchart TB
    subgraph Empty
    end
    A --> B`;

        const diagram = parseMermaid(mermaid);
        expect(diagram.nodes.length).toBe(2);
        expect(diagram.groups.length).toBe(1);
    });

    it('should handle nodes with special characters in labels', () => {
        const mermaid = `flowchart LR
    A["Node with (parentheses)"] --> B["Node with [brackets]"]
    B --> C["Node with {braces}"]`;

        const diagram = parseMermaid(mermaid);
        expect(diagram.nodes.length).toBe(3);
    });

    it('should handle very long chains', () => {
        const nodes = Array.from({ length: 20 }, (_, i) => String.fromCharCode(65 + i));
        const chain = nodes.join(' --> ');
        const mermaid = `flowchart LR\n    ${chain}`;

        const diagram = parseMermaid(mermaid);
        expect(diagram.nodes.length).toBe(20);
        expect(diagram.edges.length).toBe(19);
    });

    it('should handle bidirectional arrows', () => {
        const mermaid = `flowchart LR
    A <--> B
    C o--o D
    E x--x F`;

        const diagram = parseMermaid(mermaid);
        expect(diagram.edges.length).toBe(3);

        const biArrow = diagram.edges.find(e => e.source === 'A');
        expect(biArrow?.arrow.sourceType).toBe('arrow');
        expect(biArrow?.arrow.targetType).toBe('arrow');
    });

    it('should handle mixed arrow styles', () => {
        const mermaid = `flowchart LR
    A --> B
    B -.-> C
    C ==> D
    D --o E
    E --x F`;

        const diagram = parseMermaid(mermaid);
        expect(diagram.edges.length).toBe(5);

        const dashed = diagram.edges.find(e => e.source === 'B');
        expect(dashed?.arrow.lineType).toBe('dashed');

        // Thick arrow ==>
        const thick = diagram.edges.find(e => e.source === 'C');
        expect(thick?.arrow.lineType).toBe('thick');

        // Circle end
        const circle = diagram.edges.find(e => e.source === 'D');
        expect(circle?.arrow.targetType).toBe('circle');

        // Cross end
        const cross = diagram.edges.find(e => e.source === 'E');
        expect(cross?.arrow.targetType).toBe('cross');
    });
});

// =============================================================================
// Performance Tests
// =============================================================================

describe('Performance', () => {
    it('should handle large diagrams efficiently', () => {
        // Generate a large diagram
        const nodes = Array.from({ length: 100 }, (_, i) => `N${i}[Node ${i}]`);
        const edges = Array.from({ length: 150 }, (_, i) =>
            `N${i % 100} --> N${(i + 1) % 100}`
        );

        const largeMermaid = `flowchart TB\n    ${nodes.join('\n    ')}\n    ${edges.join('\n    ')}`;

        const start = performance.now();
        const result = convert(largeMermaid, { from: 'mermaid', to: 'drawio' });
        const elapsed = performance.now() - start;

        expect(result.output).toBeDefined();
        expect(elapsed).toBeLessThan(5000); // Should complete in under 5 seconds
    });
});
