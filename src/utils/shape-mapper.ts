/**
 * Shape mapping between formats
 */

import type { NodeShape } from '../types';

// =============================================================================
// Mermaid Shape Mapping
// =============================================================================

/** Mermaid bracket syntax to shape */
export const MERMAID_SHAPE_MAP: Record<string, NodeShape> = {
    '[]': 'rectangle',
    '()': 'rounded-rectangle',
    '(())': 'circle',
    '{}': 'diamond',
    '{{}}': 'hexagon',
    '[()]': 'cylinder',
    '[[]]': 'rectangle',  // Subroutine
    '[/]': 'parallelogram',
    '[\\]': 'parallelogram',
    '[/\\]': 'trapezoid',
    '[\\/]': 'trapezoid',
    '>]': 'note',
};

/** Detect Mermaid shape from label syntax */
export function detectMermaidShape(labelWithBrackets: string): { shape: NodeShape; label: string } {
    const trimmed = labelWithBrackets.trim();

    // Circle: ((label))
    if (trimmed.startsWith('((') && trimmed.endsWith('))')) {
        return { shape: 'circle', label: trimmed.slice(2, -2) };
    }

    // Hexagon: {{label}}
    if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) {
        return { shape: 'hexagon', label: trimmed.slice(2, -2) };
    }

    // Cylinder/Database: [(label)]
    if (trimmed.startsWith('[(') && trimmed.endsWith(')]')) {
        return { shape: 'cylinder', label: trimmed.slice(2, -2) };
    }

    // Subroutine: [[label]]
    if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) {
        return { shape: 'rectangle', label: trimmed.slice(2, -2) };
    }

    // Rounded rectangle: (label)
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
        return { shape: 'rounded-rectangle', label: trimmed.slice(1, -1) };
    }

    // Diamond: {label}
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        return { shape: 'diamond', label: trimmed.slice(1, -1) };
    }

    // Parallelogram: [/label/]
    if (trimmed.startsWith('[/') && trimmed.endsWith('/]')) {
        return { shape: 'parallelogram', label: trimmed.slice(2, -2) };
    }

    // Parallelogram alt: [\label\]
    if (trimmed.startsWith('[\\') && trimmed.endsWith('\\]')) {
        return { shape: 'parallelogram', label: trimmed.slice(2, -2) };
    }

    // Trapezoid: [/label\]
    if (trimmed.startsWith('[/') && trimmed.endsWith('\\]')) {
        return { shape: 'trapezoid', label: trimmed.slice(2, -2) };
    }

    // Note/Flag: >label]
    if (trimmed.startsWith('>') && trimmed.endsWith(']')) {
        return { shape: 'note', label: trimmed.slice(1, -1) };
    }

    // Rectangle: [label]
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        return { shape: 'rectangle', label: trimmed.slice(1, -1) };
    }

    // Default: rectangle with original label
    return { shape: 'rectangle', label: trimmed };
}

/** Generate Mermaid shape brackets for label */
export function generateMermaidShape(shape: NodeShape, label: string): string {
    // Clean and escape label for Mermaid
    const cleanLabel = cleanMermaidLabel(label);

    // Use placeholder for empty labels - must be non-empty and safe
    const safeLabel = cleanLabel || 'node';

    switch (shape) {
        case 'rectangle':
            return `["${safeLabel}"]`;
        case 'rounded-rectangle':
            return `("${safeLabel}")`;
        case 'circle':
            return `(("${safeLabel}"))`;
        case 'ellipse':
            return `(["${safeLabel}"])`;
        case 'diamond':
            return `{"${safeLabel}"}`;
        case 'hexagon':
            return `{{"${safeLabel}"}}`;
        case 'parallelogram':
            return `[/"${safeLabel}"/]`;
        case 'trapezoid':
            return `[/"${safeLabel}"\\]`;
        case 'cylinder':
            return `[("${safeLabel}")]`;
        case 'note':
            // Note shape uses different syntax - fallback to rectangle for safety
            return `["${safeLabel}"]`;
        default:
            return `["${safeLabel}"]`;
    }
}

/**
 * Clean label for Mermaid syntax
 * - Strip HTML tags
 * - Escape special characters
 * - Trim whitespace
 */
function cleanMermaidLabel(label: string): string {
    if (!label) return '';

    // Strip HTML tags
    let clean = label.replace(/<[^>]*>/g, '');

    // Decode HTML entities
    clean = clean
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');

    // Escape Mermaid special characters
    // These characters have special meaning in Mermaid: [ ] ( ) { } < > | # " '
    clean = clean
        .replace(/"/g, "'")  // Replace double quotes with single
        .replace(/\[/g, '(')  // Replace brackets that could break syntax
        .replace(/\]/g, ')')
        .replace(/\{/g, '(')
        .replace(/\}/g, ')')
        .replace(/\|/g, '/')  // Pipe is used for edge labels
        .replace(/#/g, '')    // Hash can cause issues
        .replace(/\n/g, ' ')  // Newlines to spaces
        .replace(/\r/g, '');  // Remove carriage returns

    // Trim and collapse multiple spaces
    clean = clean.trim().replace(/\s+/g, ' ');

    return clean;
}

// =============================================================================
// Draw.io Shape Mapping
// =============================================================================

/** IR shape to Draw.io style */
export const DRAWIO_SHAPE_MAP: Record<NodeShape, string> = {
    'rectangle': 'rounded=0',
    'rounded-rectangle': 'rounded=1',
    'circle': 'ellipse;aspect=fixed',
    'ellipse': 'ellipse',
    'diamond': 'rhombus',
    'hexagon': 'hexagon',
    'parallelogram': 'parallelogram',
    'trapezoid': 'trapezoid',
    'cylinder': 'shape=cylinder3;whiteSpace=wrap;boundedLbl=1',
    'document': 'shape=document;whiteSpace=wrap',
    'cloud': 'ellipse;shape=cloud',
    'actor': 'shape=umlActor;verticalLabelPosition=bottom',
    'note': 'shape=note',
    'custom': 'rounded=0',
};

/** Draw.io style to IR shape */
export function parseDrawioShape(style: string): NodeShape {
    const styleLower = style.toLowerCase();

    if (styleLower.includes('ellipse') && styleLower.includes('aspect=fixed')) {
        return 'circle';
    }
    if (styleLower.includes('ellipse') && styleLower.includes('cloud')) {
        return 'cloud';
    }
    if (styleLower.includes('ellipse')) {
        return 'ellipse';
    }
    if (styleLower.includes('rhombus')) {
        return 'diamond';
    }
    if (styleLower.includes('hexagon')) {
        return 'hexagon';
    }
    if (styleLower.includes('parallelogram')) {
        return 'parallelogram';
    }
    if (styleLower.includes('trapezoid')) {
        return 'trapezoid';
    }
    if (styleLower.includes('cylinder')) {
        return 'cylinder';
    }
    if (styleLower.includes('document')) {
        return 'document';
    }
    if (styleLower.includes('umlactor')) {
        return 'actor';
    }
    if (styleLower.includes('note')) {
        return 'note';
    }
    if (styleLower.includes('rounded=1')) {
        return 'rounded-rectangle';
    }

    return 'rectangle';
}

// =============================================================================
// Excalidraw Shape Mapping
// =============================================================================

/** IR shape to Excalidraw type */
export const EXCALIDRAW_SHAPE_MAP: Record<NodeShape, string> = {
    'rectangle': 'rectangle',
    'rounded-rectangle': 'rectangle',  // + roundness property
    'circle': 'ellipse',
    'ellipse': 'ellipse',
    'diamond': 'diamond',
    'hexagon': 'rectangle',  // No native hexagon
    'parallelogram': 'rectangle',
    'trapezoid': 'rectangle',
    'cylinder': 'rectangle',
    'document': 'rectangle',
    'cloud': 'ellipse',
    'actor': 'rectangle',
    'note': 'rectangle',
    'custom': 'rectangle',
};

/** Get Excalidraw roundness for shape */
export function getExcalidrawRoundness(shape: NodeShape): { type: number } | null {
    if (shape === 'rounded-rectangle') {
        return { type: 3 };  // Adaptive roundness
    }
    if (shape === 'circle' || shape === 'ellipse') {
        return null;  // Ellipse doesn't need roundness
    }
    return null;
}

// =============================================================================
// PlantUML Shape Mapping
// =============================================================================

/** IR shape to PlantUML keyword
 * Note: PlantUML component diagrams support limited shapes.
 * For diamond (decision), we use 'agent' with <<choice>> stereotype
 * or fall back to rectangle with label formatting.
 */
export const PLANTUML_SHAPE_MAP: Record<NodeShape, string> = {
    'rectangle': 'rectangle',
    'rounded-rectangle': 'card',
    'circle': 'circle',
    'ellipse': 'usecase',
    'diamond': 'agent',      // Will add <<choice>> stereotype
    'hexagon': 'hexagon',
    'parallelogram': 'rectangle',
    'trapezoid': 'rectangle',
    'cylinder': 'database',
    'document': 'file',
    'cloud': 'cloud',
    'actor': 'actor',
    'note': 'note',
    'custom': 'rectangle',
};
