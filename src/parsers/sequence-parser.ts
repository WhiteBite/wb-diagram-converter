/**
 * Sequence Diagram Parser
 * 
 * Parses Mermaid sequenceDiagram syntax to IR
 */

import type {
    IRSequenceDiagram,
    IRParticipant,
    IRMessage,
    IRNote,
    IRBlock,
    IRBlockSection,
    SequenceElement,
    SequenceArrowType,
    ParticipantType,
    NotePosition,
    BlockType,
} from '../types/sequence';
import { generateId } from '../utils';
import { validateInput } from './base';

// =============================================================================
// Arrow Patterns
// =============================================================================

/** Map Mermaid arrow syntax to SequenceArrowType */
const ARROW_MAP: Record<string, SequenceArrowType> = {
    '->': 'solid',
    '->>': 'solid-arrow',
    '-x': 'solid-cross',
    '--x': 'dotted-cross',
    '-->': 'dotted',
    '-->>': 'dotted-arrow',
};

/** Regex pattern for arrows */
const ARROW_PATTERN = /(->>|-->>|-x|--x|-->|->)/;

// =============================================================================
// Block Keywords
// =============================================================================

const BLOCK_KEYWORDS: Record<string, BlockType> = {
    'loop': 'loop',
    'alt': 'alt',
    'opt': 'opt',
    'par': 'par',
    'critical': 'critical',
    'break': 'break',
    'rect': 'rect',
};

// =============================================================================
// Main Parser
// =============================================================================

/** Parse Mermaid sequenceDiagram to IR */
export function parseSequenceDiagram(source: string): IRSequenceDiagram {
    validateInput(source, 'mermaid');

    const lines = source.trim().split('\n');
    const participants: IRParticipant[] = [];
    const participantMap = new Map<string, IRParticipant>();
    const elements: SequenceElement[] = [];
    
    let title: string | undefined;
    const blockStack: { block: IRBlock; currentSection: IRBlockSection }[] = [];

    for (const rawLine of lines) {
        const line = rawLine.trim();

        // Skip empty lines and comments
        if (!line || line.startsWith('%%')) {
            continue;
        }

        // Skip diagram declaration
        if (line.toLowerCase().startsWith('sequencediagram')) {
            continue;
        }

        // Parse title
        const titleMatch = line.match(/^title\s*:\s*(.+)$/i);
        if (titleMatch) {
            title = titleMatch[1].trim();
            continue;
        }

        // Parse participant/actor
        const participantMatch = line.match(/^(participant|actor)\s+(\w+)(?:\s+as\s+(.+))?$/i);
        if (participantMatch) {
            const [, typeStr, id, alias] = participantMatch;
            const type: ParticipantType = typeStr.toLowerCase() === 'actor' ? 'actor' : 'participant';
            const participant = createParticipant(id, alias || id, type, alias);
            
            if (!participantMap.has(id)) {
                participants.push(participant);
                participantMap.set(id, participant);
            }
            continue;
        }

        // Parse activation/deactivation
        const activateMatch = line.match(/^(activate|deactivate)\s+(\w+)$/i);
        if (activateMatch) {
            const [, action, participantId] = activateMatch;
            ensureParticipant(participantId, participants, participantMap);
            
            const element: SequenceElement = {
                kind: 'activation',
                data: { id: generateId(), participant: participantId },
                action: action.toLowerCase() as 'activate' | 'deactivate',
            };
            addElement(element, blockStack, elements);
            continue;
        }

        // Parse note
        const noteMatch = line.match(/^note\s+(left|right|over)\s+(?:of\s+)?([^:]+):\s*(.+)$/i);
        if (noteMatch) {
            const [, positionStr, participantsStr, text] = noteMatch;
            const position = positionStr.toLowerCase() as NotePosition;
            const noteParticipants = participantsStr.split(',').map(p => p.trim());
            
            // Ensure all participants exist
            for (const p of noteParticipants) {
                ensureParticipant(p, participants, participantMap);
            }
            
            const note: IRNote = {
                id: generateId(),
                position,
                participants: noteParticipants,
                text: text.trim(),
            };
            
            const element: SequenceElement = { kind: 'note', data: note };
            addElement(element, blockStack, elements);
            continue;
        }

        // Parse block start (loop, alt, opt, par, critical, break, rect)
        const blockStartMatch = line.match(/^(loop|alt|opt|par|critical|break|rect)\s*(.*)$/i);
        if (blockStartMatch) {
            const [, keyword, label] = blockStartMatch;
            const blockType = BLOCK_KEYWORDS[keyword.toLowerCase()];
            
            const block: IRBlock = {
                id: generateId(),
                type: blockType,
                label: label.trim() || undefined,
                sections: [{ elements: [] }],
            };
            
            blockStack.push({ block, currentSection: block.sections[0] });
            continue;
        }

        // Parse else/and (section separator in alt/par)
        const sectionMatch = line.match(/^(else|and)\s*(.*)$/i);
        if (sectionMatch && blockStack.length > 0) {
            const [, , label] = sectionMatch;
            const current = blockStack[blockStack.length - 1];
            
            // Create new section
            const newSection: IRBlockSection = {
                label: label.trim() || undefined,
                elements: [],
            };
            current.block.sections.push(newSection);
            current.currentSection = newSection;
            continue;
        }

        // Parse end (block end)
        if (line.toLowerCase() === 'end') {
            if (blockStack.length > 0) {
                const completed = blockStack.pop()!;
                const element: SequenceElement = { kind: 'block', data: completed.block };
                addElement(element, blockStack, elements);
            }
            continue;
        }

        // Parse message: A->>B: Message text
        const messageMatch = parseMessageLine(line);
        if (messageMatch) {
            const { from, to, arrow, label } = messageMatch;
            
            // Ensure participants exist
            ensureParticipant(from, participants, participantMap);
            ensureParticipant(to, participants, participantMap);
            
            const message: IRMessage = {
                id: generateId(),
                from,
                to,
                label: label || '',
                arrowType: ARROW_MAP[arrow] || 'solid-arrow',
            };
            
            const element: SequenceElement = { kind: 'message', data: message };
            addElement(element, blockStack, elements);
            continue;
        }

        // Parse message with activation: A->>+B: Message (activate B)
        const messageActivateMatch = parseMessageWithActivation(line);
        if (messageActivateMatch) {
            const { from, to, arrow, label, activateTarget, deactivateSource } = messageActivateMatch;
            
            ensureParticipant(from, participants, participantMap);
            ensureParticipant(to, participants, participantMap);
            
            // Add deactivation if needed
            if (deactivateSource) {
                const deactivateElement: SequenceElement = {
                    kind: 'activation',
                    data: { id: generateId(), participant: from },
                    action: 'deactivate',
                };
                addElement(deactivateElement, blockStack, elements);
            }
            
            // Add message
            const message: IRMessage = {
                id: generateId(),
                from,
                to,
                label: label || '',
                arrowType: ARROW_MAP[arrow] || 'solid-arrow',
            };
            addElement({ kind: 'message', data: message }, blockStack, elements);
            
            // Add activation if needed
            if (activateTarget) {
                const activateElement: SequenceElement = {
                    kind: 'activation',
                    data: { id: generateId(), participant: to },
                    action: 'activate',
                };
                addElement(activateElement, blockStack, elements);
            }
            continue;
        }
    }

    return {
        id: generateId(),
        title,
        participants,
        elements,
        metadata: { source: 'mermaid' },
    };
}

// =============================================================================
// Helper Functions
// =============================================================================

/** Create a participant */
function createParticipant(
    id: string,
    label: string,
    type: ParticipantType,
    alias?: string
): IRParticipant {
    return { id, type, label, alias };
}

/** Ensure participant exists, create if not */
function ensureParticipant(
    id: string,
    participants: IRParticipant[],
    participantMap: Map<string, IRParticipant>
): void {
    if (!participantMap.has(id)) {
        const participant = createParticipant(id, id, 'participant');
        participants.push(participant);
        participantMap.set(id, participant);
    }
}

/** Add element to current context (block or root) */
function addElement(
    element: SequenceElement,
    blockStack: { block: IRBlock; currentSection: IRBlockSection }[],
    rootElements: SequenceElement[]
): void {
    if (blockStack.length > 0) {
        const current = blockStack[blockStack.length - 1];
        current.currentSection.elements.push(element);
    } else {
        rootElements.push(element);
    }
}

/** Parse message line: A->>B: Message */
function parseMessageLine(line: string): { from: string; to: string; arrow: string; label?: string } | null {
    // Pattern: participant arrow participant : label
    const match = line.match(/^(\w+)\s*(->>|-->>|-x|--x|-->|->)\s*(\w+)\s*(?::\s*(.*))?$/);
    if (!match) return null;
    
    const [, from, arrow, to, label] = match;
    return { from, to, arrow, label: label?.trim() };
}

/** Parse message with activation markers: A->>+B or A-->>-B */
function parseMessageWithActivation(line: string): {
    from: string;
    to: string;
    arrow: string;
    label?: string;
    activateTarget: boolean;
    deactivateSource: boolean;
} | null {
    // Pattern: participant arrow [+-]participant : label
    const match = line.match(/^(\w+)\s*(->>|-->>|-x|--x|-->|->)\s*([+-]?)(\w+)\s*(?::\s*(.*))?$/);
    if (!match) return null;
    
    const [, from, arrow, modifier, to, label] = match;
    
    // Check for source deactivation (- before arrow)
    const sourceMatch = line.match(/^(\w+)\s*(-)\s*(->>|-->>|-x|--x|-->|->)/);
    const deactivateSource = !!sourceMatch;
    
    return {
        from,
        to,
        arrow,
        label: label?.trim(),
        activateTarget: modifier === '+',
        deactivateSource: modifier === '-' || deactivateSource,
    };
}

/** Alias for backward compatibility */
export const parseSequence = parseSequenceDiagram;
