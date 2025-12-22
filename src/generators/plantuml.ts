/**
 * PlantUML generator
 * 
 * Generates PlantUML activity/component diagram syntax from IR
 */

import type { Diagram, DiagramNode, DiagramEdge, DiagramGroup, ArrowConfig, NodeShape } from '../types';
import { generatePlantUMLArrow, PLANTUML_SHAPE_MAP } from '../utils';

/** Generate PlantUML diagram from IR */
export function generatePlantUML(diagram: Diagram): string {
    const lines: string[] = [];
    const direction = (diagram.metadata?.direction as string) || 'TB';

    // Header
    lines.push('@startuml');
    lines.push('');

    // Direction
    if (direction === 'LR' || direction === 'RL') {
        lines.push('left to right direction');
        lines.push('');
    }

    // Skinparam for styling
    lines.push('skinparam defaultTextAlignment center');
    lines.push('skinparam shadowing false');

    // Style for diamond/choice nodes
    const hasDiamond = diagram.nodes.some(n => n.shape === 'diamond');
    if (hasDiamond) {
        lines.push('skinparam agent {');
        lines.push('    BorderColor Black');
        lines.push('    BackgroundColor White');
        lines.push('}');
    }
    lines.push('');

    // Track which nodes are in groups
    const nodesInGroups = new Set<string>();
    for (const group of diagram.groups) {
        for (const childId of group.children) {
            nodesInGroups.add(childId);
        }
    }

    // Generate groups with their nodes
    for (const group of diagram.groups) {
        lines.push(...generateGroup(group, diagram.nodes));
        lines.push('');
    }

    // Generate standalone nodes (not in groups)
    for (const node of diagram.nodes) {
        if (!nodesInGroups.has(node.id)) {
            lines.push(generateNodeDefinition(node));
        }
    }

    if (diagram.nodes.some(n => !nodesInGroups.has(n.id))) {
        lines.push('');
    }

    // Generate edges
    for (const edge of diagram.edges) {
        lines.push(generateEdge(edge, diagram.nodes));
    }

    lines.push('');
    lines.push('@enduml');

    return lines.join('\n');
}

/** Generate group (package/rectangle) */
function generateGroup(group: DiagramGroup, nodes: DiagramNode[]): string[] {
    const lines: string[] = [];
    const label = group.label || group.id;

    lines.push(`package "${label}" {`);

    // Add nodes in this group
    for (const childId of group.children) {
        const node = nodes.find(n => n.id === childId);
        if (node) {
            lines.push(`    ${generateNodeDefinition(node)}`);
        }
    }

    lines.push('}');

    return lines;
}

/** Generate node definition */
function generateNodeDefinition(node: DiagramNode): string {
    const shape = getPlantUMLShape(node.shape);
    const label = escapeLabel(node.label);
    const alias = sanitizeAlias(node.id);

    // Style string
    const style = generateNodeStyle(node);

    // Handle diamond specially - PlantUML doesn't have native diamond
    // Use agent with <<choice>> or skinparam for decision nodes
    if (node.shape === 'diamond') {
        return `agent "${label}" as ${alias} <<choice>>${style}`;
    }

    switch (shape) {
        case 'actor':
            return `actor "${label}" as ${alias}${style}`;
        case 'database':
            return `database "${label}" as ${alias}${style}`;
        case 'cloud':
            return `cloud "${label}" as ${alias}${style}`;
        case 'file':
            return `file "${label}" as ${alias}${style}`;
        case 'circle':
            return `circle "${label}" as ${alias}${style}`;
        case 'hexagon':
            return `hexagon "${label}" as ${alias}${style}`;
        case 'card':
            return `card "${label}" as ${alias}${style}`;
        case 'usecase':
            return `usecase "${label}" as ${alias}${style}`;
        case 'note':
            return `note "${label}" as ${alias}${style}`;
        case 'agent':
            return `agent "${label}" as ${alias}${style}`;
        default:
            return `rectangle "${label}" as ${alias}${style}`;
    }
}

/** Generate edge: A --> B : label */
function generateEdge(edge: DiagramEdge, nodes: DiagramNode[]): string {
    const sourceAlias = sanitizeAlias(edge.source);
    const targetAlias = sanitizeAlias(edge.target);
    const arrow = generatePlantUMLArrow(edge.arrow);

    if (edge.label) {
        return `${sourceAlias} ${arrow} ${targetAlias} : ${escapeLabel(edge.label)}`;
    }

    return `${sourceAlias} ${arrow} ${targetAlias}`;
}

/** Get PlantUML shape keyword */
function getPlantUMLShape(shape: NodeShape): string {
    return PLANTUML_SHAPE_MAP[shape] || 'rectangle';
}

/** Generate node style string */
function generateNodeStyle(node: DiagramNode): string {
    const parts: string[] = [];

    if (node.style.fill) {
        parts.push(node.style.fill);
    }

    if (parts.length > 0) {
        return ` ${parts.join(';')}`;
    }

    return '';
}

/** Escape special characters in label */
function escapeLabel(label: string): string {
    return label
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"');
}

/** Sanitize string for use as PlantUML alias */
function sanitizeAlias(str: string): string {
    // PlantUML aliases must be alphanumeric with underscores
    return str.replace(/[^a-zA-Z0-9_]/g, '_');
}
