/**
 * Sequence Diagram Types
 * 
 * Types for representing sequence diagrams in IR format.
 * Supports Mermaid sequenceDiagram syntax.
 */

import type { DiagramMetadata } from './ir';

// =============================================================================
// Participant Types
// =============================================================================

/** Participant type in sequence diagram */
export type ParticipantType = 'participant' | 'actor';

/** Participant in sequence diagram */
export interface IRParticipant {
    id: string;
    type: ParticipantType;
    label: string;
    alias?: string;
}

// =============================================================================
// Message Types
// =============================================================================

/** Message arrow types for sequence diagrams */
export type SequenceArrowType =
    | 'solid'           // -> solid line without arrow
    | 'solid-arrow'     // ->> solid line with arrow
    | 'solid-cross'     // -x solid line with cross
    | 'dotted'          // --> dotted line without arrow
    | 'dotted-arrow'    // -->> dotted line with arrow
    | 'dotted-cross';   // --x dotted line with cross

/** Message between participants */
export interface IRMessage {
    id: string;
    from: string;           // Participant ID
    to: string;             // Participant ID
    label: string;
    arrowType: SequenceArrowType;
    isAsync?: boolean;      // Async message (open arrow)
}

// =============================================================================
// Activation Types
// =============================================================================

/** Activation on a participant lifeline */
export interface IRActivation {
    id: string;
    participant: string;    // Participant ID
    startMessageId?: string;
    endMessageId?: string;
}

// =============================================================================
// Note Types
// =============================================================================

/** Note position relative to participant(s) */
export type NotePosition = 'left' | 'right' | 'over';

/** Note in sequence diagram */
export interface IRNote {
    id: string;
    position: NotePosition;
    participants: string[]; // One or more participant IDs
    text: string;
}

// =============================================================================
// Block Types
// =============================================================================

/** Block type for control flow */
export type BlockType = 
    | 'loop'    // Loop block
    | 'alt'     // Alternative (if/else)
    | 'opt'     // Optional
    | 'par'     // Parallel
    | 'critical'// Critical section
    | 'break'   // Break
    | 'rect';   // Highlight rectangle

/** Section within a block (for alt/par) */
export interface IRBlockSection {
    label?: string;         // Condition label (e.g., "else", "[condition]")
    elements: SequenceElement[];
}

/** Control flow block */
export interface IRBlock {
    id: string;
    type: BlockType;
    label?: string;         // Block label/condition
    sections: IRBlockSection[];
}

// =============================================================================
// Sequence Element Union
// =============================================================================

/** Any element that can appear in a sequence diagram */
export type SequenceElement = 
    | { kind: 'message'; data: IRMessage }
    | { kind: 'activation'; data: IRActivation; action: 'activate' | 'deactivate' }
    | { kind: 'note'; data: IRNote }
    | { kind: 'block'; data: IRBlock };

// =============================================================================
// Sequence Diagram
// =============================================================================

/** Complete sequence diagram representation */
export interface IRSequenceDiagram {
    id: string;
    title?: string;
    participants: IRParticipant[];
    elements: SequenceElement[];
    metadata?: DiagramMetadata;
}

// =============================================================================
// Helper Functions
// =============================================================================

/** Create a participant */
export function createParticipant(
    id: string,
    label: string,
    type: ParticipantType = 'participant',
    alias?: string
): IRParticipant {
    return { id, type, label, alias };
}

/** Create a message */
export function createMessage(
    id: string,
    from: string,
    to: string,
    label: string,
    arrowType: SequenceArrowType = 'solid-arrow'
): IRMessage {
    return { id, from, to, label, arrowType };
}

/** Create a note */
export function createNote(
    id: string,
    position: NotePosition,
    participants: string[],
    text: string
): IRNote {
    return { id, position, participants, text };
}

/** Create a block */
export function createBlock(
    id: string,
    type: BlockType,
    label?: string,
    sections: IRBlockSection[] = []
): IRBlock {
    return { id, type, label, sections: sections.length > 0 ? sections : [{ elements: [] }] };
}

/** Create an empty sequence diagram */
export function createEmptySequenceDiagram(id: string, title?: string): IRSequenceDiagram {
    return {
        id,
        title,
        participants: [],
        elements: [],
        metadata: { source: 'sequence' },
    };
}
