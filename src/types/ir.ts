/**
 * WB Diagrams - Intermediate Representation Types
 * 
 * Core data structures for universal diagram conversion.
 * All parsers convert to IR, all generators convert from IR.
 */

// =============================================================================
// Base Types
// =============================================================================

export interface Position {
    x: number;
    y: number;
}

export interface Size {
    width: number;
    height: number;
}

export interface Viewport {
    width: number;
    height: number;
    zoom?: number;
    offsetX?: number;
    offsetY?: number;
}

// =============================================================================
// Arrow & Line Types
// =============================================================================

/** Arrow head types */
export type ArrowHeadType =
    | 'none'           // No arrow head
    | 'arrow'          // Standard arrow →
    | 'open'           // Open arrow ▷
    | 'diamond'        // Diamond ◇
    | 'diamond-filled' // Filled diamond ◆
    | 'circle'         // Circle ○
    | 'circle-filled'  // Filled circle ●
    | 'cross'          // Cross ×
    | 'bar';           // Bar |

/** Line types */
export type LineType =
    | 'solid'          // Solid line ───
    | 'dashed'         // Dashed line - - -
    | 'dotted'         // Dotted line ···
    | 'thick';         // Thick line ═══

/** Arrow configuration */
export interface ArrowConfig {
    sourceType: ArrowHeadType;
    targetType: ArrowHeadType;
    lineType: LineType;
}

// =============================================================================
// Node Types
// =============================================================================

/** Node shapes */
export type NodeShape =
    | 'rectangle'
    | 'rounded-rectangle'
    | 'circle'
    | 'ellipse'
    | 'diamond'
    | 'hexagon'
    | 'parallelogram'
    | 'trapezoid'
    | 'cylinder'       // Database
    | 'document'
    | 'cloud'
    | 'actor'          // UML actor (stick figure)
    | 'note'
    | 'custom';

/** Node style */
export interface NodeStyle {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    fontSize?: number;
    fontFamily?: string;
    fontColor?: string;
    fontWeight?: 'normal' | 'bold';
    textAlign?: 'left' | 'center' | 'right';
    opacity?: number;
    shadow?: boolean;
    rounded?: number;  // Border radius
}

/** Connection port on a node */
export interface Port {
    id: string;
    position: 'top' | 'right' | 'bottom' | 'left' | 'center';
    offset?: number;   // 0-1, position along the edge
}

/** Diagram node (shape/block) */
export interface DiagramNode {
    id: string;
    type: 'node';
    label: string;
    shape: NodeShape;
    position?: Position;  // May be undefined for auto-layout
    size?: Size;
    style: NodeStyle;
    ports?: Port[];
    metadata?: Record<string, unknown>;
}

// =============================================================================
// Edge Types
// =============================================================================

/** Edge style */
export interface EdgeStyle {
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
}

/** Edge label position */
export type LabelPosition = 'start' | 'middle' | 'end';

/** Diagram edge (connection/arrow) */
export interface DiagramEdge {
    id: string;
    type: 'edge';
    source: string;           // Source node ID
    target: string;           // Target node ID
    sourcePort?: string;      // Specific port on source
    targetPort?: string;      // Specific port on target
    label?: string;
    labelPosition?: LabelPosition;
    arrow: ArrowConfig;
    style: EdgeStyle;
    waypoints?: Position[];   // Intermediate points for routing
    metadata?: Record<string, unknown>;
}

// =============================================================================
// Group Types
// =============================================================================

/** Group style */
export interface GroupStyle {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
    opacity?: number;
    labelPosition?: 'top' | 'bottom' | 'inside';
}

/** Diagram group (container/subgraph) */
export interface DiagramGroup {
    id: string;
    type: 'group';
    label?: string;
    children: string[];       // IDs of contained elements
    position?: Position;
    size?: Size;
    style: GroupStyle;
    collapsed?: boolean;
    metadata?: Record<string, unknown>;
}

// =============================================================================
// Diagram Types
// =============================================================================

/** Diagram type/category */
export type DiagramType =
    | 'flowchart'
    | 'sequence'
    | 'class'
    | 'state'
    | 'er'              // Entity-Relationship
    | 'mindmap'
    | 'gantt'
    | 'pie'
    | 'generic';

/** Diagram metadata */
export interface DiagramMetadata {
    source: string;           // Original format
    sourceVersion?: string;
    created?: string;
    modified?: string;
    author?: string;
    title?: string;
    description?: string;
    [key: string]: unknown;
}

/** Complete diagram representation */
export interface Diagram {
    id: string;
    name?: string;
    type: DiagramType;
    nodes: DiagramNode[];
    edges: DiagramEdge[];
    groups: DiagramGroup[];
    viewport?: Viewport;
    metadata?: DiagramMetadata;
}

// =============================================================================
// Utility Types
// =============================================================================

/** Supported input formats */
export type InputFormat =
    | 'mermaid'
    | 'drawio'
    | 'excalidraw'
    | 'plantuml'
    | 'dot'
    | 'd2'
    | 'structurizr'
    | 'bpmn'
    | 'graphml'
    | 'lucidchart';

/** Supported output formats */
export type OutputFormat =
    | 'mermaid'
    | 'drawio'
    | 'excalidraw'
    | 'plantuml'
    | 'dot'
    | 'svg'
    | 'png'
    | 'd2'
    | 'structurizr'
    | 'bpmn'
    | 'graphml';

/** Layout algorithm */
export type LayoutAlgorithm = 'dagre' | 'elk' | 'none';

/** Layout direction */
export type LayoutDirection = 'TB' | 'BT' | 'LR' | 'RL';

/** Conversion options */
export interface ConvertOptions {
    from: InputFormat;
    to: OutputFormat;
    layout?: {
        algorithm: LayoutAlgorithm;
        direction?: LayoutDirection;
        nodeSpacing?: number;
        rankSpacing?: number;
    };
    style?: {
        theme?: 'default' | 'dark' | 'minimal';
        fontSize?: number;
        fontFamily?: string;
    };
    text?: {
        /** Transliterate Cyrillic to Latin (for formats with poor Unicode support) */
        transliterate?: boolean;
        /** Max label length (truncate with ...) */
        maxLength?: number;
        /** Escape special characters */
        escapeSpecial?: boolean;
    };
    preserveLayout?: boolean;
}

/** Conversion result */
export interface ConvertResult {
    output: string;
    diagram: Diagram;
    warnings?: string[];
    errors?: string[];
}
