/**
 * Text encoding utilities for diagram formats
 * 
 * Different formats have different requirements for text:
 * - Mermaid: Unicode OK, but special chars need escaping
 * - PlantUML: Unicode OK in quotes, some chars need escaping
 * - DOT: Unicode needs quotes, special chars escaped
 * - Draw.io: XML encoding required
 * - Excalidraw: JSON encoding (Unicode OK)
 */

/** Text encoding options */
export interface TextEncodingOptions {
    /** Wrap non-ASCII text in quotes */
    quoteUnicode?: boolean;
    /** Escape special characters */
    escapeSpecial?: boolean;
    /** Transliterate Cyrillic to Latin */
    transliterate?: boolean;
    /** Max label length (truncate with ...) */
    maxLength?: number;
    /** Replace newlines with <br> or \n */
    preserveNewlines?: boolean;
}

/** Format-specific default options */
export const FORMAT_TEXT_DEFAULTS: Record<string, TextEncodingOptions> = {
    mermaid: {
        quoteUnicode: false,
        escapeSpecial: true,
        transliterate: false,
        preserveNewlines: true,
    },
    plantuml: {
        quoteUnicode: true,  // PlantUML needs quotes for Unicode
        escapeSpecial: true,
        transliterate: false,
        preserveNewlines: true,
    },
    dot: {
        quoteUnicode: true,  // DOT requires quotes for Unicode
        escapeSpecial: true,
        transliterate: false,
        preserveNewlines: true,
    },
    drawio: {
        quoteUnicode: false, // XML handles Unicode
        escapeSpecial: true, // XML entities
        transliterate: false,
        preserveNewlines: true,
    },
    excalidraw: {
        quoteUnicode: false, // JSON handles Unicode
        escapeSpecial: false,
        transliterate: false,
        preserveNewlines: true,
    },
    svg: {
        quoteUnicode: false,
        escapeSpecial: true, // XML entities
        transliterate: false,
        preserveNewlines: true,
    },
};

/** Check if string contains non-ASCII characters */
export function hasNonAscii(text: string): boolean {
    return /[^\x00-\x7F]/.test(text);
}

/** Check if string contains Cyrillic characters */
export function hasCyrillic(text: string): boolean {
    return /[\u0400-\u04FF]/.test(text);
}

/** Check if string needs quoting (has spaces or special chars) */
export function needsQuoting(text: string): boolean {
    return /[\s\-\[\]{}()<>|&;:,."'`\\\/]/.test(text) || hasNonAscii(text);
}

/**
 * Encode text for specific format
 */
export function encodeText(
    text: string,
    format: string,
    options?: Partial<TextEncodingOptions>
): string {
    const defaults = FORMAT_TEXT_DEFAULTS[format] || {};
    const opts: TextEncodingOptions = { ...defaults, ...options };

    let result = text;

    // Truncate if needed
    if (opts.maxLength && result.length > opts.maxLength) {
        result = result.slice(0, opts.maxLength - 3) + '...';
    }

    // Transliterate if requested
    if (opts.transliterate && hasCyrillic(result)) {
        result = transliterateCyrillic(result);
    }

    // Format-specific encoding
    switch (format) {
        case 'mermaid':
            result = encodeMermaid(result, opts);
            break;
        case 'plantuml':
            result = encodePlantUML(result, opts);
            break;
        case 'dot':
            result = encodeDot(result, opts);
            break;
        case 'drawio':
        case 'svg':
            result = encodeXml(result);
            break;
        case 'excalidraw':
            // JSON.stringify handles escaping
            break;
    }

    return result;
}

/** Encode text for Mermaid */
function encodeMermaid(text: string, opts: TextEncodingOptions): string {
    let result = text;

    if (opts.escapeSpecial) {
        // Escape quotes and brackets
        result = result
            .replace(/"/g, '#quot;')
            .replace(/\[/g, '#91;')
            .replace(/\]/g, '#93;')
            .replace(/\{/g, '#123;')
            .replace(/\}/g, '#125;')
            .replace(/\(/g, '#40;')
            .replace(/\)/g, '#41;');
    }

    if (opts.preserveNewlines) {
        result = result.replace(/\n/g, '<br/>');
    }

    return result;
}

/** Encode text for PlantUML */
function encodePlantUML(text: string, opts: TextEncodingOptions): string {
    let result = text;

    if (opts.escapeSpecial) {
        // Escape quotes
        result = result.replace(/"/g, '\\"');
    }

    if (opts.preserveNewlines) {
        result = result.replace(/\n/g, '\\n');
    }

    return result;
}

/** Encode text for DOT/Graphviz */
function encodeDot(text: string, opts: TextEncodingOptions): string {
    let result = text;

    if (opts.escapeSpecial) {
        // Escape quotes and backslashes
        result = result
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"');
    }

    if (opts.preserveNewlines) {
        result = result.replace(/\n/g, '\\n');
    }

    return result;
}

/** Encode text for XML (Draw.io, SVG) */
export function encodeXml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Decode XML entities */
export function decodeXml(text: string): string {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'");
}

/** Cyrillic to Latin transliteration map */
const CYRILLIC_MAP: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
    'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
    'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
    'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
    'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
    // Ukrainian
    'і': 'i', 'І': 'I', 'ї': 'yi', 'Ї': 'Yi', 'є': 'ye', 'Є': 'Ye',
    'ґ': 'g', 'Ґ': 'G',
};

/** Transliterate Cyrillic text to Latin */
export function transliterateCyrillic(text: string): string {
    return text.split('').map(char => CYRILLIC_MAP[char] || char).join('');
}

/** Generate safe ID from text (for node IDs) */
export function generateSafeId(text: string, prefix = 'node'): string {
    // Transliterate if Cyrillic
    let safe = hasCyrillic(text) ? transliterateCyrillic(text) : text;

    // Remove non-alphanumeric, replace spaces with underscore
    safe = safe
        .replace(/[^a-zA-Z0-9_\s]/g, '')
        .replace(/\s+/g, '_')
        .toLowerCase();

    // Ensure starts with letter
    if (!/^[a-zA-Z]/.test(safe)) {
        safe = prefix + '_' + safe;
    }

    return safe || prefix;
}

/** Wrap text in quotes if needed for format */
export function quoteIfNeeded(text: string, format: string): string {
    const opts = FORMAT_TEXT_DEFAULTS[format];

    if (opts?.quoteUnicode && needsQuoting(text)) {
        const encoded = encodeText(text, format);
        return `"${encoded}"`;
    }

    return text;
}
