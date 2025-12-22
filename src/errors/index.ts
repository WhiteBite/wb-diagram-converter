/**
 * Custom error classes for diagram operations
 */

/** Base error for all diagram-related errors */
export class DiagramError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly context?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'DiagramError';
    }
}

/** Error during parsing source code to IR */
export class ParseError extends DiagramError {
    constructor(
        message: string,
        public readonly format: string,
        public readonly line?: number,
        public readonly column?: number,
        context?: Record<string, unknown>
    ) {
        super(
            line ? `${message} (line ${line}${column ? `:${column}` : ''})` : message,
            'PARSE_ERROR',
            { format, line, column, ...context }
        );
        this.name = 'ParseError';
    }
}

/** Error during generating output from IR */
export class GeneratorError extends DiagramError {
    constructor(
        message: string,
        public readonly format: string,
        context?: Record<string, unknown>
    ) {
        super(message, 'GENERATOR_ERROR', { format, ...context });
        this.name = 'GeneratorError';
    }
}

/** Error during IR validation */
export class ValidationError extends DiagramError {
    constructor(
        message: string,
        public readonly issues: ValidationIssue[],
        context?: Record<string, unknown>
    ) {
        super(message, 'VALIDATION_ERROR', { issues, ...context });
        this.name = 'ValidationError';
    }
}

/** Single validation issue */
export interface ValidationIssue {
    type: 'error' | 'warning';
    message: string;
    path?: string; // e.g., 'edges[0].source'
    nodeId?: string;
    edgeId?: string;
}

/** Error during layout operation */
export class LayoutError extends DiagramError {
    constructor(
        message: string,
        public readonly algorithm: string,
        context?: Record<string, unknown>
    ) {
        super(message, 'LAYOUT_ERROR', { algorithm, ...context });
        this.name = 'LayoutError';
    }
}

/** Error when format is not supported */
export class UnsupportedFormatError extends DiagramError {
    constructor(
        format: string,
        operation: 'parse' | 'generate'
    ) {
        super(
            `Unsupported format for ${operation}: ${format}`,
            'UNSUPPORTED_FORMAT',
            { format, operation }
        );
        this.name = 'UnsupportedFormatError';
    }
}
