/**
 * ER Diagram Types
 * 
 * Types for Entity-Relationship diagrams (Mermaid erDiagram)
 */

// =============================================================================
// Cardinality Types
// =============================================================================

/** Cardinality markers for ER relationships */
export type ERCardinality =
    | 'zero-or-one'    // |o or o|
    | 'exactly-one'    // ||
    | 'zero-or-more'   // }o or o{
    | 'one-or-more';   // }|  or |{

/** Relationship identification */
export type ERIdentifying = 'identifying' | 'non-identifying';

// =============================================================================
// Attribute Types
// =============================================================================

/** Attribute key types */
export type ERAttributeKeyType =
    | 'pk'    // Primary Key
    | 'fk'    // Foreign Key
    | 'uk';   // Unique Key

/** Entity attribute */
export interface IRAttribute {
    name: string;
    type: string;
    keyType?: ERAttributeKeyType;
    comment?: string;
}

// =============================================================================
// Entity Types
// =============================================================================

/** ER Entity (table) */
export interface IREntity {
    id: string;
    name: string;
    alias?: string;
    attributes: IRAttribute[];
    metadata?: Record<string, unknown>;
}

// =============================================================================
// Relationship Types
// =============================================================================

/** ER Relationship between entities */
export interface IRRelationship {
    id: string;
    source: string;           // Source entity ID
    target: string;           // Target entity ID
    sourceCardinality: ERCardinality;
    targetCardinality: ERCardinality;
    identifying: ERIdentifying;
    label?: string;           // Relationship verb/label
    metadata?: Record<string, unknown>;
}

// =============================================================================
// Diagram Types
// =============================================================================

/** Complete ER Diagram representation */
export interface IRERDiagram {
    id: string;
    title?: string;
    entities: IREntity[];
    relationships: IRRelationship[];
    metadata?: Record<string, unknown>;
}

// =============================================================================
// Mermaid ER Syntax Mapping
// =============================================================================

/**
 * Mermaid ER cardinality symbols:
 * 
 * Left side (source):
 *   |o  - zero or one
 *   ||  - exactly one
 *   }o  - zero or more
 *   }|  - one or more
 * 
 * Right side (target):
 *   o|  - zero or one
 *   ||  - exactly one
 *   o{  - zero or more
 *   |{  - one or more
 * 
 * Line types:
 *   --  - identifying (solid)
 *   ..  - non-identifying (dashed)
 * 
 * Examples:
 *   CUSTOMER ||--o{ ORDER : places
 *   ORDER ||--|{ LINE-ITEM : contains
 *   PRODUCT }|..|{ ORDER : "ordered in"
 */

/** Map Mermaid left cardinality symbol to ERCardinality */
export function parseLeftCardinality(symbol: string): ERCardinality {
    switch (symbol) {
        case '|o':
            return 'zero-or-one';
        case '||':
            return 'exactly-one';
        case '}o':
            return 'zero-or-more';
        case '}|':
            return 'one-or-more';
        default:
            return 'exactly-one';
    }
}

/** Map Mermaid right cardinality symbol to ERCardinality */
export function parseRightCardinality(symbol: string): ERCardinality {
    switch (symbol) {
        case 'o|':
            return 'zero-or-one';
        case '||':
            return 'exactly-one';
        case 'o{':
            return 'zero-or-more';
        case '|{':
            return 'one-or-more';
        default:
            return 'exactly-one';
    }
}

/** Map ERCardinality to Mermaid left symbol */
export function generateLeftCardinality(cardinality: ERCardinality): string {
    switch (cardinality) {
        case 'zero-or-one':
            return '|o';
        case 'exactly-one':
            return '||';
        case 'zero-or-more':
            return '}o';
        case 'one-or-more':
            return '}|';
    }
}

/** Map ERCardinality to Mermaid right symbol */
export function generateRightCardinality(cardinality: ERCardinality): string {
    switch (cardinality) {
        case 'zero-or-one':
            return 'o|';
        case 'exactly-one':
            return '||';
        case 'zero-or-more':
            return 'o{';
        case 'one-or-more':
            return '|{';
    }
}
