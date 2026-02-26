/**
 * Web Worker for Diagram Conversion
 * 
 * This file runs in a Web Worker context and handles conversion requests.
 * It should not be imported directly - use convertInWorker() instead.
 */

import { convert } from '../index';
import type { WorkerMessage, WorkerResponse } from './worker';

/**
 * Handle incoming conversion requests
 */
self.onmessage = (e: MessageEvent<WorkerMessage>) => {
    const { id, source, options } = e.data;

    try {
        const result = convert(source, options);
        self.postMessage({ id, result } satisfies WorkerResponse);
    } catch (error) {
        self.postMessage({
            id,
            error: error instanceof Error ? error.message : 'Unknown error',
        } satisfies WorkerResponse);
    }
};
