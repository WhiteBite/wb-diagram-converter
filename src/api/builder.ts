/**
 * Diagram Builder - Fluent API for creating diagrams from scratch
 * 
 * Implements the Builder pattern with immutable operations.
 * Each method returns a new builder instance.
 */

import type {
    Diagram,
    DiagramType,
    DiagramNode,
    DiagramEdge,
    DiagramGroup,
    Viewport,
} from '../types/ir';
import type {
    DiagramBuilder as IBuilder,
    NodeConfig,
    EdgeConfig,
    GroupConfig,
} from '../types/api';
import { validateDiagram } from '../utils/ir-validator';
import { generateId } from '../utils';

/**
 * Default node style
 */
const DEFAULT_NODE_STYLE = {
    fill: '#ffffff',
    stroke: '#000000',
    strokeWidth: 2,
    fontSize: 14,
    fontFamily: 'Arial',
    fontColor: '#000000',
    fontWeight: 'normal' as const,
    textAlign: 'center' as const,
    opacity: 1,
    shadow: false,
    rounded: 0,
};

/**
 * Default edge style
 */
const DEFAULT_EDGE_STYLE = {
    stroke: '#000000',
    strokeWidth: 2,
    opacity: 1,
};

/**
 * Default group style
 */
const DEFAULT_GROUP_STYLE = {
    fill: '#f0f0f0',
    stroke: '#cccccc',
    strokeWidth: 1,
    opacity: 0.5,
    labelPosition: 'top' as const,
};

/**
 * Implementation of DiagramBuilder interface
 * Uses immutable builder pattern - each method returns new instance
 */
class DiagramBuilder implements IBuilder {
    private readonly state: Partial<Diagram>;

    constructor(id?: string) {
        this.state = {
            id: id || generateId(),
            type: 'generic',
            nodes: [],
            edges: [],
            groups: [],
        };
    }

    /**
     * Create a new builder with updated state
     */
    private clone(updates: Partial<Diagram>): DiagramBuilder {
        const builder = new DiagramBuilder();
        (builder as any).state = { ...this.state, ...updates };
        return builder;
    }

    setType(type: DiagramType): DiagramBuilder {
        return this.clone({ type });
    }

    setName(name: string): DiagramBuilder {
        return this.clone({ name });
    }

    addNode(config: NodeConfig): DiagramBuilder {
        // Validate node ID uniqueness
        const existingIds = new Set([
            ...this.state.nodes!.map(n => n.id),
            ...this.state.groups!.map(g => g.id),
        ]);

        if (existingIds.has(config.id)) {
            throw new Error(`Node with ID '${config.id}' already exists`);
        }

        // Create node with defaults
        const node: DiagramNode = {
            id: config.id,
            type: 'node',
            label: config.label,
            shape: config.shape || 'rectangle',
            position: config.position,
            size: config.size,
            style: {
                ...DEFAULT_NODE_STYLE,
                ...config.style,
            },
            ports: config.ports,
            metadata: config.metadata,
        };

        return this.clone({
            nodes: [...this.state.nodes!, node],
        });
    }

    addEdge(config: EdgeConfig): DiagramBuilder {
        const nodeIds = new Set(this.state.nodes!.map(n => n.id));

        // Validate source and target exist
        if (!nodeIds.has(config.source)) {
            throw new Error(`Source node '${config.source}' not found`);
        }
        if (!nodeIds.has(config.target)) {
            throw new Error(`Target node '${config.target}' not found`);
        }

        // Generate ID if not provided
        const id = config.id || `${config.source}-${config.target}`;

        // Check ID uniqueness
        const existingIds = new Set(this.state.edges!.map(e => e.id));
        if (existingIds.has(id)) {
            throw new Error(`Edge with ID '${id}' already exists`);
        }

        // Create edge with defaults
        const edge: DiagramEdge = {
            id,
            type: 'edge',
            source: config.source,
            target: config.target,
            sourcePort: config.sourcePort,
            targetPort: config.targetPort,
            label: config.label,
            labelPosition: config.labelPosition || 'middle',
            arrow: {
                sourceType: 'none',
                targetType: 'arrow',
                lineType: 'solid',
                ...config.arrow,
            },
            style: {
                ...DEFAULT_EDGE_STYLE,
                ...config.style,
            },
            waypoints: config.waypoints,
            metadata: config.metadata,
        };

        return this.clone({
            edges: [...this.state.edges!, edge],
        });
    }

    addGroup(config: GroupConfig): DiagramBuilder {
        const allIds = new Set([
            ...this.state.nodes!.map(n => n.id),
            ...this.state.groups!.map(g => g.id),
        ]);

        // Validate group ID uniqueness
        if (allIds.has(config.id)) {
            throw new Error(`Group with ID '${config.id}' already exists`);
        }

        // Validate all children exist
        for (const childId of config.children) {
            if (!allIds.has(childId)) {
                throw new Error(`Child element '${childId}' not found`);
            }
        }

        // Create group with defaults
        const group: DiagramGroup = {
            id: config.id,
            type: 'group',
            label: config.label,
            children: config.children,
            position: config.position,
            size: config.size,
            style: {
                ...DEFAULT_GROUP_STYLE,
                ...config.style,
            },
            collapsed: config.collapsed || false,
            metadata: config.metadata,
        };

        return this.clone({
            groups: [...this.state.groups!, group],
        });
    }

    setViewport(viewport: Viewport): DiagramBuilder {
        return this.clone({ viewport });
    }

    setMetadata(metadata: Record<string, unknown>): DiagramBuilder {
        return this.clone({
            metadata: {
                ...this.state.metadata,
                ...metadata,
            } as any,
        });
    }

    build(): Diagram {
        const diagram: Diagram = {
            id: this.state.id!,
            name: this.state.name,
            type: this.state.type!,
            nodes: this.state.nodes!,
            edges: this.state.edges!,
            groups: this.state.groups!,
            viewport: this.state.viewport,
            metadata: this.state.metadata,
        };

        // Validate before returning
        const result = validateDiagram(diagram, {
            checkReferences: true,
            checkLayout: false,
        });

        if (!result.valid) {
            const firstError = result.errors[0];
            throw new Error(`Invalid diagram: ${firstError.message} (${firstError.path})`);
        }

        return diagram;
    }

    preview(): Partial<Diagram> {
        return { ...this.state };
    }
}

/**
 * Creates a new diagram builder
 * 
 * @param id - Optional diagram ID (auto-generated if not provided)
 * @returns New diagram builder instance
 * 
 * @example
 * const diagram = createDiagram()
 *   .setType('flowchart')
 *   .setName('My Diagram')
 *   .addNode({ id: 'A', label: 'Start', shape: 'circle' })
 *   .addNode({ id: 'B', label: 'Process' })
 *   .addEdge({ source: 'A', target: 'B' })
 *   .build();
 */
export function createDiagram(id?: string): IBuilder {
    return new DiagramBuilder(id);
}
