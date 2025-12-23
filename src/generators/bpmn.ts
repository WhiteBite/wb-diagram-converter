/**
 * BPMN Generator
 * 
 * Generates BPMN 2.0 XML from IR
 */

import type { Diagram, DiagramNode } from '../types';

/** Generate BPMN XML from IR */
export function generateBpmn(diagram: Diagram): string {
    const lines: string[] = [];

    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"');
    lines.push('             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"');
    lines.push('             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"');
    lines.push('             xmlns:di="http://www.omg.org/spec/DD/20100524/DI"');
    lines.push(`             id="definitions-${diagram.id}">`);
    lines.push('');
    lines.push(`  <process id="process-${diagram.id}" isExecutable="false">`);

    // Generate flow elements
    for (const node of diagram.nodes) {
        const element = generateBpmnElement(node);
        lines.push(`    ${element}`);
    }

    lines.push('');

    // Generate sequence flows
    for (const edge of diagram.edges) {
        const name = edge.label ? ` name="${escapeXml(edge.label)}"` : '';
        lines.push(`    <sequenceFlow id="${edge.id}" sourceRef="${edge.source}" targetRef="${edge.target}"${name}/>`);
    }

    lines.push('  </process>');
    lines.push('');

    // Generate diagram info (layout)
    lines.push(`  <bpmndi:BPMNDiagram id="diagram-${diagram.id}">`);
    lines.push(`    <bpmndi:BPMNPlane id="plane-${diagram.id}" bpmnElement="process-${diagram.id}">`);

    for (const node of diagram.nodes) {
        const x = node.position?.x ?? 0;
        const y = node.position?.y ?? 0;
        const w = node.size?.width ?? 100;
        const h = node.size?.height ?? 80;

        lines.push(`      <bpmndi:BPMNShape id="shape-${node.id}" bpmnElement="${node.id}">`);
        lines.push(`        <dc:Bounds x="${x}" y="${y}" width="${w}" height="${h}"/>`);
        lines.push('      </bpmndi:BPMNShape>');
    }

    for (const edge of diagram.edges) {
        lines.push(`      <bpmndi:BPMNEdge id="edge-${edge.id}" bpmnElement="${edge.id}">`);
        lines.push('      </bpmndi:BPMNEdge>');
    }

    lines.push('    </bpmndi:BPMNPlane>');
    lines.push('  </bpmndi:BPMNDiagram>');
    lines.push('</definitions>');

    return lines.join('\n');
}

function generateBpmnElement(node: DiagramNode): string {
    const name = ` name="${escapeXml(node.label)}"`;
    const bpmnType = node.metadata?.bpmnType as string | undefined;
    const bpmnSubtype = node.metadata?.bpmnSubtype as string | undefined;

    // Detect element type from shape or metadata
    if (bpmnType) {
        return `<${bpmnType} id="${node.id}"${name}/>`;
    }

    if (node.shape === 'circle') {
        if (bpmnSubtype === 'end') {
            return `<endEvent id="${node.id}"${name}/>`;
        }
        if (bpmnSubtype === 'intermediate') {
            return `<intermediateCatchEvent id="${node.id}"${name}/>`;
        }
        return `<startEvent id="${node.id}"${name}/>`;
    }

    if (node.shape === 'diamond') {
        if (bpmnSubtype === 'parallel') {
            return `<parallelGateway id="${node.id}"${name}/>`;
        }
        if (bpmnSubtype === 'inclusive') {
            return `<inclusiveGateway id="${node.id}"${name}/>`;
        }
        return `<exclusiveGateway id="${node.id}"${name}/>`;
    }

    // Default to task
    return `<task id="${node.id}"${name}/>`;
}

function escapeXml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
