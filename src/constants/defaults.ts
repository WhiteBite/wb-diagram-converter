/**
 * Default values
 * 
 * Default configurations and fallback values
 */

import type { NodeStyle, EdgeStyle, GroupStyle, ArrowConfig, LayoutDirection } from '../types';

/** Default node style */
export const DEFAULT_NODE_STYLE: NodeStyle = {
    fill: '#ffffff',
    stroke: '#000000',
    strokeWidth: 2,
    fontSize: 14,
    fontFamily: 'sans-serif',
    fontColor: '#000000',
} as const;

/** Default edge style */
export const DEFAULT_EDGE_STYLE: EdgeStyle = {
    stroke: '#000000',
    strokeWidth: 2,
} as const;

/** Default group style */
export const DEFAULT_GROUP_STYLE: GroupStyle = {
    fill: '#f5f5f5',
    stroke: '#cccccc',
    strokeWidth: 1,
} as const;

/** Default arrow configuration */
export const DEFAULT_ARROW: ArrowConfig = {
    sourceType: 'none',
    targetType: 'arrow',
    lineType: 'solid',
} as const;

/** Default layout direction */
export const DEFAULT_DIRECTION: LayoutDirection = 'TB';

/** Supported formats */
export const FORMATS = {
    INPUT: ['mermaid', 'drawio', 'excalidraw', 'plantuml', 'dot'] as const,
    OUTPUT: ['mermaid', 'drawio', 'excalidraw', 'plantuml', 'dot', 'svg', 'png'] as const,
} as const;

/** Text encoding defaults */
export const TEXT_ENCODING = {
    MAX_LENGTH: 50,
    ELLIPSIS: '...',
} as const;
