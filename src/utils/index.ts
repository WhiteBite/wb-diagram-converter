export * from './arrow-mapper';
export * from './shape-mapper';
export * from './style-mapper';
export * from './edge-routing';
export * from './text-encoder';
export { logger } from './logger';

// Validation - old simple validator
export {
    validateDiagram as validateDiagramSimple,
    isValidDiagram as isValidDiagramSimple,
    getValidationErrors as getValidationErrorsSimple,
    getValidationWarnings as getValidationWarningsSimple,
} from './validation';

// Validation - new comprehensive validator
export {
    validateDiagram,
    isValidDiagram,
    getValidationErrors,
    getValidationWarnings,
} from './ir-validator';

// Cloner utilities
export * from './ir-cloner';

/** Generate unique ID */
export function generateId(): string {
    return `wb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Escape XML special characters */
export function escapeXml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/** Unescape XML special characters */
export function unescapeXml(text: string): string {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
}

/** Parse color string to hex */
export function parseColor(color: string): string {
    if (color.startsWith('#')) {
        return color;
    }
    // Named colors could be mapped here
    return color;
}

/** Convert hex color to RGB */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        }
        : null;
}

/** Sanitize string for use as ID */
export function sanitizeId(str: string): string {
    return str
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/^[0-9]/, '_$&');
}
