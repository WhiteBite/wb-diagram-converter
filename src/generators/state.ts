/**
 * Mermaid State Diagram Generator
 * 
 * Generates Mermaid stateDiagram-v2 syntax from IR
 */

import type { Diagram, DiagramNode, DiagramGroup } from '../types';
import type {
    IRStateDiagram,
    IRState,
    IRTransition,
    IRStateNote,
    StateDirection,
    StateType,
} from '../types/state';
import { generateId } from '../utils';

// =============================================================================
// Generator
// =============================================================================

/** Generate Mermaid state diagram from generic IR */
export function generateStateDiagram(diagram: Diagram): string {
    const stateDiagram = convertIRToStateDiagram(diagram);
    return generateStateDiagramCode(stateDiagram);
}

/** Generate Mermaid state diagram from state diagram IR */
export function generateStateDiagramCode(stateDiagram: IRStateDiagram): string {
    const lines: string[] = [];

    // Header
    lines.push('stateDiagram-v2');

    // Direction
    if (stateDiagram.direction && stateDiagram.direction !== 'TB') {
        lines.push(`    direction ${stateDiagram.direction}`);
    }

    // Track which states are in composite states
    const statesInComposites = new Set<string>();
    collectNestedStateIds(stateDiagram.states, statesInComposites);

    // Generate top-level states (not nested)
    for (const state of stateDiagram.states) {
        if (!isNestedState(state.id, stateDiagram.states)) {
            lines.push(...generateStateLines(state, 1));
        }
    }

    // Generate transitions
    for (const transition of stateDiagram.transitions) {
        lines.push(`    ${generateTransitionLine(transition)}`);
    }

    // Generate notes
    if (stateDiagram.notes) {
        for (const note of stateDiagram.notes) {
            lines.push(`    note ${note.position} of ${note.stateId} : ${note.text}`);
        }
    }

    return lines.join('\n');
}

// =============================================================================
// State Generation
// =============================================================================

/** Generate lines for a state */
function generateStateLines(state: IRState, indent: number): string[] {
    const lines: string[] = [];
    const prefix = '    '.repeat(indent);

    // Handle special state types
    if (state.type === 'start' || state.type === 'end') {
        // Start/end states are represented as [*] in transitions, not as definitions
        return lines;
    }

    if (state.type === 'fork' || state.type === 'join' || state.type === 'choice') {
        lines.push(`${prefix}state ${sanitizeStateId(state.id)} <<${state.type}>>`);
        return lines;
    }

    // Composite state
    if (state.children && state.children.length > 0) {
        const label = state.label && state.label !== state.id
            ? `"${escapeLabel(state.label)}" as `
            : '';
        lines.push(`${prefix}state ${label}${sanitizeStateId(state.id)} {`);

        // Generate child states
        for (const child of state.children) {
            lines.push(...generateStateLines(child, indent + 1));
        }

        lines.push(`${prefix}}`);
        return lines;
    }

    // Regular state with description
    if (state.description && state.description !== state.id) {
        lines.push(`${prefix}state "${escapeLabel(state.description)}" as ${sanitizeStateId(state.id)}`);
    } else if (state.label && state.label !== state.id) {
        lines.push(`${prefix}${sanitizeStateId(state.id)} : ${escapeLabel(state.label)}`);
    }

    // State actions
    if (state.actions && state.actions.length > 0) {
        for (const action of state.actions) {
            lines.push(`${prefix}${sanitizeStateId(state.id)} : ${action.type} / ${action.action}`);
        }
    }

    return lines;
}

/** Generate transition line */
function generateTransitionLine(transition: IRTransition): string {
    const source = formatStateRef(transition.source);
    const target = formatStateRef(transition.target);

    let line = `${source} --> ${target}`;

    // Add label
    if (transition.label) {
        line += ` : ${escapeLabel(transition.label)}`;
    } else if (transition.event || transition.guard || transition.action) {
        // Build label from components
        let label = transition.event || '';
        if (transition.guard) {
            label += `[${transition.guard}]`;
        }
        if (transition.action) {
            label += `/${transition.action}`;
        }
        if (label) {
            line += ` : ${label}`;
        }
    }

    return line;
}

/** Format state reference (handle start/end states) */
function formatStateRef(stateId: string): string {
    if (stateId.startsWith('__start_') || stateId.startsWith('__end_')) {
        return '[*]';
    }
    return sanitizeStateId(stateId);
}

// =============================================================================
// Conversion from Generic IR
// =============================================================================

/** Convert generic diagram IR to state diagram IR */
function convertIRToStateDiagram(diagram: Diagram): IRStateDiagram {
    const states: IRState[] = [];
    const transitions: IRTransition[] = [];
    const notes: IRStateNote[] = [];

    const stateMap = new Map<string, IRState>();
    const groupMap = new Map<string, DiagramGroup>();

    // Build group map
    for (const group of diagram.groups) {
        groupMap.set(group.id, group);
    }

    // Convert nodes to states
    for (const node of diagram.nodes) {
        // Skip note nodes
        if (node.shape === 'note' && node.metadata?.noteFor) {
            notes.push({
                id: node.id,
                stateId: node.metadata.noteFor as string,
                position: (node.metadata.notePosition as 'left' | 'right') || 'right',
                text: node.label,
            });
            continue;
        }

        const state = convertNodeToState(node);
        states.push(state);
        stateMap.set(node.id, state);
    }

    // Handle composite states from groups
    for (const group of diagram.groups) {
        const compositeStateId = group.metadata?.compositeStateId as string;
        if (compositeStateId && stateMap.has(compositeStateId)) {
            const compositeState = stateMap.get(compositeStateId)!;
            compositeState.type = 'composite';
            compositeState.children = [];

            for (const childId of group.children) {
                const childState = stateMap.get(childId);
                if (childState) {
                    compositeState.children.push(childState);
                }
            }
        }
    }

    // Convert edges to transitions
    for (const edge of diagram.edges) {
        transitions.push({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            label: edge.label,
        });
    }

    // Get direction from metadata
    const direction = (diagram.metadata?.direction as StateDirection) || 'TB';

    return {
        id: diagram.id,
        title: diagram.name,
        direction,
        states: filterTopLevelStates(states, diagram.groups),
        transitions,
        notes: notes.length > 0 ? notes : undefined,
    };
}

/** Convert diagram node to state */
function convertNodeToState(node: DiagramNode): IRState {
    let stateType: StateType = 'state';

    // Determine state type from metadata or shape
    if (node.metadata?.stateType) {
        stateType = node.metadata.stateType as StateType;
    } else {
        switch (node.shape) {
            case 'circle':
                // Could be start, end, or history - check label
                if (node.label === '[*]') {
                    // Determine from context (would need edge info)
                    stateType = 'state'; // Default, will be refined
                }
                break;
            case 'diamond':
                stateType = 'choice';
                break;
            case 'rounded-rectangle':
            default:
                stateType = 'state';
        }
    }

    return {
        id: node.id,
        type: stateType,
        label: node.label,
        position: node.position,
        size: node.size,
        style: node.style,
        metadata: node.metadata,
    };
}

/** Filter to get only top-level states (not nested in composites) */
function filterTopLevelStates(states: IRState[], groups: DiagramGroup[]): IRState[] {
    const nestedIds = new Set<string>();

    for (const group of groups) {
        if (group.metadata?.compositeStateId) {
            for (const childId of group.children) {
                nestedIds.add(childId);
            }
        }
    }

    return states.filter(s => !nestedIds.has(s.id));
}

// =============================================================================
// Utility Functions
// =============================================================================

/** Sanitize state ID for Mermaid */
function sanitizeStateId(id: string): string {
    // Replace non-alphanumeric characters
    let safe = id.replace(/[^a-zA-Z0-9_]/g, '_');

    // Ensure starts with letter
    if (!/^[a-zA-Z]/.test(safe)) {
        safe = 's_' + safe;
    }

    return safe;
}

/** Escape label for Mermaid */
function escapeLabel(label: string): string {
    return label
        .replace(/"/g, "'")
        .replace(/\n/g, ' ')
        .replace(/:/g, '-')
        .trim();
}

/** Collect all nested state IDs */
function collectNestedStateIds(states: IRState[], nestedIds: Set<string>): void {
    for (const state of states) {
        if (state.children) {
            for (const child of state.children) {
                nestedIds.add(child.id);
                collectNestedStateIds([child], nestedIds);
            }
        }
    }
}

/** Check if state is nested in another state */
function isNestedState(stateId: string, allStates: IRState[]): boolean {
    for (const state of allStates) {
        if (state.children) {
            for (const child of state.children) {
                if (child.id === stateId) {
                    return true;
                }
                if (isNestedState(stateId, [child])) {
                    return true;
                }
            }
        }
    }
    return false;
}
