/**
 * Zod validation schemas for parser inputs
 * 
 * Provides runtime validation with clear error messages
 */

import { z } from 'zod';

// ============================================================================
// Base Schema
// ============================================================================

/** Base schema for non-empty string input */
const NonEmptyStringSchema = z.string().min(1, 'Input cannot be empty');

// ============================================================================
// Mermaid Schema
// ============================================================================

/** Valid Mermaid diagram type patterns */
const MERMAID_PATTERNS = [
    /^(graph|flowchart)\s+(TB|BT|LR|RL|TD)/im,
    /^sequenceDiagram/im,
    /^classDiagram/im,
    /^stateDiagram/im,
    /^erDiagram/im,
    /^gantt/im,
    /^pie/im,
    /^journey/im,
    /^gitGraph/im,
    /^mindmap/im,
    /^timeline/im,
    /^quadrantChart/im,
    /^requirementDiagram/im,
    /^C4Context/im,
];

export const MermaidInputSchema = NonEmptyStringSchema.refine(
    (s) => MERMAID_PATTERNS.some(pattern => pattern.test(s.trim())),
    { message: 'Not a valid Mermaid diagram. Expected: graph, flowchart, sequenceDiagram, classDiagram, etc.' }
);

// ============================================================================
// Draw.io Schema
// ============================================================================

export const DrawioInputSchema = NonEmptyStringSchema.refine(
    (s) => s.includes('<mxfile') || s.includes('<mxGraphModel'),
    { message: 'Not a valid Draw.io XML. Expected <mxfile> or <mxGraphModel> element.' }
);

// ============================================================================
// PlantUML Schema
// ============================================================================

/** Valid PlantUML start markers */
const PLANTUML_START_MARKERS = [
    '@startuml',
    '@startmindmap',
    '@startwbs',
    '@startgantt',
    '@startsalt',
    '@startjson',
    '@startyaml',
    '@startditaa',
    '@startdot',
];

export const PlantUMLInputSchema = NonEmptyStringSchema.refine(
    (s) => PLANTUML_START_MARKERS.some(marker => s.toLowerCase().includes(marker.toLowerCase())),
    { message: 'Not a valid PlantUML diagram. Expected @startuml, @startmindmap, or similar marker.' }
);

// ============================================================================
// DOT (Graphviz) Schema
// ============================================================================

export const DotInputSchema = NonEmptyStringSchema.refine(
    (s) => /^\s*(strict\s+)?(di)?graph\s+/im.test(s.trim()),
    { message: 'Not a valid DOT/Graphviz diagram. Expected "graph" or "digraph" declaration.' }
);

// ============================================================================
// D2 Schema
// ============================================================================

/** D2 has flexible syntax - check for common patterns */
export const D2InputSchema = NonEmptyStringSchema.refine(
    (s) => {
        const trimmed = s.trim();
        // D2 accepts: arrows, colon definitions, braces, or simple identifiers (node names)
        return /->|<->|--|<-/.test(trimmed) ||
            /^\w+\s*:/.test(trimmed) ||
            /^\w+\s*\{/.test(trimmed) ||
            /^\s*\w+\s*$/m.test(trimmed); // Simple node name on a line
    },
    { message: 'Not a valid D2 diagram. Expected node definitions or connections (->).' }
);

// ============================================================================
// Excalidraw Schema
// ============================================================================

export const ExcalidrawInputSchema = NonEmptyStringSchema.refine(
    (s) => {
        try {
            const data = JSON.parse(s);
            return data.type === 'excalidraw' && Array.isArray(data.elements);
        } catch {
            return false;
        }
    },
    { message: 'Not a valid Excalidraw JSON. Expected { "type": "excalidraw", "elements": [...] }.' }
);

// ============================================================================
// BPMN Schema
// ============================================================================

export const BpmnInputSchema = NonEmptyStringSchema.refine(
    (s) => {
        const lower = s.toLowerCase();
        return lower.includes('<definitions') ||
            lower.includes('bpmn:definitions') ||
            lower.includes('<process') ||
            lower.includes('bpmn:process');
    },
    { message: 'Not a valid BPMN XML. Expected <definitions> or <process> element.' }
);

// ============================================================================
// GraphML Schema
// ============================================================================

export const GraphmlInputSchema = NonEmptyStringSchema.refine(
    (s) => s.includes('<graphml') || s.includes('<graph'),
    { message: 'Not a valid GraphML XML. Expected <graphml> or <graph> element.' }
);

// ============================================================================
// Lucidchart Schema
// ============================================================================

export const LucidchartInputSchema = NonEmptyStringSchema.refine(
    (s) => {
        try {
            const data = JSON.parse(s);
            // Lucidchart exports have shapes/lines or pages with shapes/lines
            return (Array.isArray(data.shapes) || Array.isArray(data.lines)) ||
                (Array.isArray(data.pages) && data.pages.length > 0);
        } catch {
            return false;
        }
    },
    { message: 'Not a valid Lucidchart JSON. Expected { "shapes": [...] } or { "pages": [...] }.' }
);

// ============================================================================
// Structurizr Schema
// ============================================================================

export const StructurizrInputSchema = NonEmptyStringSchema.refine(
    (s) => {
        const lower = s.toLowerCase();
        // Structurizr DSL keywords
        return lower.includes('workspace') ||
            lower.includes('softwaresystem') ||
            lower.includes('container') ||
            lower.includes('component') ||
            lower.includes('person');
    },
    { message: 'Not a valid Structurizr DSL. Expected workspace, softwareSystem, container, component, or person.' }
);

// ============================================================================
// Schema Map for Dynamic Validation
// ============================================================================

/** Map of format names to their validation schemas */
export const InputSchemas = {
    mermaid: MermaidInputSchema,
    drawio: DrawioInputSchema,
    plantuml: PlantUMLInputSchema,
    dot: DotInputSchema,
    d2: D2InputSchema,
    excalidraw: ExcalidrawInputSchema,
    bpmn: BpmnInputSchema,
    graphml: GraphmlInputSchema,
    lucidchart: LucidchartInputSchema,
    structurizr: StructurizrInputSchema,
} as const;

export type InputSchemaFormat = keyof typeof InputSchemas;

// ============================================================================
// Type Exports
// ============================================================================

export type MermaidInput = z.infer<typeof MermaidInputSchema>;
export type DrawioInput = z.infer<typeof DrawioInputSchema>;
export type PlantUMLInput = z.infer<typeof PlantUMLInputSchema>;
export type DotInput = z.infer<typeof DotInputSchema>;
export type D2Input = z.infer<typeof D2InputSchema>;
export type ExcalidrawInput = z.infer<typeof ExcalidrawInputSchema>;
export type BpmnInput = z.infer<typeof BpmnInputSchema>;
export type GraphmlInput = z.infer<typeof GraphmlInputSchema>;
export type LucidchartInput = z.infer<typeof LucidchartInputSchema>;
export type StructurizrInput = z.infer<typeof StructurizrInputSchema>;
