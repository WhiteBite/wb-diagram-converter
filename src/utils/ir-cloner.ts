/**
 * IR Cloner Utilities
 * 
 * Deep cloning utilities for diagram structures.
 * All functions create independent copies with no shared references.
 */

import type {
    Diagram,
    DiagramNode,
    DiagramEdge,
    DiagramGroup,
    Position,
    Size,
    NodeStyle,
    EdgeStyle,
    GroupStyle,
    ArrowConfig,
    Port,
    Viewport,
} from '../types/ir';

/**
 * Deep clone a position object
 */
export function clonePosition(position: Position): Position {
    return {
        x: position.x,
        y: position.y,
    };
}

/**
 * Deep clone a size object
 */
export function cloneSize(size: Size): Size {
    return {
        width: size.width,
        height: size.height,
    };
}

/**
 * Deep clone node style
 */
export function cloneNodeStyle(style: NodeStyle): NodeStyle {
    return {
        fill: style.fill,
        stroke: style.stroke,
        strokeWidth: style.strokeWidth,
        fontSize: style.fontSize,
        fontFamily: style.fontFamily,
        fontColor: style.fontColor,
        fontWeight: style.fontWeight,
        textAlign: style.textAlign,
        opacity: style.opacity,
        shadow: style.shadow,
        rounded: style.rounded,
    };
}

/**
 * Deep clone edge style
 */
export function cloneEdgeStyle(style: EdgeStyle): EdgeStyle {
    return {
        stroke: style.stroke,
        strokeWidth: style.strokeWidth,
        opacity: style.opacity,
    };
}

/**
 * Deep clone group style
 */
export function cloneGroupStyle(style: GroupStyle): GroupStyle {
    return {
        fill: style.fill,
        stroke: style.stroke,
        strokeWidth: style.strokeWidth,
        strokeDasharray: style.strokeDasharray,
        opacity: style.opacity,
        labelPosition: style.labelPosition,
    };
}

/**
 * Deep clone arrow configuration
 */
export function cloneArrowConfig(arrow: ArrowConfig): ArrowConfig {
    return {
        sourceType: arrow.sourceType,
        targetType: arrow.targetType,
        lineType: arrow.lineType,
    };
}

/**
 * Deep clone a port
 */
export function clonePort(port: Port): Port {
    return {
        id: port.id,
        position: port.position,
        offset: port.offset,
    };
}

/**
 * Deep clone viewport
 */
export function cloneViewport(viewport: Viewport): Viewport {
    return {
        width: viewport.width,
        height: viewport.height,
        zoom: viewport.zoom,
        offsetX: viewport.offsetX,
        offsetY: viewport.offsetY,
    };
}

/**
 * Deep clone a diagram node
 * 
 * @param node - Node to clone
 * @returns Independent copy of the node
 */
export function cloneNode(node: DiagramNode): DiagramNode {
    return {
        id: node.id,
        type: node.type,
        label: node.label,
        shape: node.shape,
        position: node.position ? clonePosition(node.position) : undefined,
        size: node.size ? cloneSize(node.size) : undefined,
        style: cloneNodeStyle(node.style),
        ports: node.ports ? node.ports.map(clonePort) : undefined,
        metadata: node.metadata ? { ...node.metadata } : undefined,
    };
}

/**
 * Deep clone a diagram edge
 * 
 * @param edge - Edge to clone
 * @returns Independent copy of the edge
 */
export function cloneEdge(edge: DiagramEdge): DiagramEdge {
    return {
        id: edge.id,
        type: edge.type,
        source: edge.source,
        target: edge.target,
        sourcePort: edge.sourcePort,
        targetPort: edge.targetPort,
        label: edge.label,
        labelPosition: edge.labelPosition,
        arrow: cloneArrowConfig(edge.arrow),
        style: cloneEdgeStyle(edge.style),
        waypoints: edge.waypoints ? edge.waypoints.map(clonePosition) : undefined,
        metadata: edge.metadata ? { ...edge.metadata } : undefined,
    };
}

/**
 * Deep clone a diagram group
 * 
 * @param group - Group to clone
 * @returns Independent copy of the group
 */
export function cloneGroup(group: DiagramGroup): DiagramGroup {
    return {
        id: group.id,
        type: group.type,
        label: group.label,
        children: [...group.children],
        position: group.position ? clonePosition(group.position) : undefined,
        size: group.size ? cloneSize(group.size) : undefined,
        style: cloneGroupStyle(group.style),
        collapsed: group.collapsed,
        metadata: group.metadata ? { ...group.metadata } : undefined,
    };
}

/**
 * Deep clone an entire diagram
 * 
 * Creates a completely independent copy with no shared references.
 * All nested objects are cloned recursively.
 * 
 * @param diagram - Diagram to clone
 * @returns Independent copy of the diagram
 * 
 * @example
 * const clone = cloneDiagram(originalDiagram);
 * clone.nodes[0].label = 'Modified'; // Does not affect original
 */
export function cloneDiagram(diagram: Diagram): Diagram {
    return {
        id: diagram.id,
        name: diagram.name,
        type: diagram.type,
        nodes: diagram.nodes.map(cloneNode),
        edges: diagram.edges.map(cloneEdge),
        groups: diagram.groups.map(cloneGroup),
        viewport: diagram.viewport ? cloneViewport(diagram.viewport) : undefined,
        metadata: diagram.metadata ? { ...diagram.metadata } : undefined,
    };
}

/**
 * Clone a diagram with new IDs for all elements
 * 
 * Useful for duplicating diagrams or creating templates.
 * Maintains all references between elements.
 * 
 * @param diagram - Diagram to clone
 * @param idGenerator - Function to generate new IDs (default: append '-copy')
 * @returns Cloned diagram with new IDs
 * 
 * @example
 * const duplicate = cloneDiagramWithNewIds(original, (id) => `${id}-copy`);
 */
export function cloneDiagramWithNewIds(
    diagram: Diagram,
    idGenerator: (oldId: string) => string = (id) => `${id}-copy`
): Diagram {
    const idMap = new Map<string, string>();

    // Generate new IDs for all elements
    diagram.nodes.forEach(node => {
        idMap.set(node.id, idGenerator(node.id));
    });
    diagram.groups.forEach(group => {
        idMap.set(group.id, idGenerator(group.id));
    });
    diagram.edges.forEach(edge => {
        idMap.set(edge.id, idGenerator(edge.id));
    });

    // Clone with new IDs
    return {
        id: idGenerator(diagram.id),
        name: diagram.name ? `${diagram.name} (copy)` : undefined,
        type: diagram.type,
        nodes: diagram.nodes.map(node => ({
            ...cloneNode(node),
            id: idMap.get(node.id)!,
        })),
        edges: diagram.edges.map(edge => ({
            ...cloneEdge(edge),
            id: idMap.get(edge.id)!,
            source: idMap.get(edge.source)!,
            target: idMap.get(edge.target)!,
        })),
        groups: diagram.groups.map(group => ({
            ...cloneGroup(group),
            id: idMap.get(group.id)!,
            children: group.children.map(childId => idMap.get(childId)!),
        })),
        viewport: diagram.viewport ? cloneViewport(diagram.viewport) : undefined,
        metadata: diagram.metadata ? { ...diagram.metadata } : undefined,
    };
}

/**
 * Clone a diagram with a transformation applied to all nodes
 * 
 * @param diagram - Diagram to clone
 * @param transform - Function to transform each node
 * @returns Cloned diagram with transformed nodes
 * 
 * @example
 * // Offset all nodes by 100px
 * const offset = cloneDiagramWithTransform(diagram, (node) => ({
 *   ...node,
 *   position: node.position ? {
 *     x: node.position.x + 100,
 *     y: node.position.y + 100,
 *   } : undefined,
 * }));
 */
export function cloneDiagramWithTransform(
    diagram: Diagram,
    transform: (node: DiagramNode) => DiagramNode
): Diagram {
    return {
        ...cloneDiagram(diagram),
        nodes: diagram.nodes.map(node => transform(cloneNode(node))),
    };
}

/**
 * Shallow clone a diagram (only top-level properties)
 * 
 * WARNING: Arrays and nested objects are still shared!
 * Use this only when you need to modify top-level properties.
 * 
 * @param diagram - Diagram to clone
 * @returns A shallow clone
 */
export function shallowCloneDiagram(diagram: Diagram): Diagram {
    return {
        ...diagram,
        nodes: [...diagram.nodes],
        edges: [...diagram.edges],
        groups: [...diagram.groups],
    };
}
