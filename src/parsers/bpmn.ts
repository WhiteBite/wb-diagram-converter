/**
 * BPMN Parser
 * 
 * Parses BPMN 2.0 XML to IR
 * Business Process Model and Notation standard
 */

import type { Diagram, DiagramNode, DiagramEdge, DiagramGroup, NodeShape } from '../types';

/** Parse BPMN XML to IR */
export function parseBpmn(xml: string): Diagram {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');

    const nodes: DiagramNode[] = [];
    const edges: DiagramEdge[] = [];
    const groups: DiagramGroup[] = [];

    // Parse process elements
    const processes = doc.querySelectorAll('process, bpmn\\:process');

    processes.forEach(process => {
        const processId = process.getAttribute('id') || 'process';

        // Parse tasks
        const tasks = process.querySelectorAll('task, userTask, serviceTask, scriptTask, manualTask, businessRuleTask, sendTask, receiveTask, bpmn\\:task, bpmn\\:userTask, bpmn\\:serviceTask');
        tasks.forEach(task => {
            nodes.push(createBpmnNode(task, 'rectangle'));
        });

        // Parse events
        const startEvents = process.querySelectorAll('startEvent, bpmn\\:startEvent');
        startEvents.forEach(event => {
            nodes.push(createBpmnNode(event, 'circle', 'start'));
        });

        const endEvents = process.querySelectorAll('endEvent, bpmn\\:endEvent');
        endEvents.forEach(event => {
            nodes.push(createBpmnNode(event, 'circle', 'end'));
        });

        const intermediateEvents = process.querySelectorAll('intermediateCatchEvent, intermediateThrowEvent, bpmn\\:intermediateCatchEvent, bpmn\\:intermediateThrowEvent');
        intermediateEvents.forEach(event => {
            nodes.push(createBpmnNode(event, 'circle', 'intermediate'));
        });

        // Parse gateways
        const exclusiveGateways = process.querySelectorAll('exclusiveGateway, bpmn\\:exclusiveGateway');
        exclusiveGateways.forEach(gw => {
            nodes.push(createBpmnNode(gw, 'diamond', 'exclusive'));
        });

        const parallelGateways = process.querySelectorAll('parallelGateway, bpmn\\:parallelGateway');
        parallelGateways.forEach(gw => {
            nodes.push(createBpmnNode(gw, 'diamond', 'parallel'));
        });

        const inclusiveGateways = process.querySelectorAll('inclusiveGateway, bpmn\\:inclusiveGateway');
        inclusiveGateways.forEach(gw => {
            nodes.push(createBpmnNode(gw, 'diamond', 'inclusive'));
        });

        // Parse sequence flows (edges)
        const flows = process.querySelectorAll('sequenceFlow, bpmn\\:sequenceFlow');
        flows.forEach(flow => {
            const id = flow.getAttribute('id') || `flow-${edges.length}`;
            const sourceRef = flow.getAttribute('sourceRef') || '';
            const targetRef = flow.getAttribute('targetRef') || '';
            const name = flow.getAttribute('name') || '';

            if (sourceRef && targetRef) {
                edges.push({
                    id,
                    type: 'edge',
                    source: sourceRef,
                    target: targetRef,
                    label: name,
                    arrow: { sourceType: 'none', targetType: 'arrow', lineType: 'solid' },
                    style: {},
                });
            }
        });

        // Parse lanes as groups
        const lanes = process.querySelectorAll('lane, bpmn\\:lane');
        lanes.forEach(lane => {
            const id = lane.getAttribute('id') || `lane-${groups.length}`;
            const name = lane.getAttribute('name') || id;
            const flowNodeRefs = lane.querySelectorAll('flowNodeRef, bpmn\\:flowNodeRef');
            const children = Array.from(flowNodeRefs).map(ref => ref.textContent || '').filter(Boolean);

            groups.push({
                id,
                type: 'group',
                label: name,
                children,
                style: {},
                metadata: { bpmnType: 'lane' },
            });
        });

        // Parse subprocesses as groups
        const subprocesses = process.querySelectorAll('subProcess, bpmn\\:subProcess');
        subprocesses.forEach(sp => {
            const id = sp.getAttribute('id') || `subprocess-${groups.length}`;
            const name = sp.getAttribute('name') || id;

            groups.push({
                id,
                type: 'group',
                label: name,
                children: [],
                style: {},
                metadata: { bpmnType: 'subprocess' },
            });
        });
    });

    return {
        id: 'bpmn-diagram',
        type: 'flowchart',
        nodes,
        edges,
        groups,
        metadata: { source: 'bpmn' },
    };
}

function createBpmnNode(element: Element, shape: NodeShape, subtype?: string): DiagramNode {
    const id = element.getAttribute('id') || `node-${Date.now()}`;
    const name = element.getAttribute('name') || id;

    return {
        id,
        type: 'node',
        label: name,
        shape,
        style: {},
        metadata: { bpmnType: element.tagName, bpmnSubtype: subtype },
    };
}
