/**
 * Web Worker API for Diagram Conversion
 * 
 * Provides async conversion in a Web Worker for better performance
 * with large diagrams. Falls back to main thread if Workers unavailable.
 * 
 * @example
 * ```typescript
 * import { convertInWorker } from '@whitebite/diagrams';
 * 
 * const result = await convertInWorker(mermaidCode, {
 *   from: 'mermaid',
 *   to: 'drawio',
 * });
 * ```
 */

import { convert } from '../index';
import type { ConvertOptions, ConvertResult } from '../types/ir';

/**
 * Message sent to the Web Worker
 */
export interface WorkerMessage {
    /** Unique request identifier */
    id: string;
    /** Source diagram code */
    source: string;
    /** Conversion options */
    options: ConvertOptions;
}

/**
 * Response from the Web Worker
 */
export interface WorkerResponse {
    /** Request identifier (matches WorkerMessage.id) */
    id: string;
    /** Conversion result (on success) */
    result?: ConvertResult;
    /** Error message (on failure) */
    error?: string;
}

/**
 * Convert diagram in a Web Worker
 * 
 * Offloads conversion to a background thread for better UI responsiveness.
 * Falls back to main thread if Workers are not available.
 * 
 * @param source - Source diagram code
 * @param options - Conversion options
 * @returns Promise resolving to conversion result
 * 
 * @example
 * ```typescript
 * // Basic usage
 * const result = await convertInWorker(mermaidCode, {
 *   from: 'mermaid',
 *   to: 'drawio',
 * });
 * 
 * // With layout options
 * const result = await convertInWorker(code, {
 *   from: 'plantuml',
 *   to: 'excalidraw',
 *   layout: { algorithm: 'dagre', direction: 'TB' },
 * });
 * ```
 */
export async function convertInWorker(
    source: string,
    options: ConvertOptions
): Promise<ConvertResult> {
    // Check if Workers available (browser environment)
    if (typeof Worker === 'undefined') {
        return convert(source, options);
    }

    return new Promise((resolve, reject) => {
        const worker = new Worker(
            new URL('./convert.worker.js', import.meta.url),
            { type: 'module' }
        );

        const id = crypto.randomUUID();

        worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
            if (e.data.id !== id) return;
            worker.terminate();

            if (e.data.error) {
                reject(new Error(e.data.error));
            } else if (e.data.result) {
                resolve(e.data.result);
            } else {
                reject(new Error('Invalid worker response'));
            }
        };

        worker.onerror = (e) => {
            worker.terminate();
            reject(new Error(e.message || 'Worker error'));
        };

        worker.postMessage({ id, source, options } satisfies WorkerMessage);
    });
}
