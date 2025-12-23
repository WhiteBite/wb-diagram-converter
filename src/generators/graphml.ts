/**
 * GraphML Generator
 * 
 * Generates GraphML (yEd compatible) from IR
 * http://graphml.graphdrawing.org/
 */

import type { Diagram, DiagramNode, DiagramEdge, DiagramGroup } from '../types';

/** Generate GraphML from IR */
export function generateGraphML(diagram: Diagram): string {
    const lines: string[] = [];

    // XML header
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<graphml xmlns="http://graphml.graphdrawing.org/xmlns"');
    lines.push('  xmlns:y="http://www.yworks.com/xml/graphml"');
    lines.push('  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">');

    // Key definitions for yEd
    lines.push('  <key id="d0" for="node" yfiles.type="nodegraphics"/>');
    lines.push('  <key id="d1" for="edge" yfiles.type="edgegraphics"/>');
    lines.push('  <key id="d2" for="node" attr.name="label" attr.type="string"/>');
    lines.push('  <key id="d3" for="edge" attr.name="label" attr.type="string"/>');
    lines.push('');

    // Graph element
    const edgeDefault = 'directed';
    lines.push(`  <graph id="G" edgedefault="${edgeDefault}">`);

    // Track nodes in groups
    const nodesInGroups = new Set<string>();
    for (const group of diagram.groups) {
        for (const childId of group.children) {
            nodesInGroups.add(childId);
        }
    }

    // Generate groups as group nodes
    for (const group of diagram.groups) {
        lines.push(...generateGroupNode(group, diagram.nodes, '    '));
    }

    // Generate standalone nodes
    for (const node of diagram.nodes) {
        if (nodesInGroups.has(node.id)) continue;
        lines.push(...generateNode(node, '    '));
    }

    // Generate edges
    for (const edge of diagram.edges) {
        lines.push(...generateEdge(edge, '    '));
    }

    lines.push('  </graph>');
    lines.push('</graphml>');

    return lines.join('\n');
}

function generateNode(node: DiagramNode, indent: string): string[] {
    const lines: string[] = [];
    const shape = mapShapeToGraphML(node.shape);
    const width = node.size?.width || 120;
    const height = node.size?.height || 60;
    const x = node.position?.x || 0;
    const y = node.position?.y || 0;

    lines.push(`${indent}<node id="${escapeXml(node.id)}">`);
    lines.push(`${indent}  <data key="d2">${escapeXml(node.label)}</data>`);
    lines.push(`${indent}  <data key="d0">`);
    lines.push(`${indent}    <y:ShapeNode>`);
    lines.push(`${indent}      <y:Geometry height="${height}" width="${width}" x="${x}" y="${y}"/>`);
    lines.push(`${indent}      <y:Fill color="${node.style?.fill || '#FFFFFF'}" transparent="false"/>`);
    lines.push(`${indent}      <y:BorderStyle color="${node.style?.stroke || '#000000'}" type="line" width="${node.style?.strokeWidth || 1}"/>`);
    lines.push(`${indent}      <y:NodeLabel>${escapeXml(node.label)}</y:NodeLabel>`);
    lines.push(`${indent}      <y:Shape type="${shape}"/>`);
    lines.push(`${indent}    </y:ShapeNode>`);
    lines.push(`${indent}  </data>`);
    lines.push(`${indent}</node>`);

    return lines;
}

function generateGroupNode(group: DiagramGroup, nodes: DiagramNode[], indent: string): string[] {
    const lines: string[] = [];

    lines.push(`${indent}<node id="${escapeXml(group.id)}" yfiles.foldertype="group">`);
    lines.push(`${indent}  <data key="d2">${escapeXml(group.label || group.id)}</data>`);
    lines.push(`${indent}  <data key="d0">`);
    lines.push(`${indent}    <y:ProxyAutoBoundsNode>`);
    lines.push(`${indent}      <y:Realizers active="0">`);
    lines.push(`${indent}        <y:GroupNode>`);
    lines.push(`${indent}          <y:Fill color="${group.style?.fill || '#F5F5F5'}" transparent="false"/>`);
    lines.push(`${indent}          <y:BorderStyle color="${group.style?.stroke || '#CCCCCC'}" type="line" width="1"/>`);
    lines.push(`${indent}          <y:NodeLabel>${escapeXml(group.label || group.id)}</y:NodeLabel>`);
    lines.push(`${indent}          <y:State closed="false"/>`);
    lines.push(`${indent}        </y:GroupNode>`);
    lines.push(`${indent}      </y:Realizers>`);
    lines.push(`${indent}    </y:ProxyAutoBoundsNode>`);
    lines.push(`${indent}  </data>`);
    lines.push(`${indent}  <graph id="${escapeXml(group.id)}:" edgedefault="directed">`);

    // Add child nodes
    for (const childId of group.children) {
        const node = nodes.find(n => n.id === childId);
        if (node) {
            lines.push(...generateNode(node, indent + '    '));
        }
    }

    lines.push(`${indent}  </graph>`);
    lines.push(`${indent}</node>`);

    return lines;
}

function generateEdge(edge: DiagramEdge, indent: string): string[] {
    const lines: string[] = [];
    const hasSourceArrow = edge.arrow?.sourceType !== 'none';
    const hasTargetArrow = edge.arrow?.targetType !== 'none';
    const lineStyle = edge.arrow?.lineType === 'dashed' ? 'dashed' : 'line';

    lines.push(`${indent}<edge id="${escapeXml(edge.id)}" source="${escapeXml(edge.source)}" target="${escapeXml(edge.target)}">`);

    if (edge.label) {
        lines.push(`${indent}  <data key="d3">${escapeXml(edge.label)}</data>`);
    }

    lines.push(`${indent}  <data key="d1">`);
    lines.push(`${indent}    <y:PolyLineEdge>`);
    lines.push(`${indent}      <y:LineStyle color="${edge.style?.stroke || '#000000'}" type="${lineStyle}" width="${edge.style?.strokeWidth || 1}"/>`);
    lines.push(`${indent}      <y:Arrows source="${hasSourceArrow ? 'standard' : 'none'}" target="${hasTargetArrow ? 'standard' : 'none'}"/>`);

    if (edge.label) {
        lines.push(`${indent}      <y:EdgeLabel>${escapeXml(edge.label)}</y:EdgeLabel>`);
    }

    lines.push(`${indent}    </y:PolyLineEdge>`);
    lines.push(`${indent}  </data>`);
    lines.push(`${indent}</edge>`);

    return lines;
}

function mapShapeToGraphML(shape: string): string {
    const shapeMap: Record<string, string> = {
        'rectangle': 'rectangle',
        'rounded-rectangle': 'roundrectangle',
        'circle': 'ellipse',
        'ellipse': 'ellipse',
        'diamond': 'diamond',
        'hexagon': 'hexagon',
        'parallelogram': 'parallelogram',
        'trapezoid': 'trapezoid',
        'triangle': 'triangle',
        'cylinder': 'rectangle', // GraphML doesn't have cylinder
        'cloud': 'rectangle',
        'actor': 'rectangle',
    };
    return shapeMap[shape] || 'rectangle';
}

function escapeXml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
