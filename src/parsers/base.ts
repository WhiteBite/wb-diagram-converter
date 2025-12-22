/**
 * Base parser interface and utilities
 * 
 * All format parsers implement this interface for consistency
 */

import type { Diagram, DiagramNode, DiagramEdge, DiagramGroup, DiagramType, InputFormat } from '../types';
import { generateId } from '../utils';
import { ParseError } from '../errors';

/** Parser result with optional warnings */
export interface ParseResult {
    diagram: Diagram;
    warnings?: string[];
}

/** Base parser interface */
export interface DiagramParser {
    /** Format name for error messages */
    readonly formatName: string;

    /** Parse source to IR diagram */
    parse(source: string): Diagram;

    /** Check if source is valid for this parser */
    canParse(source: string): boolean;
}

/**
 * Validate parser input
 * 
 * @throws ParseError if input is invalid
 */
export function validateInput(source: unknown, format: InputFormat): asserts source is string {
    if (source === null || source === undefined) {
        throw new ParseError(`Source cannot be null or undefined`, format);
    }

    if (typeof source !== 'string') {
        throw new ParseError(`Source must be a string, got ${typeof source}`, format);
    }

    if (source.trim().length === 0) {
        throw new ParseError(`Source cannot be empty`, format);
    }
}

/**
 * Validate source has minimum content
 */
export function validateMinLength(source: string, minLength: number, format: InputFormat): void {
    if (source.trim().length < minLength) {
        throw new ParseError(`Source too short (min ${minLength} chars)`, format);
    }
}

/**
 * Validate source matches expected pattern
 */
export function validatePattern(source: string, pattern: RegExp, format: InputFormat, message: string): void {
    if (!pattern.test(source)) {
        throw new ParseError(message, format);
    }
}

/** Create empty diagram with defaults */
export function createEmptyDiagram(type: DiagramType = 'flowchart', source: string): Diagram {
    return {
        id: generateId(),
        type,
        nodes: [],
        edges: [],
        groups: [],
        metadata: { source },
    };
}

/** Create node with defaults */
export function createNode(
    id: string,
    label: string,
    options: Partial<Omit<DiagramNode, 'id' | 'type' | 'label'>> = {}
): DiagramNode {
    return {
        id,
        type: 'node',
        label,
        shape: options.shape || 'rectangle',
        position: options.position,
        size: options.size,
        style: options.style || {},
        metadata: options.metadata,
    };
}

/** Create edge with defaults */
export function createEdge(
    source: string,
    target: string,
    options: Partial<Omit<DiagramEdge, 'id' | 'type' | 'source' | 'target'>> = {}
): DiagramEdge {
    return {
        id: generateId(),
        type: 'edge',
        source,
        target,
        label: options.label,
        arrow: options.arrow || { sourceType: 'none', targetType: 'arrow', lineType: 'solid' },
        style: options.style || {},
        waypoints: options.waypoints,
        metadata: options.metadata,
    };
}

/** Create group with defaults */
export function createGroup(
    id: string,
    children: string[],
    options: Partial<Omit<DiagramGroup, 'id' | 'type' | 'children'>> = {}
): DiagramGroup {
    return {
        id,
        type: 'group',
        label: options.label || id,
        children,
        position: options.position,
        size: options.size,
        style: options.style || {},
        metadata: options.metadata,
    };
}
