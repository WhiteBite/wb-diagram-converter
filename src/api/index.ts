/**
 * Fluent API for Diagram Manipulation
 * 
 * Provides builder and mutator interfaces for creating and modifying diagrams.
 */

export { createDiagram } from './builder';
export { mutateDiagram } from './mutator';

// Web Worker API
export { convertInWorker } from './worker';
export type { WorkerMessage, WorkerResponse } from './worker';

// Diff API
export { compareDiagrams } from './diff';
export type { DiffResult, DiffSummary, ElementDiff } from './diff';
