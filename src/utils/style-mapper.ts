/**
 * Style mapping utilities between formats
 * 
 * Converts styles between IR and format-specific representations
 */

import type { NodeStyle, EdgeStyle, GroupStyle } from '../types';

// =============================================================================
// Color Utilities
// =============================================================================

/** Named colors to hex */
const NAMED_COLORS: Record<string, string> = {
    'black': '#000000',
    'white': '#ffffff',
    'red': '#ff0000',
    'green': '#00ff00',
    'blue': '#0000ff',
    'yellow': '#ffff00',
    'cyan': '#00ffff',
    'magenta': '#ff00ff',
    'gray': '#808080',
    'grey': '#808080',
    'lightgray': '#d3d3d3',
    'lightgrey': '#d3d3d3',
    'darkgray': '#a9a9a9',
    'darkgrey': '#a9a9a9',
    'orange': '#ffa500',
    'pink': '#ffc0cb',
    'purple': '#800080',
    'brown': '#a52a2a',
    'transparent': 'transparent',
    'none': 'transparent',
};

/** Normalize color to hex format */
export function normalizeColor(color: string | undefined): string | undefined {
    if (!color) return undefined;

    const lower = color.toLowerCase().trim();

    // Named color
    if (NAMED_COLORS[lower]) {
        return NAMED_COLORS[lower];
    }

    // Already hex
    if (lower.startsWith('#')) {
        // Expand short hex (#abc -> #aabbcc)
        if (lower.length === 4) {
            return `#${lower[1]}${lower[1]}${lower[2]}${lower[2]}${lower[3]}${lower[3]}`;
        }
        return lower;
    }

    // RGB format: rgb(r, g, b)
    const rgbMatch = lower.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (rgbMatch) {
        const [, r, g, b] = rgbMatch;
        return rgbToHex(parseInt(r), parseInt(g), parseInt(b));
    }

    // RGBA format: rgba(r, g, b, a)
    const rgbaMatch = lower.match(/rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[\d.]+\s*\)/);
    if (rgbaMatch) {
        const [, r, g, b] = rgbaMatch;
        return rgbToHex(parseInt(r), parseInt(g), parseInt(b));
    }

    return color;
}

/** Convert RGB to hex */
export function rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Convert hex to RGB */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
    } : null;
}

/** Lighten color by percentage */
export function lightenColor(hex: string, percent: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const factor = percent / 100;
    return rgbToHex(
        Math.round(rgb.r + (255 - rgb.r) * factor),
        Math.round(rgb.g + (255 - rgb.g) * factor),
        Math.round(rgb.b + (255 - rgb.b) * factor)
    );
}

/** Darken color by percentage */
export function darkenColor(hex: string, percent: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const factor = 1 - percent / 100;
    return rgbToHex(
        Math.round(rgb.r * factor),
        Math.round(rgb.g * factor),
        Math.round(rgb.b * factor)
    );
}

// =============================================================================
// Style Parsing
// =============================================================================

/** Parse CSS-like style string to object */
export function parseStyleString(style: string): Record<string, string> {
    const result: Record<string, string> = {};

    // Handle both ; and , as separators
    const parts = style.split(/[;,]/).map(p => p.trim()).filter(Boolean);

    for (const part of parts) {
        // Handle key=value and key:value
        const match = part.match(/^([^=:]+)[=:](.+)$/);
        if (match) {
            const [, key, value] = match;
            result[key.trim().toLowerCase()] = value.trim();
        }
    }

    return result;
}

/** Convert style object to CSS-like string */
export function styleToString(style: Record<string, string | number | undefined>, separator = ';'): string {
    return Object.entries(style)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}=${v}`)
        .join(separator);
}

// =============================================================================
// Node Style Conversion
// =============================================================================

/** Parse style string to NodeStyle */
export function parseNodeStyle(styleStr: string): NodeStyle {
    const parsed = parseStyleString(styleStr);
    const style: NodeStyle = {};

    if (parsed.fill || parsed.fillcolor || parsed.bgcolor) {
        style.fill = normalizeColor(parsed.fill || parsed.fillcolor || parsed.bgcolor);
    }
    if (parsed.stroke || parsed.strokecolor || parsed.bordercolor || parsed.color) {
        style.stroke = normalizeColor(parsed.stroke || parsed.strokecolor || parsed.bordercolor || parsed.color);
    }
    if (parsed.strokewidth || parsed['stroke-width']) {
        style.strokeWidth = parseInt(parsed.strokewidth || parsed['stroke-width']);
    }
    if (parsed.fontsize || parsed['font-size']) {
        style.fontSize = parseInt(parsed.fontsize || parsed['font-size']);
    }
    if (parsed.fontfamily || parsed['font-family']) {
        style.fontFamily = parsed.fontfamily || parsed['font-family'];
    }
    if (parsed.fontcolor || parsed['font-color'] || parsed.color) {
        style.fontColor = normalizeColor(parsed.fontcolor || parsed['font-color']);
    }
    if (parsed.opacity) {
        const opacity = parseFloat(parsed.opacity);
        style.opacity = opacity > 1 ? opacity / 100 : opacity;
    }

    return style;
}

/** Convert NodeStyle to Draw.io style string */
export function nodeStyleToDrawio(style: NodeStyle): string {
    const parts: string[] = [];

    if (style.fill) parts.push(`fillColor=${style.fill}`);
    if (style.stroke) parts.push(`strokeColor=${style.stroke}`);
    if (style.strokeWidth) parts.push(`strokeWidth=${style.strokeWidth}`);
    if (style.fontSize) parts.push(`fontSize=${style.fontSize}`);
    if (style.fontFamily) parts.push(`fontFamily=${style.fontFamily}`);
    if (style.fontColor) parts.push(`fontColor=${style.fontColor}`);
    if (style.opacity !== undefined) parts.push(`opacity=${Math.round(style.opacity * 100)}`);

    return parts.join(';');
}

/** Convert NodeStyle to Mermaid style string */
export function nodeStyleToMermaid(style: NodeStyle): string {
    const parts: string[] = [];

    if (style.fill) parts.push(`fill:${style.fill}`);
    if (style.stroke) parts.push(`stroke:${style.stroke}`);
    if (style.strokeWidth) parts.push(`stroke-width:${style.strokeWidth}px`);
    if (style.fontColor) parts.push(`color:${style.fontColor}`);

    return parts.join(',');
}

/** Convert NodeStyle to PlantUML style */
export function nodeStyleToPlantUML(style: NodeStyle): string {
    if (style.fill) {
        return ` ${style.fill}`;
    }
    return '';
}

// =============================================================================
// Edge Style Conversion
// =============================================================================

/** Parse style string to EdgeStyle */
export function parseEdgeStyle(styleStr: string): EdgeStyle {
    const parsed = parseStyleString(styleStr);
    const style: EdgeStyle = {};

    if (parsed.stroke || parsed.strokecolor || parsed.color) {
        style.stroke = normalizeColor(parsed.stroke || parsed.strokecolor || parsed.color);
    }
    if (parsed.strokewidth || parsed['stroke-width']) {
        style.strokeWidth = parseInt(parsed.strokewidth || parsed['stroke-width']);
    }
    if (parsed.opacity) {
        const opacity = parseFloat(parsed.opacity);
        style.opacity = opacity > 1 ? opacity / 100 : opacity;
    }

    return style;
}

// =============================================================================
// Style Utilities
// =============================================================================

/** Merge style with defaults */
export function mergeWithDefaults<T extends object>(style: T, defaults: T): T {
    return { ...defaults, ...style };
}
