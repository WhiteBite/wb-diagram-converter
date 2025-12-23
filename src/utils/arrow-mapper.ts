/**
 * Arrow type mapping between formats
 */

import type { ArrowConfig, ArrowHeadType, LineType } from '../types';

// =============================================================================
// Mermaid Arrow Mapping
// =============================================================================

/** Mermaid arrow syntax to IR */
export const MERMAID_ARROW_MAP: Record<string, ArrowConfig> = {
    // Standard arrows
    '-->': { sourceType: 'none', targetType: 'arrow', lineType: 'solid' },
    '---': { sourceType: 'none', targetType: 'none', lineType: 'solid' },
    '-.->': { sourceType: 'none', targetType: 'arrow', lineType: 'dashed' },
    '-.-': { sourceType: 'none', targetType: 'none', lineType: 'dashed' },
    '..>': { sourceType: 'none', targetType: 'arrow', lineType: 'dotted' },
    '...': { sourceType: 'none', targetType: 'none', lineType: 'dotted' },

    // Thick arrows
    '==>': { sourceType: 'none', targetType: 'arrow', lineType: 'thick' },
    '===': { sourceType: 'none', targetType: 'none', lineType: 'thick' },

    // Bidirectional
    '<-->': { sourceType: 'arrow', targetType: 'arrow', lineType: 'solid' },
    '<-.->': { sourceType: 'arrow', targetType: 'arrow', lineType: 'dashed' },
    '<==>': { sourceType: 'arrow', targetType: 'arrow', lineType: 'thick' },

    // Circle endpoints
    '--o': { sourceType: 'none', targetType: 'circle', lineType: 'solid' },
    'o--': { sourceType: 'circle', targetType: 'none', lineType: 'solid' },
    'o--o': { sourceType: 'circle', targetType: 'circle', lineType: 'solid' },

    // Cross endpoints
    '--x': { sourceType: 'none', targetType: 'cross', lineType: 'solid' },
    'x--': { sourceType: 'cross', targetType: 'none', lineType: 'solid' },
    'x--x': { sourceType: 'cross', targetType: 'cross', lineType: 'solid' },
};

/** Parse Mermaid arrow string to ArrowConfig */
export function parseMermaidArrow(arrow: string): ArrowConfig {
    // Normalize arrow string
    const normalized = arrow.trim().toLowerCase();

    // Direct match
    if (MERMAID_ARROW_MAP[normalized]) {
        return MERMAID_ARROW_MAP[normalized];
    }

    // Try to parse complex arrows
    const config: ArrowConfig = {
        sourceType: 'none',
        targetType: 'arrow',
        lineType: 'solid',
    };

    // Detect line type
    if (normalized.includes('-.') || normalized.includes('.-')) {
        config.lineType = 'dashed';
    } else if (normalized.includes('..')) {
        config.lineType = 'dotted';
    } else if (normalized.includes('==') || normalized.includes('=')) {
        config.lineType = 'thick';
    }

    // Detect source arrow
    if (normalized.startsWith('<') || normalized.startsWith('o') || normalized.startsWith('x')) {
        if (normalized.startsWith('<')) config.sourceType = 'arrow';
        else if (normalized.startsWith('o')) config.sourceType = 'circle';
        else if (normalized.startsWith('x')) config.sourceType = 'cross';
    }

    // Detect target arrow
    if (normalized.endsWith('>') || normalized.endsWith('o') || normalized.endsWith('x')) {
        if (normalized.endsWith('>')) config.targetType = 'arrow';
        else if (normalized.endsWith('o')) config.targetType = 'circle';
        else if (normalized.endsWith('x')) config.targetType = 'cross';
    }

    return config;
}

// =============================================================================
// Draw.io Arrow Mapping
// =============================================================================

/** IR arrow head to Draw.io style */
export const DRAWIO_ARROW_HEAD_MAP: Record<ArrowHeadType, string> = {
    'none': 'none',
    'arrow': 'classic',
    'open': 'open',
    'diamond': 'diamond',
    'diamond-filled': 'diamondThin',
    'circle': 'oval',
    'circle-filled': 'ovalThin',
    'cross': 'cross',
    'bar': 'dash',
};

/** Draw.io style to IR arrow head */
export const DRAWIO_ARROW_HEAD_REVERSE: Record<string, ArrowHeadType> = {
    'none': 'none',
    'classic': 'arrow',
    'classicThin': 'arrow',
    'open': 'open',
    'openThin': 'open',
    'diamond': 'diamond',
    'diamondThin': 'diamond-filled',
    'oval': 'circle',
    'ovalThin': 'circle-filled',
    'cross': 'cross',
    'dash': 'bar',
    'block': 'arrow',
    'blockThin': 'arrow',
};

/** Generate Draw.io edge style string */
export function generateDrawioArrowStyle(arrow: ArrowConfig): string {
    const parts: string[] = [];

    parts.push(`startArrow=${DRAWIO_ARROW_HEAD_MAP[arrow.sourceType]}`);
    parts.push(`endArrow=${DRAWIO_ARROW_HEAD_MAP[arrow.targetType]}`);

    if (arrow.lineType === 'dashed') {
        parts.push('dashed=1');
    } else if (arrow.lineType === 'dotted') {
        parts.push('dashed=1');
        parts.push('dashPattern=1 2');
    } else if (arrow.lineType === 'thick') {
        parts.push('strokeWidth=3');
    }

    return parts.join(';');
}

// =============================================================================
// Excalidraw Arrow Mapping
// =============================================================================

/** IR arrow head to Excalidraw */
export const EXCALIDRAW_ARROW_HEAD_MAP: Record<ArrowHeadType, string | null> = {
    'none': null,
    'arrow': 'arrow',
    'open': 'triangle',
    'diamond': 'diamond',
    'diamond-filled': 'diamond',
    'circle': 'dot',
    'circle-filled': 'dot',
    'cross': 'bar',
    'bar': 'bar',
};

/** Generate Excalidraw arrow properties */
export function generateExcalidrawArrow(arrow: ArrowConfig): {
    startArrowhead: string | null;
    endArrowhead: string | null;
    strokeStyle: 'solid' | 'dashed' | 'dotted';
    strokeWidth?: number;
} {
    return {
        startArrowhead: EXCALIDRAW_ARROW_HEAD_MAP[arrow.sourceType],
        endArrowhead: EXCALIDRAW_ARROW_HEAD_MAP[arrow.targetType],
        strokeStyle: arrow.lineType === 'thick' ? 'solid' : arrow.lineType,
        ...(arrow.lineType === 'thick' ? { strokeWidth: 4 } : {}),
    };
}

// =============================================================================
// PlantUML Arrow Mapping
// =============================================================================

/** IR to PlantUML arrow syntax */
export function generatePlantUMLArrow(arrow: ArrowConfig): string {
    let result = '';

    // Source
    if (arrow.sourceType === 'arrow') result += '<';
    else if (arrow.sourceType === 'circle') result += 'o';
    else if (arrow.sourceType === 'diamond') result += '<|';
    else if (arrow.sourceType === 'diamond-filled') result += '*';

    // Line
    if (arrow.lineType === 'dashed') result += '..';
    else if (arrow.lineType === 'dotted') result += '..';
    else result += '--';

    // Target
    if (arrow.targetType === 'arrow') result += '>';
    else if (arrow.targetType === 'circle') result += 'o';
    else if (arrow.targetType === 'diamond') result += '|>';
    else if (arrow.targetType === 'diamond-filled') result += '*';

    return result || '-->';
}
