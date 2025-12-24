/**
 * Draw.io (diagrams.net) parser
 * 
 * Parses mxGraph XML format to IR with support for:
 * - Full CSS-like style parsing
 * - Swimlanes and groups
 * - Edge waypoints
 * - All node shapes
 * - Compressed diagram content (Confluence format)
 */

import type { Diagram, DiagramNode, DiagramEdge, DiagramGroup, NodeShape, ArrowConfig } from '../types';
import { createEmptyDiagram, createNode, createEdge, createGroup, validateInput, validatePattern } from './base';
import { parseDrawioShape, DRAWIO_ARROW_HEAD_REVERSE } from '../utils';
import pako from 'pako';

/** Parsed style object */
interface ParsedStyle {
    // Shape
    shape?: string;
    rounded?: boolean;

    // Colors
    fillColor?: string;
    strokeColor?: string;
    fontColor?: string;
    gradientColor?: string;
    gradientDirection?: string;

    // Stroke
    strokeWidth?: number;
    dashed?: boolean;
    dashPattern?: string;

    // Font
    fontSize?: number;
    fontFamily?: string;
    fontStyle?: number; // bitmask: 1=bold, 2=italic, 4=underline

    // Layout
    align?: string;
    verticalAlign?: string;
    spacing?: number;
    spacingTop?: number;
    spacingBottom?: number;
    spacingLeft?: number;
    spacingRight?: number;

    // Effects
    opacity?: number;
    shadow?: boolean;
    glass?: boolean;

    // Arrows
    startArrow?: string;
    endArrow?: string;
    startFill?: boolean;
    endFill?: boolean;

    // Edge routing
    edgeStyle?: string;
    curved?: boolean;
    orthogonal?: boolean;

    // Special
    swimlane?: boolean;
    group?: boolean;
    container?: boolean;
    collapsible?: boolean;

    // Raw values for unknown properties
    [key: string]: unknown;
}

/** Parse Draw.io XML to IR diagram */
export function parseDrawio(source: string): Diagram {
    validateInput(source, 'drawio');
    validatePattern(source, /<mxfile|<mxGraphModel/i, 'drawio', 'Invalid Draw.io XML format');

    const diagram = createEmptyDiagram('flowchart', 'drawio');

    // Decompress if needed (Confluence stores Draw.io in compressed format)
    const decompressedSource = decompressDrawioXml(source);

    // Parse XML
    const parser = new DOMParser();
    const doc = parser.parseFromString(decompressedSource, 'text/xml');

    // Check for parse errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
        throw new Error(`Invalid Draw.io XML: ${parseError.textContent}`);
    }

    // Find all mxCell elements
    const cells = doc.querySelectorAll('mxCell');

    // Maps for resolving references
    const cellMap = new Map<string, Element>();
    const nodeIdMap = new Map<string, string>(); // mxCell id -> IR node id
    const groupIdMap = new Map<string, string>(); // mxCell id -> IR group id

    // First pass: collect all cells
    cells.forEach(cell => {
        const id = cell.getAttribute('id');
        if (id) {
            cellMap.set(id, cell);
        }
    });

    // Second pass: identify groups (swimlanes, containers)
    cells.forEach(cell => {
        if (isGroup(cell)) {
            const group = parseGroupCell(cell);
            if (group) {
                diagram.groups.push(group);
                groupIdMap.set(cell.getAttribute('id')!, group.id);
            }
        }
    });

    // Third pass: parse nodes (vertices)
    cells.forEach(cell => {
        if (isVertex(cell) && !isGroup(cell)) {
            const node = parseNodeCell(cell);
            if (node) {
                diagram.nodes.push(node);
                nodeIdMap.set(cell.getAttribute('id')!, node.id);

                // Add to parent group if exists
                const parentId = cell.getAttribute('parent');
                if (parentId && groupIdMap.has(parentId)) {
                    const groupIrId = groupIdMap.get(parentId)!;
                    const group = diagram.groups.find(g => g.id === groupIrId);
                    if (group) {
                        group.children.push(node.id);
                    }
                }
            }
        }
    });

    // Fourth pass: parse edges
    cells.forEach(cell => {
        if (isEdge(cell)) {
            const edge = parseEdgeCell(cell, nodeIdMap);
            if (edge) {
                diagram.edges.push(edge);
            }
        }
    });

    // Extract diagram name and metadata
    const diagramEl = doc.querySelector('diagram');
    if (diagramEl) {
        diagram.name = diagramEl.getAttribute('name') || undefined;
    }

    // Extract page settings
    const graphModel = doc.querySelector('mxGraphModel');
    if (graphModel) {
        const pageWidth = graphModel.getAttribute('pageWidth');
        const pageHeight = graphModel.getAttribute('pageHeight');
        const background = graphModel.getAttribute('background');

        if (pageWidth && pageHeight) {
            diagram.viewport = {
                width: parseInt(pageWidth),
                height: parseInt(pageHeight),
                zoom: 1,
                offsetX: 0,
                offsetY: 0,
            };
        }

        if (background && background !== 'none') {
            if (!diagram.metadata) diagram.metadata = { source: 'drawio' };
            (diagram.metadata as Record<string, unknown>).backgroundColor = background;
        }
    }

    return diagram;
}

/** Parse CSS-like style string to object */
function parseStyleString(style: string): ParsedStyle {
    const result: ParsedStyle = {};

    if (!style) return result;

    const parts = style.split(';').filter(Boolean);

    for (const part of parts) {
        // Handle key=value pairs
        const eqIndex = part.indexOf('=');
        if (eqIndex > 0) {
            const key = part.substring(0, eqIndex).trim();
            const value = part.substring(eqIndex + 1).trim();

            // Parse known properties with correct types
            switch (key) {
                // Booleans
                case 'rounded':
                case 'dashed':
                case 'shadow':
                case 'glass':
                case 'startFill':
                case 'endFill':
                case 'curved':
                case 'orthogonal':
                case 'swimlane':
                case 'group':
                case 'container':
                case 'collapsible':
                    result[key] = value === '1' || value === 'true';
                    break;

                // Numbers
                case 'strokeWidth':
                case 'fontSize':
                case 'fontStyle':
                case 'opacity':
                case 'spacing':
                case 'spacingTop':
                case 'spacingBottom':
                case 'spacingLeft':
                case 'spacingRight':
                    result[key] = parseFloat(value);
                    break;

                // Strings
                default:
                    result[key] = value;
            }
        } else {
            // Handle standalone shape identifiers (e.g., "ellipse", "rhombus")
            const trimmed = part.trim();
            if (trimmed && !trimmed.includes('=')) {
                result.shape = trimmed;
            }
        }
    }

    return result;
}

/** Check if cell is a vertex (node) */
function isVertex(cell: Element): boolean {
    return cell.getAttribute('vertex') === '1';
}

/** Check if cell is an edge */
function isEdge(cell: Element): boolean {
    return cell.getAttribute('edge') === '1';
}

/** Check if cell is a group (swimlane, container) */
function isGroup(cell: Element): boolean {
    const style = cell.getAttribute('style') || '';
    const parsed = parseStyleString(style);
    return Boolean(parsed.swimlane || parsed.group || parsed.container);
}

/** Parse node from mxCell */
function parseNodeCell(cell: Element): DiagramNode | null {
    const id = cell.getAttribute('id');
    if (!id || id === '0' || id === '1') return null; // Skip root cells

    const value = cell.getAttribute('value') || '';
    const styleStr = cell.getAttribute('style') || '';
    const parsedStyle = parseStyleString(styleStr);
    const geometry = cell.querySelector('mxGeometry');

    const node = createNode(id, decodeHtmlEntities(value), {
        shape: mapDrawioShapeFromParsed(parsedStyle),
        style: {
            fill: parsedStyle.fillColor !== 'none' ? parsedStyle.fillColor : undefined,
            stroke: parsedStyle.strokeColor !== 'none' ? parsedStyle.strokeColor : undefined,
            strokeWidth: parsedStyle.strokeWidth,
            fontColor: parsedStyle.fontColor,
            fontSize: parsedStyle.fontSize,
            opacity: parsedStyle.opacity !== undefined ? parsedStyle.opacity / 100 : undefined,
        },
    });

    // Add metadata for advanced styling
    if (parsedStyle.shadow || parsedStyle.glass || parsedStyle.gradientColor) {
        node.metadata = {
            shadow: parsedStyle.shadow,
            glass: parsedStyle.glass,
            gradientColor: parsedStyle.gradientColor,
            gradientDirection: parsedStyle.gradientDirection,
            fontStyle: parsedStyle.fontStyle,
        };
    }

    // Parse geometry
    if (geometry) {
        const x = parseFloat(geometry.getAttribute('x') || '0');
        const y = parseFloat(geometry.getAttribute('y') || '0');
        const width = parseFloat(geometry.getAttribute('width') || '120');
        const height = parseFloat(geometry.getAttribute('height') || '60');

        node.position = { x, y };
        node.size = { width, height };
    }

    return node;
}

/** Parse edge from mxCell */
function parseEdgeCell(
    cell: Element,
    nodeIdMap: Map<string, string>
): DiagramEdge | null {
    const sourceId = cell.getAttribute('source');
    const targetId = cell.getAttribute('target');

    if (!sourceId || !targetId) return null;

    // Map to IR node IDs
    const source = nodeIdMap.get(sourceId);
    const target = nodeIdMap.get(targetId);

    if (!source || !target) return null;

    const value = cell.getAttribute('value') || '';
    const styleStr = cell.getAttribute('style') || '';
    const parsedStyle = parseStyleString(styleStr);

    const edge = createEdge(source, target, {
        label: value ? decodeHtmlEntities(value) : undefined,
        arrow: parseEdgeArrowFromParsed(parsedStyle),
        style: {
            stroke: parsedStyle.strokeColor !== 'none' ? parsedStyle.strokeColor : undefined,
            strokeWidth: parsedStyle.strokeWidth,
            opacity: parsedStyle.opacity !== undefined ? parsedStyle.opacity / 100 : undefined,
        },
    });

    // Store edge routing info
    if (parsedStyle.edgeStyle || parsedStyle.curved || parsedStyle.orthogonal) {
        edge.metadata = {
            edgeStyle: parsedStyle.edgeStyle,
            curved: parsedStyle.curved,
            orthogonal: parsedStyle.orthogonal,
        };
    }

    // Parse waypoints
    const geometry = cell.querySelector('mxGeometry');
    if (geometry) {
        const points = geometry.querySelectorAll('mxPoint');
        const arrayEl = geometry.querySelector('Array');

        if (arrayEl) {
            // Points inside Array element
            const arrayPoints = arrayEl.querySelectorAll('mxPoint');
            if (arrayPoints.length > 0) {
                edge.waypoints = Array.from(arrayPoints).map(point => ({
                    x: parseFloat(point.getAttribute('x') || '0'),
                    y: parseFloat(point.getAttribute('y') || '0'),
                }));
            }
        } else if (points.length > 0) {
            // Direct mxPoint children (excluding source/target points)
            const waypoints = Array.from(points)
                .filter(p => !p.getAttribute('as')) // Filter out source/target markers
                .map(point => ({
                    x: parseFloat(point.getAttribute('x') || '0'),
                    y: parseFloat(point.getAttribute('y') || '0'),
                }));

            if (waypoints.length > 0) {
                edge.waypoints = waypoints;
            }
        }
    }

    return edge;
}

/** Parse group from mxCell */
function parseGroupCell(cell: Element): DiagramGroup | null {
    const id = cell.getAttribute('id');
    if (!id || id === '0' || id === '1') return null;

    const value = cell.getAttribute('value') || '';
    const styleStr = cell.getAttribute('style') || '';
    const parsedStyle = parseStyleString(styleStr);
    const geometry = cell.querySelector('mxGeometry');

    const group = createGroup(id, [], {
        label: decodeHtmlEntities(value) || id,
        style: {
            fill: parsedStyle.fillColor !== 'none' ? parsedStyle.fillColor : undefined,
            stroke: parsedStyle.strokeColor !== 'none' ? parsedStyle.strokeColor : undefined,
            strokeDasharray: parsedStyle.dashed ? '5,5' : undefined,
        },
    });

    // Store group type
    if (parsedStyle.swimlane) {
        group.metadata = { type: 'swimlane' };
    }

    if (geometry) {
        group.position = {
            x: parseFloat(geometry.getAttribute('x') || '0'),
            y: parseFloat(geometry.getAttribute('y') || '0'),
        };
        group.size = {
            width: parseFloat(geometry.getAttribute('width') || '200'),
            height: parseFloat(geometry.getAttribute('height') || '150'),
        };
    }

    return group;
}

/** Map parsed style to IR shape */
function mapDrawioShapeFromParsed(style: ParsedStyle): NodeShape {
    // Check explicit shape property first
    if (style.shape) {
        return parseDrawioShape(`shape=${style.shape}`);
    }

    // Check for shape indicators in style
    const shapeIndicators: Array<[string, NodeShape]> = [
        ['ellipse', 'ellipse'],
        ['rhombus', 'diamond'],
        ['triangle', 'diamond'],
        ['hexagon', 'hexagon'],
        ['cylinder', 'cylinder'],
        ['actor', 'actor'],
        ['cloud', 'cloud'],
        ['parallelogram', 'parallelogram'],
        ['trapezoid', 'trapezoid'],
        ['document', 'document'],
        ['note', 'note'],
        ['card', 'rounded-rectangle'],
    ];

    for (const [indicator, shape] of shapeIndicators) {
        if (style[indicator]) {
            return shape;
        }
    }

    // Default based on rounded
    return style.rounded ? 'rounded-rectangle' : 'rectangle';
}

/** Parse arrow configuration from parsed style */
function parseEdgeArrowFromParsed(style: ParsedStyle): ArrowConfig {
    const config: ArrowConfig = {
        sourceType: 'none',
        targetType: 'arrow',
        lineType: 'solid',
    };

    // Source arrow
    if (style.startArrow) {
        config.sourceType = DRAWIO_ARROW_HEAD_REVERSE[style.startArrow as string] || 'none';
    }

    // Target arrow
    if (style.endArrow) {
        config.targetType = DRAWIO_ARROW_HEAD_REVERSE[style.endArrow as string] || 'arrow';
    } else if (style.endArrow === 'none') {
        config.targetType = 'none';
    }

    // Line type
    if (style.dashed) {
        config.lineType = 'dashed';

        // Check for dotted pattern
        if (style.dashPattern === '1 2' || style.dashPattern === '1 1') {
            config.lineType = 'dotted';
        }
    }

    return config;
}

/** Decode HTML entities in text */
function decodeHtmlEntities(text: string): string {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
}

/**
 * Decompress Draw.io XML if it contains compressed content
 * 
 * Confluence and Draw.io store diagrams in compressed format:
 * 1. mxGraphModel XML is deflate-compressed
 * 2. Then URL-encoded  
 * 3. Then base64-encoded
 * 4. Stored in <diagram> element text content
 */
function decompressDrawioXml(source: string): string {
    // Check if this is an mxfile with potentially compressed content
    if (!source.includes('<mxfile')) {
        return source;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(source, 'text/xml');

    // Check for parse errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
        return source;
    }

    // Find diagram elements
    const diagrams = doc.querySelectorAll('diagram');
    if (diagrams.length === 0) {
        return source;
    }

    let modified = false;

    diagrams.forEach(diagram => {
        // If diagram already has mxGraphModel child, it's not compressed
        if (diagram.querySelector('mxGraphModel')) {
            return;
        }

        const content = diagram.textContent?.trim() || '';
        if (!content || content.length < 20) {
            return;
        }

        // Check if content looks like base64 (no XML tags)
        if (content.includes('<') || content.includes('>')) {
            return;
        }

        try {
            // Try to decompress: base64 decode -> URL decode -> inflate
            const decompressed = decompressBase64Content(content);

            if (decompressed && decompressed.includes('<mxGraphModel')) {
                // Parse decompressed content and replace diagram content
                const decompressedDoc = parser.parseFromString(decompressed, 'text/xml');
                const graphModel = decompressedDoc.querySelector('mxGraphModel');

                if (graphModel && !decompressedDoc.querySelector('parsererror')) {
                    // Clear diagram text and append decompressed mxGraphModel
                    diagram.textContent = '';
                    diagram.appendChild(doc.importNode(graphModel, true));
                    modified = true;
                }
            }
        } catch (error) {
            // Decompression failed, keep original
            console.warn('[DrawioParser] Decompression failed:', error);
        }
    });

    if (modified) {
        const serializer = new XMLSerializer();
        return serializer.serializeToString(doc);
    }

    return source;
}

/**
 * Decompress base64-encoded, deflate-compressed content
 * Draw.io uses: deflate -> URL encode -> base64 encode
 */
function decompressBase64Content(encoded: string): string | null {
    try {
        // Step 1: Base64 decode
        const decoded = atob(encoded);

        // Step 2: Convert to byte array for pako
        const bytes = new Uint8Array(decoded.length);
        for (let i = 0; i < decoded.length; i++) {
            bytes[i] = decoded.charCodeAt(i);
        }

        // Step 3: Inflate using pako (raw deflate)
        const inflated = pako.inflateRaw(bytes, { to: 'string' });

        // Step 4: URL decode the result
        try {
            return decodeURIComponent(inflated);
        } catch {
            // If URL decode fails, return as-is
            return inflated;
        }
    } catch (error) {
        console.warn('[DrawioParser] Base64 decompression failed:', error);
        return null;
    }
}
