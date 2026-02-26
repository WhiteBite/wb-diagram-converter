/**
 * Mermaid State Diagram Parser
 * 
 * Parses Mermaid stateDiagram-v2 syntax to IR
 */

import type { Diagram, DiagramNode, DiagramEdge, DiagramGroup, NodeShape } from '../types';
import type {
    IRStateDiagram,
    IRState,
    IRTransition,
    IRStateNote,
    StateType,
    StateDirection,
    StateAction,
    StateNotePosition,
} from '../types/state';
import { generateId } from '../utils';
import { validateInput } from './base';

// =============================================================================
// Parser
// =============================================================================

/** Parse Mermaid state diagram to IR */
export function parseStateDiagram(source: string): Diagram {
    validateInput(source, 'mermaid');

    const stateDiagram = parseToStateDiagramIR(source);
    return convertStateDiagramToIR(stateDiagram);
}

/** Parse to intermediate state diagram representation */
export function parseToStateDiagramIR(source: string): IRStateDiagram {
    const lines = source.trim().split('\n');
    const states: IRState[] = [];
    const transitions: IRTransition[] = [];
    const notes: IRStateNote[] = [];

    const stateMap = new Map<string, IRState>();
    const compositeStack: IRState[] = [];

    let direction: StateDirection = 'TB';
    let title: string | undefined;

    // Track start/end state counters for unique IDs
    let startCounter = 0;
    let endCounter = 0;

    for (const rawLine of lines) {
        const line = rawLine.trim();

        // Skip empty lines and comments
        if (!line || line.startsWith('%%')) {
            continue;
        }

        // Detect diagram header
        const headerMatch = line.match(/^stateDiagram(?:-v2)?(?:\s*:\s*(.+))?$/i);
        if (headerMatch) {
            if (headerMatch[1]) {
                title = headerMatch[1].trim();
            }
            continue;
        }

        // Direction directive
        const directionMatch = line.match(/^direction\s+(TB|BT|LR|RL)$/i);
        if (directionMatch) {
            direction = directionMatch[1].toUpperCase() as StateDirection;
            continue;
        }

        // State definition with description: state "Description" as StateId
        const stateDefMatch = line.match(/^state\s+"([^"]+)"\s+as\s+(\w+)$/i);
        if (stateDefMatch) {
            const [, description, id] = stateDefMatch;
            const state = getOrCreateState(id, stateMap, states, compositeStack);
            state.description = description;
            state.label = description;
            continue;
        }

        // Composite state start: state StateId { or state "Label" as StateId {
        const compositeMatch = line.match(/^state\s+(?:"([^"]+)"\s+as\s+)?(\w+)\s*\{$/i);
        if (compositeMatch) {
            const [, label, id] = compositeMatch;
            const state = getOrCreateState(id, stateMap, states, compositeStack);
            state.type = 'composite';
            state.label = label || id;
            state.children = [];
            compositeStack.push(state);
            continue;
        }

        // Fork/Join state: state fork_state <<fork>> or state join_state <<join>>
        const forkJoinMatch = line.match(/^state\s+(\w+)\s+<<(fork|join|choice)>>$/i);
        if (forkJoinMatch) {
            const [, id, type] = forkJoinMatch;
            const state = getOrCreateState(id, stateMap, states, compositeStack);
            state.type = type.toLowerCase() as StateType;
            continue;
        }

        // End of composite state
        if (line === '}') {
            compositeStack.pop();
            continue;
        }

        // Note: note right of StateId : Note text
        // or note left of StateId : Note text
        const noteMatch = line.match(/^note\s+(right|left)\s+of\s+(\w+)\s*:\s*(.+)$/i);
        if (noteMatch) {
            const [, position, stateId, text] = noteMatch;
            notes.push({
                id: generateId(),
                stateId,
                position: position.toLowerCase() as StateNotePosition,
                text: text.trim(),
            });
            continue;
        }

        // Multi-line note start: note right of StateId
        const noteStartMatch = line.match(/^note\s+(right|left)\s+of\s+(\w+)$/i);
        if (noteStartMatch) {
            // Multi-line notes would need more complex parsing
            // For now, skip to end note
            continue;
        }

        // End note
        if (line.toLowerCase() === 'end note') {
            continue;
        }

        // Transition: StateA --> StateB : label
        // Also handles [*] for start/end states
        const transitionMatch = parseTransitionLine(line);
        if (transitionMatch) {
            const { sourceId, targetId, label, event, guard, action } = transitionMatch;

            // Handle [*] as start or end state
            let actualSourceId = sourceId;
            let actualTargetId = targetId;

            if (sourceId === '[*]') {
                actualSourceId = `__start_${startCounter++}`;
                const startState: IRState = {
                    id: actualSourceId,
                    type: 'start',
                    label: '[*]',
                };
                states.push(startState);
                stateMap.set(actualSourceId, startState);
                addToCurrentComposite(startState, compositeStack);
            } else {
                getOrCreateState(sourceId, stateMap, states, compositeStack);
            }

            if (targetId === '[*]') {
                actualTargetId = `__end_${endCounter++}`;
                const endState: IRState = {
                    id: actualTargetId,
                    type: 'end',
                    label: '[*]',
                };
                states.push(endState);
                stateMap.set(actualTargetId, endState);
                addToCurrentComposite(endState, compositeStack);
            } else {
                getOrCreateState(targetId, stateMap, states, compositeStack);
            }

            transitions.push({
                id: generateId(),
                source: actualSourceId,
                target: actualTargetId,
                label,
                event,
                guard,
                action,
            });
            continue;
        }

        // State with internal actions: StateId : entry / action
        const actionMatch = line.match(/^(\w+)\s*:\s*(entry|exit|do)\s*\/\s*(.+)$/i);
        if (actionMatch) {
            const [, stateId, actionType, actionText] = actionMatch;
            const state = getOrCreateState(stateId, stateMap, states, compositeStack);
            if (!state.actions) {
                state.actions = [];
            }
            state.actions.push({
                type: actionType.toLowerCase() as StateAction['type'],
                action: actionText.trim(),
            });
            continue;
        }

        // Simple state definition: StateId : Description
        const simpleStateMatch = line.match(/^(\w+)\s*:\s*(.+)$/);
        if (simpleStateMatch) {
            const [, id, description] = simpleStateMatch;
            const state = getOrCreateState(id, stateMap, states, compositeStack);
            state.description = description.trim();
            state.label = description.trim();
            continue;
        }

        // Standalone state reference (just the ID)
        const standaloneMatch = line.match(/^(\w+)$/);
        if (standaloneMatch && !['end', 'note'].includes(standaloneMatch[1].toLowerCase())) {
            const [, id] = standaloneMatch;
            getOrCreateState(id, stateMap, states, compositeStack);
            continue;
        }
    }

    return {
        id: generateId(),
        title,
        direction,
        states,
        transitions,
        notes: notes.length > 0 ? notes : undefined,
    };
}

// =============================================================================
// Helper Functions
// =============================================================================

interface TransitionMatch {
    sourceId: string;
    targetId: string;
    label?: string;
    event?: string;
    guard?: string;
    action?: string;
}

/** Parse transition line */
function parseTransitionLine(line: string): TransitionMatch | null {
    // Pattern: StateA --> StateB : label
    // Also: [*] --> StateB or StateA --> [*]
    const match = line.match(/^(\[\*\]|\w+)\s*-->\s*(\[\*\]|\w+)(?:\s*:\s*(.+))?$/);
    if (!match) return null;

    const [, sourceId, targetId, labelPart] = match;

    let label = labelPart?.trim();
    let event: string | undefined;
    let guard: string | undefined;
    let action: string | undefined;

    // Parse label for event[guard]/action format
    if (label) {
        const eventGuardActionMatch = label.match(/^([^[\]/]+)?(?:\[([^\]]+)\])?(?:\/(.+))?$/);
        if (eventGuardActionMatch) {
            event = eventGuardActionMatch[1]?.trim();
            guard = eventGuardActionMatch[2]?.trim();
            action = eventGuardActionMatch[3]?.trim();
        }
    }

    return { sourceId, targetId, label, event, guard, action };
}

/** Get or create state */
function getOrCreateState(
    id: string,
    stateMap: Map<string, IRState>,
    states: IRState[],
    compositeStack: IRState[]
): IRState {
    if (stateMap.has(id)) {
        return stateMap.get(id)!;
    }

    const state: IRState = {
        id,
        type: 'state',
        label: id,
    };

    states.push(state);
    stateMap.set(id, state);
    addToCurrentComposite(state, compositeStack);

    return state;
}

/** Add state to current composite if any */
function addToCurrentComposite(state: IRState, compositeStack: IRState[]): void {
    if (compositeStack.length > 0) {
        const currentComposite = compositeStack[compositeStack.length - 1];
        if (!currentComposite.children) {
            currentComposite.children = [];
        }
        // Add reference by ID, not the state itself (to avoid circular refs)
        // Actually, for nested states we store the full state
        currentComposite.children.push(state);
    }
}

// =============================================================================
// Conversion to Generic IR
// =============================================================================

/** Convert state diagram IR to generic diagram IR */
function convertStateDiagramToIR(stateDiagram: IRStateDiagram): Diagram {
    const nodes: DiagramNode[] = [];
    const edges: DiagramEdge[] = [];
    const groups: DiagramGroup[] = [];

    // Convert states to nodes
    for (const state of stateDiagram.states) {
        convertStateToNodes(state, nodes, groups);
    }

    // Convert transitions to edges
    for (const transition of stateDiagram.transitions) {
        edges.push({
            id: transition.id,
            type: 'edge',
            source: transition.source,
            target: transition.target,
            label: transition.label,
            arrow: {
                sourceType: 'none',
                targetType: 'arrow',
                lineType: 'solid',
            },
            style: transition.style || {},
            metadata: transition.metadata,
        });
    }

    // Convert notes to nodes
    if (stateDiagram.notes) {
        for (const note of stateDiagram.notes) {
            nodes.push({
                id: note.id,
                type: 'node',
                label: note.text,
                shape: 'note',
                style: {},
                metadata: {
                    noteFor: note.stateId,
                    notePosition: note.position,
                },
            });
        }
    }

    return {
        id: stateDiagram.id,
        name: stateDiagram.title,
        type: 'state',
        nodes,
        edges,
        groups,
        metadata: {
            source: 'mermaid-state',
            direction: stateDiagram.direction,
            ...stateDiagram.metadata,
        },
    };
}

/** Convert state to diagram nodes (handles composite states) */
function convertStateToNodes(
    state: IRState,
    nodes: DiagramNode[],
    groups: DiagramGroup[]
): void {
    const shape = getShapeForStateType(state.type);

    // Build label with actions if present
    let label = state.label || state.id;
    if (state.description && state.description !== label) {
        label = state.description;
    }
    if (state.actions && state.actions.length > 0) {
        const actionLines = state.actions.map(a => `${a.type}/${a.action}`);
        label = `${label}\n${actionLines.join('\n')}`;
    }

    const node: DiagramNode = {
        id: state.id,
        type: 'node',
        label,
        shape,
        position: state.position,
        size: state.size,
        style: state.style || {},
        metadata: {
            stateType: state.type,
            ...state.metadata,
        },
    };

    nodes.push(node);

    // Handle composite states
    if (state.children && state.children.length > 0) {
        const childIds: string[] = [];

        for (const child of state.children) {
            convertStateToNodes(child, nodes, groups);
            childIds.push(child.id);
        }

        groups.push({
            id: `group_${state.id}`,
            type: 'group',
            label: state.label || state.id,
            children: childIds,
            style: {},
            metadata: {
                compositeStateId: state.id,
            },
        });
    }
}

/** Map state type to node shape */
function getShapeForStateType(stateType: StateType): NodeShape {
    switch (stateType) {
        case 'start':
        case 'end':
            return 'circle';
        case 'fork':
        case 'join':
            return 'rectangle'; // Thin bar in actual rendering
        case 'choice':
            return 'diamond';
        case 'history':
        case 'deep-history':
            return 'circle';
        case 'composite':
        case 'state':
        default:
            return 'rounded-rectangle';
    }
}
