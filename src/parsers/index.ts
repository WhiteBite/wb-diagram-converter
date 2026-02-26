/**
 * Parsers barrel export
 * 
 * All diagram format parsers
 */

// Core formats
export { parseMermaid } from './mermaid';
export { parseDrawio } from './drawio';
export { parseExcalidraw } from './excalidraw';
export { parsePlantUML } from './plantuml';
export { parseDot } from './dot';

// Extended formats
export { parseD2 } from './d2';
export { parseStructurizr } from './structurizr';
export { parseBpmn, parseBpmn as parseBPMN } from './bpmn';
export { parseGraphml, parseGraphml as parseGraphML } from './graphml';
export { parseLucidchart } from './lucidchart';

// State diagrams
export { parseStateDiagram, parseToStateDiagramIR } from './state';

// ER Diagrams
export { parseERDiagram, isERDiagram, extractERData } from './er-parser';

// Sequence diagrams
export { parseSequenceDiagram, parseSequence } from './sequence-parser';

// Base utilities
export {
    createEmptyDiagram,
    createNode,
    createEdge,
    createGroup,
    validateInput,
    validateMinLength,
    validatePattern,
} from './base';
export type { ParseResult, DiagramParser } from './base';
