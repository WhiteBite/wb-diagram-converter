/**
 * State Diagram Types
 * 
 * Types for Mermaid stateDiagram-v2 support
 */

import type { NodeStyle, EdgeStyle, Position, Size } from './ir';

// =============================================================================
// State Types
// =============================================================================

/** State type variants */
export type StateType =
    | 'state'           // Regular state
    | 'start'           // Initial state [*]
    | 'end'             // Final state [*]
    | 'fork'            // Fork pseudo-state
    | 'join'            // Join pseudo-state
    | 'choice'          // Choice pseudo-state <<choice>>
    | 'history'         // History state [H]
    | 'deep-history'    // Deep history state [H*]
    | 'composite';      // Composite state (has children)

/** State in a state diagram */
export interface IRState {
    id: string;
    type: StateType;
    label?: string;
    description?: string;
    /** Child states for composite states */
    children?: IRState[];
    /** Internal actions (entry/exit/do) */
    actions?: StateAction[];
    position?: Position;
    size?: Size;
    style?: NodeStyle;
    metadata?: Record<string, unknown>;
}

/** State action types */
export type StateActionType = 'entry' | 'exit' | 'do';

/** Internal state action */
export interface StateAction {
    type: StateActionType;
    action: string;
}

// =============================================================================
// Transition Types
// =============================================================================

/** Transition between states */
export interface IRTransition {
    id: string;
    source: string;           // Source state ID
    target: string;           // Target state ID
    /** Transition label (event/guard/action) */
    label?: string;
    /** Event that triggers transition */
    event?: string;
    /** Guard condition */
    guard?: string;
    /** Action to execute */
    action?: string;
    style?: EdgeStyle;
    metadata?: Record<string, unknown>;
}

// =============================================================================
// Note Types
// =============================================================================

/** Note position relative to state */
export type StateNotePosition = 'left' | 'right';

/** Note attached to a state */
export interface IRStateNote {
    id: string;
    /** State ID this note is attached to */
    stateId: string;
    position: StateNotePosition;
    text: string;
}

// =============================================================================
// State Diagram
// =============================================================================

/** Direction for state diagram layout */
export type StateDirection = 'TB' | 'BT' | 'LR' | 'RL';

/** Complete state diagram representation */
export interface IRStateDiagram {
    id: string;
    title?: string;
    direction?: StateDirection;
    states: IRState[];
    transitions: IRTransition[];
    notes?: IRStateNote[];
    metadata?: Record<string, unknown>;
}

// =============================================================================
// Utility Functions
// =============================================================================

/** Check if state is a pseudo-state */
export function isPseudoState(state: IRState): boolean {
    return ['start', 'end', 'fork', 'join', 'choice', 'history', 'deep-history'].includes(state.type);
}

/** Check if state is composite (has children) */
export function isCompositeState(state: IRState): boolean {
    return state.type === 'composite' || (state.children !== undefined && state.children.length > 0);
}

/** Create a start state */
export function createStartState(id: string = '[*]_start'): IRState {
    return {
        id,
        type: 'start',
        label: '[*]',
    };
}

/** Create an end state */
export function createEndState(id: string = '[*]_end'): IRState {
    return {
        id,
        type: 'end',
        label: '[*]',
    };
}

/** Create a regular state */
export function createState(id: string, label?: string): IRState {
    return {
        id,
        type: 'state',
        label: label || id,
    };
}

/** Create a fork state */
export function createForkState(id: string): IRState {
    return {
        id,
        type: 'fork',
        label: id,
    };
}

/** Create a join state */
export function createJoinState(id: string): IRState {
    return {
        id,
        type: 'join',
        label: id,
    };
}

/** Create a choice state */
export function createChoiceState(id: string): IRState {
    return {
        id,
        type: 'choice',
        label: id,
    };
}

/** Create a composite state */
export function createCompositeState(id: string, label?: string, children: IRState[] = []): IRState {
    return {
        id,
        type: 'composite',
        label: label || id,
        children,
    };
}
