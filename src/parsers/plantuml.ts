/**
 * PlantUML parser
 * 
 * Parses PlantUML syntax to IR:
 * - Component/Activity diagrams
 * - Sequence diagrams
 * - Class diagrams
 * - Notes
 */

import type { Diagram, DiagramNode, DiagramEdge, DiagramGroup, NodeShape, ArrowConfig } from '../types';
import { createEmptyDiagram, createNode, createEdge, createGroup, validateInput } from './base';

/** Diagram type detection */
type PlantUMLDiagramType = 'component' | 'sequence' | 'class' | 'activity' | 'usecase';

/** Note attachment info */
interface NoteInfo {
    id: string;
    text: string;
    attachTo?: string;
    position?: 'left' | 'right' | 'top' | 'bottom';
}

/** Parse PlantUML to IR diagram */
export function parsePlantUML(source: string): Diagram {
    validateInput(source, 'plantuml');

    const diagramType = detectDiagramType(source);

    switch (diagramType) {
        case 'sequence':
            return parseSequenceDiagram(source);
        case 'class':
            return parseClassDiagram(source);
        default:
            return parseComponentDiagram(source);
    }
}

/** Detect diagram type from source */
function detectDiagramType(source: string): PlantUMLDiagramType {
    const lower = source.toLowerCase();

    // Sequence diagram indicators
    if (lower.includes('->') && (lower.includes('participant') || lower.includes('actor'))) {
        if (lower.includes('activate') || lower.includes('deactivate') ||
            /\w+\s*->\s*\w+\s*:/.test(source)) {
            return 'sequence';
        }
    }

    // Class diagram indicators
    if (lower.includes('class ') || lower.includes('interface ') ||
        lower.includes('abstract ') || lower.includes('<|--') ||
        lower.includes('--|>') || lower.includes('{field}') ||
        lower.includes('{method}')) {
        return 'class';
    }

    // Activity diagram indicators
    if (lower.includes('start') && lower.includes('stop') &&
        (lower.includes(':') && lower.includes(';'))) {
        return 'activity';
    }

    // Use case diagram
    if (lower.includes('usecase') || (lower.includes('actor') && lower.includes('('))) {
        return 'usecase';
    }

    return 'component';
}

/** Parse sequence diagram */
function parseSequenceDiagram(source: string): Diagram {
    const diagram = createEmptyDiagram('sequence', 'plantuml');
    const lines = getCleanLines(source);

    const participants = new Map<string, DiagramNode>();
    const notes: NoteInfo[] = [];
    let noteBuffer: string[] = [];
    let inNote = false;
    let currentNoteAttach: { target?: string; position?: string } = {};
    let messageIndex = 0;

    for (const line of lines) {
        // Note start
        const noteStartMatch = line.match(/^note\s+(left|right|over)\s*(?:of\s+)?(\w+)?(?:\s*:\s*(.+))?$/i);
        if (noteStartMatch) {
            const [, position, target, inlineText] = noteStartMatch;
            if (inlineText) {
                // Inline note
                const noteId = `note_${notes.length}`;
                notes.push({
                    id: noteId,
                    text: inlineText,
                    attachTo: target,
                    position: position.toLowerCase() as NoteInfo['position'],
                });
            } else {
                inNote = true;
                currentNoteAttach = { target, position: position.toLowerCase() };
                noteBuffer = [];
            }
            continue;
        }

        // Note end
        if (line === 'end note' && inNote) {
            const noteId = `note_${notes.length}`;
            notes.push({
                id: noteId,
                text: noteBuffer.join('\n'),
                attachTo: currentNoteAttach.target,
                position: currentNoteAttach.position as NoteInfo['position'],
            });
            inNote = false;
            noteBuffer = [];
            continue;
        }

        // Inside note
        if (inNote) {
            noteBuffer.push(line);
            continue;
        }

        // Participant/Actor definition
        const participantMatch = line.match(/^(participant|actor)\s+"?([^"]+)"?\s+as\s+(\w+)/i) ||
            line.match(/^(participant|actor)\s+(\w+)/i);
        if (participantMatch) {
            const [, type, labelOrId, alias] = participantMatch;
            const id = alias || labelOrId;
            const label = alias ? labelOrId : id;

            if (!participants.has(id)) {
                const node = createNode(id, label, {
                    shape: type.toLowerCase() === 'actor' ? 'actor' : 'rectangle',
                });
                participants.set(id, node);
                diagram.nodes.push(node);
            }
            continue;
        }

        // Message: A -> B : text
        const messageMatch = line.match(/^(\w+)\s*(-+>+|<-+|->+x|x<-+|-+>>|<<-+|\.+>|<\.+)\s*(\w+)\s*(?::\s*(.+))?$/);
        if (messageMatch) {
            const [, from, arrow, to, label] = messageMatch;

            // Ensure participants exist
            ensureParticipant(from, participants, diagram);
            ensureParticipant(to, participants, diagram);

            const edge = createEdge(from, to, {
                label: label?.trim(),
                arrow: parseSequenceArrow(arrow),
            });
            edge.metadata = { order: messageIndex++ };
            diagram.edges.push(edge);
            continue;
        }

        // Activation/Deactivation (store as metadata)
        const activateMatch = line.match(/^(activate|deactivate)\s+(\w+)/i);
        if (activateMatch) {
            const [, action, target] = activateMatch;
            ensureParticipant(target, participants, diagram);
            // Store activation info in diagram metadata
            if (!diagram.metadata) diagram.metadata = { source: 'plantuml' };
            const meta = diagram.metadata as Record<string, unknown>;
            if (!meta.activations) meta.activations = [];
            (meta.activations as Array<{ action: string; target: string; order: number }>).push({
                action: action.toLowerCase(),
                target,
                order: messageIndex
            });
            continue;
        }
    }

    // Add notes as special nodes
    for (const note of notes) {
        const noteNode = createNode(note.id, note.text, {
            shape: 'note',
        });
        noteNode.metadata = {
            isNote: true,
            attachTo: note.attachTo,
            position: note.position,
        };
        diagram.nodes.push(noteNode);
    }

    return diagram;
}

/** Parse class diagram */
function parseClassDiagram(source: string): Diagram {
    const diagram = createEmptyDiagram('class', 'plantuml');
    const lines = getCleanLines(source);

    const classes = new Map<string, DiagramNode>();
    const notes: NoteInfo[] = [];
    let currentClass: { id: string; members: string[]; methods: string[] } | null = null;
    let noteBuffer: string[] = [];
    let inNote = false;
    let currentNoteAttach: string | undefined;

    for (const line of lines) {
        // Note handling
        const noteMatch = line.match(/^note\s+"([^"]+)"\s+as\s+(\w+)/i) ||
            line.match(/^note\s+(left|right|top|bottom)\s+of\s+(\w+)\s*:\s*(.+)/i);
        if (noteMatch) {
            if (noteMatch[3]) {
                // Inline note with position
                notes.push({
                    id: `note_${notes.length}`,
                    text: noteMatch[3],
                    attachTo: noteMatch[2],
                    position: noteMatch[1].toLowerCase() as NoteInfo['position'],
                });
            } else {
                // Named note
                notes.push({
                    id: noteMatch[2],
                    text: noteMatch[1],
                });
            }
            continue;
        }

        // Multi-line note start
        const noteStartMatch = line.match(/^note\s+(left|right|top|bottom)\s+of\s+(\w+)$/i);
        if (noteStartMatch) {
            inNote = true;
            currentNoteAttach = noteStartMatch[2];
            noteBuffer = [];
            continue;
        }

        if (line === 'end note' && inNote) {
            notes.push({
                id: `note_${notes.length}`,
                text: noteBuffer.join('\n'),
                attachTo: currentNoteAttach,
            });
            inNote = false;
            continue;
        }

        if (inNote) {
            noteBuffer.push(line);
            continue;
        }

        // Class/Interface definition start
        const classMatch = line.match(/^(class|interface|abstract\s+class|abstract|enum)\s+"?([^"{]+)"?\s*(?:<<\s*(\w+)\s*>>)?\s*\{?$/i);
        if (classMatch) {
            const [, type, name, stereotype] = classMatch;
            const id = name.trim();

            currentClass = { id, members: [], methods: [] };

            const node = createNode(id, id, {
                shape: type.toLowerCase().includes('interface') ? 'ellipse' : 'rectangle',
            });
            node.metadata = {
                classType: type.toLowerCase().replace(/\s+/g, '-'),
                stereotype,
                members: currentClass.members,
                methods: currentClass.methods,
            };
            classes.set(id, node);
            diagram.nodes.push(node);
            continue;
        }

        // Simple class definition (no body)
        const simpleClassMatch = line.match(/^(class|interface)\s+(\w+)$/i);
        if (simpleClassMatch && !currentClass) {
            const [, type, name] = simpleClassMatch;
            const node = createNode(name, name, {
                shape: type.toLowerCase() === 'interface' ? 'ellipse' : 'rectangle',
            });
            node.metadata = { classType: type.toLowerCase() };
            classes.set(name, node);
            diagram.nodes.push(node);
            continue;
        }

        // Class body end
        if (line === '}' && currentClass) {
            // Update node metadata with collected members/methods
            const node = classes.get(currentClass.id);
            if (node) {
                node.metadata = {
                    ...node.metadata,
                    members: currentClass.members,
                    methods: currentClass.methods,
                };
            }
            currentClass = null;
            continue;
        }

        // Class member/method
        if (currentClass && line !== '{') {
            const memberMatch = line.match(/^([+\-#~])?\s*(\w+)\s*:\s*(\w+)$/);
            const methodMatch = line.match(/^([+\-#~])?\s*(\w+)\s*\(([^)]*)\)\s*(?::\s*(\w+))?$/);

            if (methodMatch) {
                const [, visibility, name, params, returnType] = methodMatch;
                currentClass.methods.push(`${visibility || '+'}${name}(${params})${returnType ? ': ' + returnType : ''}`);
            } else if (memberMatch) {
                const [, visibility, name, type] = memberMatch;
                currentClass.members.push(`${visibility || '+'}${name}: ${type}`);
            } else if (line.trim()) {
                // Generic member line
                currentClass.members.push(line);
            }
            continue;
        }

        // Relationship: A <|-- B, A --> B, etc.
        const relationMatch = line.match(/^(\w+)\s*([<>|.*o#x\-]+)\s*(\w+)(?:\s*:\s*(.+))?$/);
        if (relationMatch) {
            const [, from, arrow, to, label] = relationMatch;

            ensureClass(from, classes, diagram);
            ensureClass(to, classes, diagram);

            const edge = createEdge(from, to, {
                label: label?.trim(),
                arrow: parseClassArrow(arrow),
            });
            diagram.edges.push(edge);
        }
    }

    // Add notes
    for (const note of notes) {
        const noteNode = createNode(note.id, note.text, { shape: 'note' });
        noteNode.metadata = { isNote: true, attachTo: note.attachTo };
        diagram.nodes.push(noteNode);
    }

    return diagram;
}

/** Parse component/generic diagram */
function parseComponentDiagram(source: string): Diagram {
    const diagram = createEmptyDiagram('flowchart', 'plantuml');
    const lines = getCleanLines(source);

    const nodeMap = new Map<string, DiagramNode>();
    const groupStack: DiagramGroup[] = [];
    const notes: NoteInfo[] = [];
    let noteBuffer: string[] = [];
    let inNote = false;
    let currentNoteAttach: string | undefined;

    for (const line of lines) {
        // Note handling
        const noteMatch = line.match(/^note\s+(left|right|top|bottom)(?:\s+of\s+(\w+))?\s*:\s*(.+)$/i);
        if (noteMatch) {
            const [, position, target, text] = noteMatch;
            notes.push({
                id: `note_${notes.length}`,
                text,
                attachTo: target,
                position: position.toLowerCase() as NoteInfo['position'],
            });
            continue;
        }

        // Multi-line note
        const noteStartMatch = line.match(/^note\s+(left|right|top|bottom)(?:\s+of\s+(\w+))?$/i);
        if (noteStartMatch) {
            inNote = true;
            currentNoteAttach = noteStartMatch[2];
            noteBuffer = [];
            continue;
        }

        if (line === 'end note' && inNote) {
            notes.push({
                id: `note_${notes.length}`,
                text: noteBuffer.join('\n'),
                attachTo: currentNoteAttach,
            });
            inNote = false;
            continue;
        }

        if (inNote) {
            noteBuffer.push(line);
            continue;
        }

        // Parse direction
        if (line === 'left to right direction') {
            diagram.metadata = { source: 'plantuml', ...diagram.metadata, direction: 'LR' };
            continue;
        }
        if (line === 'top to bottom direction') {
            diagram.metadata = { source: 'plantuml', ...diagram.metadata, direction: 'TB' };
            continue;
        }

        // Parse package/group start
        const packageMatch = line.match(/^(package|rectangle|frame|folder|node|namespace)\s+"([^"]+)"\s*(?:as\s+(\w+))?\s*\{?$/i) ||
            line.match(/^(package|rectangle|frame|folder|node|namespace)\s+(\w+)\s*\{?$/i);
        if (packageMatch) {
            const [, , labelOrId, alias] = packageMatch;
            const id = alias || sanitizeId(labelOrId);
            const label = labelOrId;
            const group = createGroup(id, [], { label });
            diagram.groups.push(group);
            groupStack.push(group);
            continue;
        }

        // Parse group end
        if (line === '}') {
            groupStack.pop();
            continue;
        }

        // Parse node definition
        const nodeResult = parseNodeLine(line);
        if (nodeResult && !nodeMap.has(nodeResult.id)) {
            nodeMap.set(nodeResult.id, nodeResult);
            diagram.nodes.push(nodeResult);

            if (groupStack.length > 0) {
                groupStack[groupStack.length - 1].children.push(nodeResult.id);
            }
            continue;
        }

        // Parse edge/relationship
        const edgeResult = parseEdgeLine(line, nodeMap, diagram);
        if (edgeResult) {
            diagram.edges.push(edgeResult);
        }
    }

    // Add notes
    for (const note of notes) {
        const noteNode = createNode(note.id, note.text, { shape: 'note' });
        noteNode.metadata = { isNote: true, attachTo: note.attachTo, position: note.position };
        diagram.nodes.push(noteNode);
    }

    return diagram;
}

/** Get clean lines from source */
function getCleanLines(source: string): string[] {
    const lines = source.trim().split('\n');
    const result: string[] = [];
    let inDiagram = false;

    for (const rawLine of lines) {
        const line = rawLine.trim();

        // Skip empty lines and single-line comments
        if (!line || line.startsWith("'")) continue;

        // Detect diagram start/end
        if (line.startsWith('@startuml')) {
            inDiagram = true;
            continue;
        }
        if (line.startsWith('@enduml')) {
            inDiagram = false;
            continue;
        }

        if (!inDiagram) continue;

        // Skip directives
        if (line.startsWith('skinparam') || line.startsWith('!') || line.startsWith('hide')) {
            continue;
        }

        result.push(line);
    }

    return result;
}

/** Ensure participant exists in sequence diagram */
function ensureParticipant(
    id: string,
    participants: Map<string, DiagramNode>,
    diagram: Diagram
): void {
    if (!participants.has(id)) {
        const node = createNode(id, id, { shape: 'rectangle' });
        participants.set(id, node);
        diagram.nodes.push(node);
    }
}

/** Ensure class exists in class diagram */
function ensureClass(
    id: string,
    classes: Map<string, DiagramNode>,
    diagram: Diagram
): void {
    if (!classes.has(id)) {
        const node = createNode(id, id, { shape: 'rectangle' });
        node.metadata = { classType: 'class' };
        classes.set(id, node);
        diagram.nodes.push(node);
    }
}

/** Parse sequence diagram arrow */
function parseSequenceArrow(arrow: string): ArrowConfig {
    const config: ArrowConfig = {
        sourceType: 'none',
        targetType: 'arrow',
        lineType: 'solid',
    };

    // Dotted line
    if (arrow.includes('.')) {
        config.lineType = 'dashed';
    }

    // Lost message (x)
    if (arrow.includes('x')) {
        config.targetType = 'cross';
    }

    // Async (>>)
    if (arrow.includes('>>')) {
        config.targetType = 'open';
    }

    // Bidirectional
    if (arrow.startsWith('<') && arrow.endsWith('>')) {
        config.sourceType = 'arrow';
    } else if (arrow.startsWith('<')) {
        // Reverse direction
        config.sourceType = 'arrow';
        config.targetType = 'none';
    }

    return config;
}

/** Parse class diagram arrow */
function parseClassArrow(arrow: string): ArrowConfig {
    const config: ArrowConfig = {
        sourceType: 'none',
        targetType: 'arrow',
        lineType: 'solid',
    };

    // Dotted line
    if (arrow.includes('.')) {
        config.lineType = 'dashed';
    }

    // Inheritance <|--
    if (arrow.includes('<|') || arrow.includes('|>')) {
        config.targetType = 'diamond';
        if (arrow.includes('<|')) {
            config.sourceType = 'diamond';
            config.targetType = 'none';
        }
    }

    // Composition *--
    if (arrow.includes('*')) {
        if (arrow.startsWith('*')) {
            config.sourceType = 'diamond-filled';
        } else {
            config.targetType = 'diamond-filled';
        }
    }

    // Aggregation o--
    if (arrow.includes('o')) {
        if (arrow.startsWith('o')) {
            config.sourceType = 'circle';
        } else {
            config.targetType = 'circle';
        }
    }

    // Dependency ..>
    if (arrow.includes('>') && !arrow.includes('|>')) {
        config.targetType = 'arrow';
    }

    return config;
}

/** Parse node definition line */
function parseNodeLine(line: string): DiagramNode | null {
    // Pattern: shape "label" as alias
    // Examples:
    //   rectangle "My Box" as box1
    //   actor "User" as user
    //   database "DB" as db
    //   circle "Start" as start

    const patterns = [
        // shape "label" as alias [style]
        /^(rectangle|actor|database|cloud|file|circle|diamond|hexagon|card|usecase|component|interface|storage)\s+"([^"]+)"\s+as\s+(\w+)/i,
        // shape alias [style]
        /^(rectangle|actor|database|cloud|file|circle|diamond|hexagon|card|usecase|component|interface|storage)\s+(\w+)/i,
    ];

    for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
            if (match.length === 4) {
                // shape "label" as alias
                const [, shapeStr, label, alias] = match;
                return createNode(alias, label, {
                    shape: mapPlantUMLShape(shapeStr.toLowerCase()),
                });
            } else {
                // shape alias (alias is also label)
                const [, shapeStr, alias] = match;
                return createNode(alias, alias, {
                    shape: mapPlantUMLShape(shapeStr.toLowerCase()),
                });
            }
        }
    }

    return null;
}

/** Parse edge/relationship line */
function parseEdgeLine(
    line: string,
    nodeMap: Map<string, DiagramNode>,
    diagram: Diagram
): DiagramEdge | null {
    // Patterns:
    //   A --> B
    //   A --> B : label
    //   A ..> B
    //   A --o B
    //   A <--> B

    const edgePattern = /^(\w+)\s*([<>o*x|.-]+)\s*(\w+)(?:\s*:\s*(.+))?$/;
    const match = line.match(edgePattern);

    if (!match) return null;

    const [, sourceId, arrowStr, targetId, label] = match;

    // Ensure nodes exist (create if not)
    ensureNode(sourceId, nodeMap, diagram);
    ensureNode(targetId, nodeMap, diagram);

    const arrow = parsePlantUMLArrow(arrowStr);

    return createEdge(sourceId, targetId, {
        label: label?.trim(),
        arrow,
    });
}

/** Ensure node exists, create if not */
function ensureNode(
    id: string,
    nodeMap: Map<string, DiagramNode>,
    diagram: Diagram
): void {
    if (!nodeMap.has(id)) {
        const node = createNode(id, id);
        nodeMap.set(id, node);
        diagram.nodes.push(node);
    }
}

/** Parse PlantUML arrow syntax */
function parsePlantUMLArrow(arrow: string): ArrowConfig {
    const config: ArrowConfig = {
        sourceType: 'none',
        targetType: 'arrow',
        lineType: 'solid',
    };

    // Detect line type
    if (arrow.includes('..')) {
        config.lineType = 'dashed';
    } else if (arrow.includes('--')) {
        config.lineType = 'solid';
    }

    // Detect source arrow
    if (arrow.startsWith('<|')) {
        config.sourceType = 'diamond';
    } else if (arrow.startsWith('<')) {
        config.sourceType = 'arrow';
    } else if (arrow.startsWith('o')) {
        config.sourceType = 'circle';
    } else if (arrow.startsWith('*')) {
        config.sourceType = 'diamond-filled';
    } else if (arrow.startsWith('x')) {
        config.sourceType = 'cross';
    }

    // Detect target arrow
    if (arrow.endsWith('|>')) {
        config.targetType = 'diamond';
    } else if (arrow.endsWith('>')) {
        config.targetType = 'arrow';
    } else if (arrow.endsWith('o')) {
        config.targetType = 'circle';
    } else if (arrow.endsWith('*')) {
        config.targetType = 'diamond-filled';
    } else if (arrow.endsWith('x')) {
        config.targetType = 'cross';
    } else if (!arrow.endsWith('>')) {
        config.targetType = 'none';
    }

    return config;
}

/** Map PlantUML shape to IR shape */
function mapPlantUMLShape(shape: string): NodeShape {
    const shapeMap: Record<string, NodeShape> = {
        'rectangle': 'rectangle',
        'actor': 'actor',
        'database': 'cylinder',
        'storage': 'cylinder',
        'cloud': 'cloud',
        'file': 'document',
        'circle': 'circle',
        'diamond': 'diamond',
        'hexagon': 'hexagon',
        'card': 'rounded-rectangle',
        'usecase': 'ellipse',
        'component': 'rectangle',
        'interface': 'circle',
    };

    return shapeMap[shape] || 'rectangle';
}

/** Sanitize string for use as ID */
function sanitizeId(str: string): string {
    return str.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
}
