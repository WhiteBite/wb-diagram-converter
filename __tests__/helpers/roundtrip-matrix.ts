import {
    convert,
    parseMermaid,
    parseDrawio,
    parseExcalidraw,
    parsePlantUML,
    parseDot,
    parseD2,
    parseStructurizr,
    parseBpmn,
    parseGraphml,
} from '../../src/index';
import type { Diagram, InputFormat, OutputFormat } from '../../src/types';

export type RoundTripFormat = Extract<InputFormat, OutputFormat>;

export const ALL_ROUNDTRIP_FORMATS: readonly RoundTripFormat[] = [
    'mermaid',
    'drawio',
    'excalidraw',
    'plantuml',
    'dot',
    'd2',
    'structurizr',
    'bpmn',
    'graphml',
];

export const BROWSER_ONLY_FORMATS: readonly RoundTripFormat[] = ['drawio', 'bpmn', 'graphml'];

type DiagramParser = (source: string) => Diagram;

const PARSERS: Record<RoundTripFormat, DiagramParser> = {
    mermaid: parseMermaid,
    drawio: parseDrawio,
    excalidraw: parseExcalidraw,
    plantuml: parsePlantUML,
    dot: parseDot,
    d2: parseD2,
    structurizr: parseStructurizr,
    bpmn: parseBpmn,
    graphml: parseGraphml,
};

export const BASE_MERMAID = `flowchart LR
    Start[Start] -->|ok| Validate{Validate}
    Validate -->|yes| Process[Process]
    Validate -->|no| Reject[Reject]
    Process --> Done((Done))`;

export function createSeedSource(format: RoundTripFormat): string {
    if (format === 'mermaid') {
        return BASE_MERMAID;
    }

    return convert(BASE_MERMAID, {
        from: 'mermaid',
        to: format,
    }).output;
}

export function parseByFormat(format: RoundTripFormat, source: string): Diagram {
    return PARSERS[format](source);
}

export function assertNoDanglingEdges(diagram: Diagram): void {
    const nodeIds = new Set(diagram.nodes.map(node => node.id));

    for (const edge of diagram.edges) {
        if (!nodeIds.has(edge.source)) {
            throw new Error(`Missing source node "${edge.source}" for edge "${edge.id}"`);
        }

        if (!nodeIds.has(edge.target)) {
            throw new Error(`Missing target node "${edge.target}" for edge "${edge.id}"`);
        }
    }
}

export type DiagramSignature = {
    nodes: string[];
    edges: string[];
};

export function getDiagramSignature(diagram: Diagram): DiagramSignature {
    const nodeLabelById = new Map(
        diagram.nodes.map(node => [node.id, normalizeLabel(node.label || node.id)])
    );

    const nodes = [...new Set([...nodeLabelById.values()])].sort();

    // Focus on connectivity first: source->target by normalized node labels.
    // Edge labels are frequently transformed by format-specific syntax rules.
    const edges = diagram.edges
        .map(edge => {
            const sourceLabel = nodeLabelById.get(edge.source) ?? normalizeLabel(edge.source);
            const targetLabel = nodeLabelById.get(edge.target) ?? normalizeLabel(edge.target);
            return `${sourceLabel}->${targetLabel}`;
        })
        .sort();

    return { nodes, edges };
}

export function subsetDifference(expectedSubset: string[], actualSuperset: string[]): string[] {
    const actual = new Set(actualSuperset);
    return expectedSubset.filter(value => !actual.has(value));
}

export function normalizeLabel(label: string): string {
    let normalized = label.trim();

    while (
        (normalized.startsWith('"') && normalized.endsWith('"')) ||
        (normalized.startsWith("'") && normalized.endsWith("'"))
    ) {
        normalized = normalized.slice(1, -1).trim();
    }

    const wrappedQuoted = normalized.match(/^\[(?:"|')(.+?)(?:"|')\]$/);
    if (wrappedQuoted) {
        normalized = wrappedQuoted[1].trim();
    }

    return normalized;
}
