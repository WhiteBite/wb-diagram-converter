/**
 * Sequence Diagram Generator
 * 
 * Generates Mermaid sequenceDiagram syntax from IR
 */

import type {
    IRSequenceDiagram,
    IRParticipant,
    IRMessage,
    IRNote,
    IRBlock,
    SequenceElement,
    SequenceArrowType,
} from '../types/sequence';

// =============================================================================
// Arrow Mapping
// =============================================================================

/** Map SequenceArrowType to Mermaid syntax */
const ARROW_SYNTAX: Record<SequenceArrowType, string> = {
    'solid': '->',
    'solid-arrow': '->>',
    'solid-cross': '-x',
    'dotted': '-->',
    'dotted-arrow': '-->>',
    'dotted-cross': '--x',
};

// =============================================================================
// Main Generator
// =============================================================================

/** Generate Mermaid sequenceDiagram from IR */
export function generateSequenceDiagram(diagram: IRSequenceDiagram): string {
    const lines: string[] = [];

    // Header
    lines.push('sequenceDiagram');

    // Title
    if (diagram.title) {
        lines.push(`    title: ${diagram.title}`);
    }

    // Participants
    for (const participant of diagram.participants) {
        lines.push(`    ${generateParticipant(participant)}`);
    }

    // Add empty line after participants if there are any
    if (diagram.participants.length > 0) {
        lines.push('');
    }

    // Elements
    for (const element of diagram.elements) {
        const elementLines = generateElement(element, 1);
        lines.push(...elementLines);
    }

    return lines.join('\n');
}

// =============================================================================
// Element Generators
// =============================================================================

/** Generate participant declaration */
function generateParticipant(participant: IRParticipant): string {
    const keyword = participant.type === 'actor' ? 'actor' : 'participant';
    
    if (participant.alias && participant.alias !== participant.id) {
        return `${keyword} ${participant.id} as ${participant.alias}`;
    }
    
    if (participant.label !== participant.id) {
        return `${keyword} ${participant.id} as ${participant.label}`;
    }
    
    return `${keyword} ${participant.id}`;
}

/** Generate any sequence element */
function generateElement(element: SequenceElement, indentLevel: number): string[] {
    const indent = '    '.repeat(indentLevel);
    
    switch (element.kind) {
        case 'message':
            return [indent + generateMessage(element.data)];
        
        case 'activation':
            return [indent + `${element.action} ${element.data.participant}`];
        
        case 'note':
            return [indent + generateNote(element.data)];
        
        case 'block':
            return generateBlock(element.data, indentLevel);
        
        default:
            return [];
    }
}

/** Generate message line */
function generateMessage(message: IRMessage): string {
    const arrow = ARROW_SYNTAX[message.arrowType] || '->>';
    const label = message.label ? `: ${escapeLabel(message.label)}` : '';
    
    return `${message.from}${arrow}${message.to}${label}`;
}

/** Generate note */
function generateNote(note: IRNote): string {
    const position = note.position;
    const participants = note.participants.join(',');
    const text = escapeLabel(note.text);
    
    if (position === 'over') {
        return `note over ${participants}: ${text}`;
    }
    
    return `note ${position} of ${participants}: ${text}`;
}

/** Generate block (loop, alt, opt, par, etc.) */
function generateBlock(block: IRBlock, indentLevel: number): string[] {
    const lines: string[] = [];
    const indent = '    '.repeat(indentLevel);
    
    // Block start
    const label = block.label ? ` ${block.label}` : '';
    lines.push(`${indent}${block.type}${label}`);
    
    // Sections
    for (let i = 0; i < block.sections.length; i++) {
        const section = block.sections[i];
        
        // Add section separator for alt/par (else/and)
        if (i > 0) {
            const separator = block.type === 'par' ? 'and' : 'else';
            const sectionLabel = section.label ? ` ${section.label}` : '';
            lines.push(`${indent}${separator}${sectionLabel}`);
        }
        
        // Section elements
        for (const element of section.elements) {
            const elementLines = generateElement(element, indentLevel + 1);
            lines.push(...elementLines);
        }
    }
    
    // Block end
    lines.push(`${indent}end`);
    
    return lines;
}

// =============================================================================
// Utility Functions
// =============================================================================

/** Escape special characters in labels */
function escapeLabel(text: string): string {
    // Escape characters that might break Mermaid syntax
    return text
        .replace(/\n/g, ' ')
        .replace(/:/g, '&#58;')
        .trim();
}

/** Alias for backward compatibility */
export const generateSequence = generateSequenceDiagram;
