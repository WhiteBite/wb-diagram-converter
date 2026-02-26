/**
 * Mermaid ER Diagram Parser
 * 
 * Parses Mermaid erDiagram syntax to IR
 * 
 * Syntax examples:
 *   erDiagram
 *     CUSTOMER ||--o{ ORDER : places
 *     CUSTOMER {
 *       string name
 *       string custNumber PK
 *       string sector
 *     }
 *     ORDER ||--|{ LINE-ITEM : contains
 *     ORDER {
 *       int orderNumber PK
 *       string deliveryAddress
 *     }
 */

import type { Diagram, DiagramNode, DiagramEdge } from '../types';
import type {
    IRERDiagram,
    IREntity,
    IRAttribute,
    IRRelationship,
    ERCardinality,
    ERIdentifying,
    ERAttributeKeyType,
} from '../types/er';
import { parseLeftCardinality, parseRightCardinality } from '../types/er';
import { generateId } from '../utils';
import { validateInput } from './base';

// =============================================================================
// Regex Patterns
// =============================================================================

/** Match erDiagram header */
const ER_HEADER_PATTERN = /^erDiagram\s*$/i;

/** Match relationship line: ENTITY1 ||--o{ ENTITY2 : "label" */
const RELATIONSHIP_PATTERN = /^(\w[\w-]*)\s*(\|o|\|\||\}o|\}[|])\s*(--|\.\.)\s*(o\||\|\||\o\{|\|\{)\s*(\w[\w-]*)\s*:\s*(.+)$/;

/** Match entity block start: ENTITY { */
const ENTITY_BLOCK_START = /^(\w[\w-]*)\s*\{$/;

/** Match attribute line: type name [PK|FK|UK] ["comment"] */
const ATTRIBUTE_PATTERN = /^\s*(\w+)\s+(\w+)(?:\s+(PK|FK|UK))?(?:\s+"([^"]*)")?$/;

/** Match entity block end */
const ENTITY_BLOCK_END = /^\s*\}$/;

// =============================================================================
// Parser
// =============================================================================

/** Parse Mermaid erDiagram to IR */
export function parseERDiagram(source: string): Diagram {
    validateInput(source, 'mermaid');

    const lines = source.trim().split('\n');
    const entities = new Map<string, IREntity>();
    const relationships: IRRelationship[] = [];

    let currentEntity: IREntity | null = null;
    let inEntityBlock = false;

    for (const rawLine of lines) {
        const line = rawLine.trim();

        // Skip empty lines and comments
        if (!line || line.startsWith('%%')) {
            continue;
        }

        // Skip erDiagram header
        if (ER_HEADER_PATTERN.test(line)) {
            continue;
        }

        // Handle entity block end
        if (ENTITY_BLOCK_END.test(line)) {
            if (currentEntity) {
                entities.set(currentEntity.id, currentEntity);
                currentEntity = null;
            }
            inEntityBlock = false;
            continue;
        }

        // Handle entity block start
        const blockStartMatch = line.match(ENTITY_BLOCK_START);
        if (blockStartMatch) {
            const entityName = blockStartMatch[1];
            currentEntity = getOrCreateEntity(entities, entityName);
            inEntityBlock = true;
            continue;
        }

        // Handle attribute inside entity block
        if (inEntityBlock && currentEntity) {
            const attrMatch = line.match(ATTRIBUTE_PATTERN);
            if (attrMatch) {
                const [, type, name, keyType, comment] = attrMatch;
                const attribute: IRAttribute = {
                    name,
                    type,
                    keyType: keyType?.toLowerCase() as ERAttributeKeyType | undefined,
                    comment,
                };
                currentEntity.attributes.push(attribute);
            }
            continue;
        }

        // Handle relationship line
        const relMatch = line.match(RELATIONSHIP_PATTERN);
        if (relMatch) {
            const [, sourceEntity, leftCard, lineType, rightCard, targetEntity, labelRaw] = relMatch;

            // Ensure entities exist
            getOrCreateEntity(entities, sourceEntity);
            getOrCreateEntity(entities, targetEntity);

            // Parse label (remove quotes if present)
            const label = labelRaw.replace(/^["']|["']$/g, '').trim();

            const relationship: IRRelationship = {
                id: generateId(),
                source: sourceEntity,
                target: targetEntity,
                sourceCardinality: parseLeftCardinality(leftCard),
                targetCardinality: parseRightCardinality(rightCard),
                identifying: lineType === '--' ? 'identifying' : 'non-identifying',
                label: label || undefined,
            };
            relationships.push(relationship);
            continue;
        }
    }

    // Convert to standard IR Diagram
    return convertToIR(entities, relationships);
}

/** Get existing entity or create new one */
function getOrCreateEntity(entities: Map<string, IREntity>, name: string): IREntity {
    if (!entities.has(name)) {
        const entity: IREntity = {
            id: name,
            name,
            attributes: [],
        };
        entities.set(name, entity);
    }
    return entities.get(name)!;
}

/** Convert ER-specific structures to standard IR Diagram */
function convertToIR(
    entities: Map<string, IREntity>,
    relationships: IRRelationship[]
): Diagram {
    const nodes: DiagramNode[] = [];
    const edges: DiagramEdge[] = [];

    // Convert entities to nodes
    for (const entity of entities.values()) {
        const node: DiagramNode = {
            id: entity.id,
            type: 'node',
            label: formatEntityLabel(entity),
            shape: 'rectangle',
            style: {},
            metadata: {
                entityType: 'er-entity',
                attributes: entity.attributes,
            },
        };
        nodes.push(node);
    }

    // Convert relationships to edges
    for (const rel of relationships) {
        const edge: DiagramEdge = {
            id: rel.id,
            type: 'edge',
            source: rel.source,
            target: rel.target,
            label: rel.label,
            arrow: {
                sourceType: 'none',
                targetType: 'none',
                lineType: rel.identifying === 'identifying' ? 'solid' : 'dashed',
            },
            style: {},
            metadata: {
                relationshipType: 'er-relationship',
                sourceCardinality: rel.sourceCardinality,
                targetCardinality: rel.targetCardinality,
                identifying: rel.identifying,
            },
        };
        edges.push(edge);
    }

    return {
        id: generateId(),
        type: 'er',
        nodes,
        edges,
        groups: [],
        metadata: {
            source: 'mermaid-er',
        },
    };
}

/** Format entity label with attributes */
function formatEntityLabel(entity: IREntity): string {
    if (entity.attributes.length === 0) {
        return entity.name;
    }

    const attrLines = entity.attributes.map(attr => {
        let line = `${attr.type} ${attr.name}`;
        if (attr.keyType) {
            line += ` ${attr.keyType}`;
        }
        return line;
    });

    return `${entity.name}\n${attrLines.join('\n')}`;
}

// =============================================================================
// Utility Functions for External Use
// =============================================================================

/** Check if source is a Mermaid ER diagram */
export function isERDiagram(source: string): boolean {
    return /^\s*erDiagram\s*$/im.test(source);
}

/** Extract ER-specific data from parsed diagram */
export function extractERData(diagram: Diagram): IRERDiagram | null {
    if (diagram.type !== 'er') {
        return null;
    }

    const entities: IREntity[] = diagram.nodes.map(node => ({
        id: node.id,
        name: node.id,
        attributes: (node.metadata?.attributes as IRAttribute[]) || [],
    }));

    const relationships: IRRelationship[] = diagram.edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceCardinality: (edge.metadata?.sourceCardinality as ERCardinality) || 'exactly-one',
        targetCardinality: (edge.metadata?.targetCardinality as ERCardinality) || 'exactly-one',
        identifying: (edge.metadata?.identifying as ERIdentifying) || 'identifying',
        label: edge.label,
    }));

    return {
        id: diagram.id,
        title: diagram.name,
        entities,
        relationships,
        metadata: diagram.metadata,
    };
}
