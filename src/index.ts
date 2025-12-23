/**
 * WB Diagrams - Universal Diagram Converter
 * 
 * @packageDocumentation
 * @module @whitebite/diagrams
 */

// Types
export * from './types';

// Constants
export * from './constants';

// Utils
export * from './utils';

// Parsers - Core
export { parseMermaid } from './parsers/mermaid';
export { parseDrawio } from './parsers/drawio';
export { parseExcalidraw } from './parsers/excalidraw';
export { parsePlantUML } from './parsers/plantuml';
export { parseDot } from './parsers/dot';
// Parsers - Extended
export { parseD2 } from './parsers/d2';
export { parseStructurizr } from './parsers/structurizr';
export { parseBpmn, parseBpmn as parseBPMN } from './parsers/bpmn';
export { parseGraphml, parseGraphml as parseGraphML } from './parsers/graphml';
export { parseLucidchart } from './parsers/lucidchart';
export * from './parsers/base';

// Generators - Core
export { generateDrawio } from './generators/drawio';
export { generateExcalidraw } from './generators/excalidraw';
export { generateMermaid } from './generators/mermaid';
export { generatePlantUML } from './generators/plantuml';
export { generateDot } from './generators/dot';
export { generateSvg } from './generators/svg';
export { generatePng, generatePngBlob, generatePngWithInfo, downloadPng } from './generators/png';
// Generators - Extended
export { generateD2 } from './generators/d2';
export { generateStructurizr } from './generators/structurizr';
export { generateBpmn, generateBpmn as generateBPMN } from './generators/bpmn';
export { generateGraphML } from './generators/graphml';
export type { SvgOptions } from './generators/svg';
export type { PngOptions, PngResult } from './generators/png';

// Layout
export { autoLayout } from './layout/auto-layout';

// Fixers
export { fixSyntax, hasFixerFor, getRulesFor, fixMermaid, fixPlantUML } from './fixers';
export type { FixResult, FixRule, SyntaxError, FixSuggestion } from './fixers';

// Errors
export * from './errors';

// Main convert function
import type { ConvertOptions, ConvertResult, Diagram, InputFormat, OutputFormat } from './types';
import { parseMermaid } from './parsers/mermaid';
import { parseDrawio } from './parsers/drawio';
import { parseExcalidraw } from './parsers/excalidraw';
import { parsePlantUML } from './parsers/plantuml';
import { parseDot } from './parsers/dot';
import { parseD2 } from './parsers/d2';
import { parseStructurizr } from './parsers/structurizr';
import { parseBpmn } from './parsers/bpmn';
import { parseGraphml } from './parsers/graphml';
import { parseLucidchart } from './parsers/lucidchart';
import { generateDrawio } from './generators/drawio';
import { generateExcalidraw } from './generators/excalidraw';
import { generateMermaid } from './generators/mermaid';
import { generatePlantUML } from './generators/plantuml';
import { generateDot } from './generators/dot';
import { generateSvg } from './generators/svg';
import { generatePng } from './generators/png';
import { generateD2 } from './generators/d2';
import { generateStructurizr } from './generators/structurizr';
import { generateBpmn } from './generators/bpmn';
import { generateGraphML } from './generators/graphml';
import { autoLayout } from './layout/auto-layout';
import { encodeText, transliterateCyrillic, hasCyrillic } from './utils/text-encoder';

/** Parser functions by format */
const parsers: Record<InputFormat, (source: string) => Diagram> = {
    mermaid: parseMermaid,
    drawio: parseDrawio,
    excalidraw: parseExcalidraw,
    plantuml: parsePlantUML,
    dot: parseDot,
    d2: parseD2,
    structurizr: parseStructurizr,
    bpmn: parseBpmn,
    graphml: parseGraphml,
    lucidchart: parseLucidchart,
};

/** Generator functions by format */
const generators: Record<OutputFormat, (diagram: Diagram) => string> = {
    mermaid: generateMermaid,
    drawio: generateDrawio,
    excalidraw: generateExcalidraw,
    plantuml: generatePlantUML,
    dot: generateDot,
    svg: generateSvg,
    png: generatePng,
    d2: generateD2,
    structurizr: generateStructurizr,
    bpmn: generateBpmn,
    graphml: generateGraphML,
};

/**
 * Apply text transformations to diagram labels
 */
function applyTextOptions(diagram: Diagram, options: ConvertOptions): Diagram {
    if (!options.text) return diagram;

    const { transliterate, maxLength, escapeSpecial } = options.text;
    const targetFormat = options.to;

    // Transform node labels
    const transformedNodes = diagram.nodes.map(node => {
        let label = node.label;

        // Transliterate Cyrillic if requested
        if (transliterate && hasCyrillic(label)) {
            label = transliterateCyrillic(label);
        }

        // Truncate if needed
        if (maxLength && label.length > maxLength) {
            label = label.slice(0, maxLength - 3) + '...';
        }

        // Encode for target format
        if (escapeSpecial !== false) {
            label = encodeText(label, targetFormat, { escapeSpecial });
        }

        return label !== node.label ? { ...node, label } : node;
    });

    // Transform edge labels
    const transformedEdges = diagram.edges.map(edge => {
        if (!edge.label) return edge;

        let label = edge.label;

        if (transliterate && hasCyrillic(label)) {
            label = transliterateCyrillic(label);
        }

        if (maxLength && label.length > maxLength) {
            label = label.slice(0, maxLength - 3) + '...';
        }

        if (escapeSpecial !== false) {
            label = encodeText(label, targetFormat, { escapeSpecial });
        }

        return label !== edge.label ? { ...edge, label } : edge;
    });

    // Transform group labels
    const transformedGroups = diagram.groups.map(group => {
        if (!group.label) return group;

        let label = group.label;

        if (transliterate && hasCyrillic(label)) {
            label = transliterateCyrillic(label);
        }

        if (maxLength && label.length > maxLength) {
            label = label.slice(0, maxLength - 3) + '...';
        }

        return label !== group.label ? { ...group, label } : group;
    });

    return {
        ...diagram,
        nodes: transformedNodes,
        edges: transformedEdges,
        groups: transformedGroups,
    };
}

/**
 * Convert diagram from one format to another
 * 
 * @param source - Source diagram code
 * @param options - Conversion options
 * @returns Conversion result with output and intermediate diagram
 * 
 * @example
 * ```typescript
 * import { convert } from '@whitebite/diagrams';
 * 
 * const result = convert(mermaidCode, {
 *   from: 'mermaid',
 *   to: 'drawio',
 * });
 * 
 * console.log(result.output); // Draw.io XML
 * 
 * // With text options for Cyrillic
 * const result2 = convert(mermaidCode, {
 *   from: 'mermaid',
 *   to: 'dot',
 *   text: { transliterate: true },
 * });
 * ```
 */
export function convert(source: string, options: ConvertOptions): ConvertResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Parse source
    const parser = parsers[options.from];
    if (!parser) {
        throw new Error(`Unsupported input format: ${options.from}`);
    }

    let diagram: Diagram;
    try {
        diagram = parser(source);
    } catch (error) {
        throw new Error(`Failed to parse ${options.from}: ${error}`);
    }

    // Apply layout if needed
    if (options.layout && options.layout.algorithm !== 'none') {
        diagram = autoLayout(diagram, {
            algorithm: options.layout.algorithm,
            direction: options.layout.direction,
            nodeSpacing: options.layout.nodeSpacing,
            rankSpacing: options.layout.rankSpacing,
        });
    }

    // Apply text transformations if specified
    if (options.text) {
        diagram = applyTextOptions(diagram, options);
    }

    // Generate output
    const generator = generators[options.to];
    if (!generator) {
        throw new Error(`Unsupported output format: ${options.to}`);
    }

    let output: string;
    try {
        output = generator(diagram);
    } catch (error) {
        throw new Error(`Failed to generate ${options.to}: ${error}`);
    }

    return {
        output,
        diagram,
        warnings: warnings.length > 0 ? warnings : undefined,
        errors: errors.length > 0 ? errors : undefined,
    };
}

/** Library version */
export const VERSION = '0.1.0';
