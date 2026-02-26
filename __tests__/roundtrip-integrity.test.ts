import { describe, it, expect } from 'vitest';
import {
    convert,
    parseMermaid,
    parsePlantUML,
    parseDot,
    parseD2,
    parseExcalidraw,
} from '../src/index';
import type { Diagram, InputFormat, OutputFormat } from '../src/types';

type ExecutableRoundTripCase = {
    name: string;
    via: Extract<OutputFormat, InputFormat>;
    parseVia: (source: string) => Diagram;
    preserveEdgeLabels: boolean;
};

const ROUNDTRIP_SOURCE = `flowchart LR
    Start[Start] -->|ok| Validate{Validate}
    Validate -->|yes| Process[Process]
    Validate -->|no| Reject[Reject]
    Process --> Done((Done))`;

const EXECUTABLE_CASES: readonly ExecutableRoundTripCase[] = [
    {
        name: 'PlantUML',
        via: 'plantuml',
        parseVia: parsePlantUML,
        preserveEdgeLabels: true,
    },
    {
        name: 'DOT',
        via: 'dot',
        parseVia: parseDot,
        preserveEdgeLabels: true,
    },
    {
        name: 'D2',
        via: 'd2',
        parseVia: parseD2,
        preserveEdgeLabels: true,
    },
    {
        name: 'Excalidraw',
        via: 'excalidraw',
        parseVia: parseExcalidraw,
        preserveEdgeLabels: false,
    },
];

describe('Round-trip integrity (A -> B -> A)', () => {
    for (const testCase of EXECUTABLE_CASES) {
        it(`should preserve graph connectivity via ${testCase.name}`, () => {
            const original = parseMermaid(ROUNDTRIP_SOURCE);

            const step1 = convert(ROUNDTRIP_SOURCE, {
                from: 'mermaid',
                to: testCase.via,
            });

            const intermediate = testCase.parseVia(step1.output);
            assertNoDanglingEdges(intermediate);

            const step2 = convert(step1.output, {
                from: testCase.via,
                to: 'mermaid',
            });

            const final = parseMermaid(step2.output);
            assertNoDanglingEdges(final);

            const originalNodeLabels = getNodeLabels(original);
            const finalNodeLabels = getNodeLabels(final);
            expect(finalNodeLabels).toEqual(originalNodeLabels);

            const originalEdges = getEdgeSignatures(original, testCase.preserveEdgeLabels);
            const finalEdges = getEdgeSignatures(final, testCase.preserveEdgeLabels);
            expect(finalEdges).toEqual(originalEdges);
        });
    }

    it.skip('should preserve connectivity via Draw.io (browser DOMParser required)', () => {
        // parseDrawio uses DOMParser/document APIs that are unavailable in Vitest node environment
    });

    it.skip('should preserve connectivity via GraphML (browser DOMParser required)', () => {
        // parseGraphml uses DOMParser/document APIs that are unavailable in Vitest node environment
    });

    it.skip('should preserve connectivity via BPMN (browser DOMParser required)', () => {
        // parseBpmn uses DOMParser/document APIs that are unavailable in Vitest node environment
    });
});

function getNodeLabels(diagram: Diagram): string[] {
    return [...new Set(diagram.nodes.map(node => normalizeLabel(node.label || node.id)))].sort();
}

function getEdgeSignatures(diagram: Diagram, includeEdgeLabels: boolean): string[] {
    const nodeLabelById = new Map(
        diagram.nodes.map(node => [node.id, normalizeLabel(node.label || node.id)])
    );

    return diagram.edges
        .map(edge => {
            const sourceLabel = nodeLabelById.get(edge.source) ?? edge.source;
            const targetLabel = nodeLabelById.get(edge.target) ?? edge.target;
            const labelPart = includeEdgeLabels ? `|${normalizeLabel(edge.label ?? '')}` : '';
            return `${sourceLabel}->${targetLabel}${labelPart}`;
        })
        .sort();
}

function normalizeLabel(label: string): string {
    let normalized = label.trim();

    // Some generators/parsers preserve quoted labels as literal text
    while (
        (normalized.startsWith('"') && normalized.endsWith('"')) ||
        (normalized.startsWith("'") && normalized.endsWith("'"))
    ) {
        normalized = normalized.slice(1, -1).trim();
    }

    // Mermaid round-trip may preserve wrapped quoted labels like ["Done"]
    const wrappedQuoted = normalized.match(/^\[(?:"|')(.+?)(?:"|')\]$/);
    if (wrappedQuoted) {
        normalized = wrappedQuoted[1].trim();
    }

    return normalized;
}

function assertNoDanglingEdges(diagram: Diagram): void {
    const nodeIds = new Set(diagram.nodes.map(node => node.id));

    for (const edge of diagram.edges) {
        expect(
            nodeIds.has(edge.source),
            `Missing source node "${edge.source}" for edge "${edge.id}"`
        ).toBe(true);
        expect(
            nodeIds.has(edge.target),
            `Missing target node "${edge.target}" for edge "${edge.id}"`
        ).toBe(true);
    }
}
