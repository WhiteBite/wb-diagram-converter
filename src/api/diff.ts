/**
 * Diagram Diff API
 * 
 * Compares two diagrams and returns detailed differences.
 */

import type { Diagram, DiagramNode, DiagramEdge, DiagramGroup } from '../types/ir';

// =============================================================================
// Types
// =============================================================================

export interface ElementDiff<T> {
  added: T[];
  removed: T[];
  modified: Array<{ before: T; after: T; changes: string[] }>;
  unchanged: T[];
}

export interface DiffSummary {
  totalChanges: number;
  nodesAdded: number;
  nodesRemoved: number;
  nodesModified: number;
  edgesAdded: number;
  edgesRemoved: number;
  edgesModified: number;
  groupsAdded: number;
  groupsRemoved: number;
  groupsModified: number;
}

export interface DiffResult {
  nodes: ElementDiff<DiagramNode>;
  edges: ElementDiff<DiagramEdge>;
  groups: ElementDiff<DiagramGroup>;
  summary: DiffSummary;
}

// =============================================================================
// Comparison Functions
// =============================================================================

function compareElements<T extends { id: string }>(
  before: readonly T[],
  after: readonly T[],
  compareFunc: (a: T, b: T) => string[]
): ElementDiff<T> {
  const beforeMap = new Map(before.map(e => [e.id, e]));
  const afterMap = new Map(after.map(e => [e.id, e]));

  const added: T[] = [];
  const removed: T[] = [];
  const modified: Array<{ before: T; after: T; changes: string[] }> = [];
  const unchanged: T[] = [];

  // Find removed and modified
  for (const [id, beforeEl] of beforeMap) {
    const afterEl = afterMap.get(id);
    if (!afterEl) {
      removed.push(beforeEl);
    } else {
      const changes = compareFunc(beforeEl, afterEl);
      if (changes.length > 0) {
        modified.push({ before: beforeEl, after: afterEl, changes });
      } else {
        unchanged.push(beforeEl);
      }
    }
  }

  // Find added
  for (const [id, afterEl] of afterMap) {
    if (!beforeMap.has(id)) {
      added.push(afterEl);
    }
  }

  return { added, removed, modified, unchanged };
}

function compareNodes(a: DiagramNode, b: DiagramNode): string[] {
  const changes: string[] = [];
  
  if (a.label !== b.label) changes.push('label');
  if (a.shape !== b.shape) changes.push('shape');
  
  // Compare position
  const posA = a.position;
  const posB = b.position;
  if (posA?.x !== posB?.x || posA?.y !== posB?.y) {
    changes.push('position');
  }
  
  // Compare size
  const sizeA = a.size;
  const sizeB = b.size;
  if (sizeA?.width !== sizeB?.width || sizeA?.height !== sizeB?.height) {
    changes.push('size');
  }
  
  // Compare style (deep comparison)
  if (JSON.stringify(a.style) !== JSON.stringify(b.style)) {
    changes.push('style');
  }
  
  // Compare ports
  if (JSON.stringify(a.ports) !== JSON.stringify(b.ports)) {
    changes.push('ports');
  }
  
  // Compare metadata
  if (JSON.stringify(a.metadata) !== JSON.stringify(b.metadata)) {
    changes.push('metadata');
  }
  
  return changes;
}

function compareEdges(a: DiagramEdge, b: DiagramEdge): string[] {
  const changes: string[] = [];
  
  if (a.source !== b.source) changes.push('source');
  if (a.target !== b.target) changes.push('target');
  if (a.sourcePort !== b.sourcePort) changes.push('sourcePort');
  if (a.targetPort !== b.targetPort) changes.push('targetPort');
  if (a.label !== b.label) changes.push('label');
  if (a.labelPosition !== b.labelPosition) changes.push('labelPosition');
  
  // Compare arrow config
  if (JSON.stringify(a.arrow) !== JSON.stringify(b.arrow)) {
    changes.push('arrow');
  }
  
  // Compare style
  if (JSON.stringify(a.style) !== JSON.stringify(b.style)) {
    changes.push('style');
  }
  
  // Compare waypoints
  if (JSON.stringify(a.waypoints) !== JSON.stringify(b.waypoints)) {
    changes.push('waypoints');
  }
  
  // Compare metadata
  if (JSON.stringify(a.metadata) !== JSON.stringify(b.metadata)) {
    changes.push('metadata');
  }
  
  return changes;
}

function compareGroups(a: DiagramGroup, b: DiagramGroup): string[] {
  const changes: string[] = [];
  
  if (a.label !== b.label) changes.push('label');
  
  // Compare children (order matters)
  if (JSON.stringify(a.children) !== JSON.stringify(b.children)) {
    changes.push('children');
  }
  
  // Compare position
  const posA = a.position;
  const posB = b.position;
  if (posA?.x !== posB?.x || posA?.y !== posB?.y) {
    changes.push('position');
  }
  
  // Compare size
  const sizeA = a.size;
  const sizeB = b.size;
  if (sizeA?.width !== sizeB?.width || sizeA?.height !== sizeB?.height) {
    changes.push('size');
  }
  
  // Compare style
  if (JSON.stringify(a.style) !== JSON.stringify(b.style)) {
    changes.push('style');
  }
  
  // Compare collapsed state
  if (a.collapsed !== b.collapsed) {
    changes.push('collapsed');
  }
  
  // Compare metadata
  if (JSON.stringify(a.metadata) !== JSON.stringify(b.metadata)) {
    changes.push('metadata');
  }
  
  return changes;
}

// =============================================================================
// Main API
// =============================================================================

/**
 * Compare two diagrams and return detailed differences
 * 
 * @param before - Original diagram
 * @param after - Modified diagram
 * @returns Detailed diff result with added, removed, modified, and unchanged elements
 * 
 * @example
 * ```typescript
 * import { compareDiagrams } from '@whitebite/diagrams';
 * 
 * const diff = compareDiagrams(oldDiagram, newDiagram);
 * 
 * console.log(`Added ${diff.summary.nodesAdded} nodes`);
 * console.log(`Modified nodes:`, diff.nodes.modified);
 * ```
 */
export function compareDiagrams(before: Diagram, after: Diagram): DiffResult {
  const nodesDiff = compareElements(before.nodes, after.nodes, compareNodes);
  const edgesDiff = compareElements(before.edges, after.edges, compareEdges);
  const groupsDiff = compareElements(before.groups, after.groups, compareGroups);

  const summary: DiffSummary = {
    totalChanges:
      nodesDiff.added.length + nodesDiff.removed.length + nodesDiff.modified.length +
      edgesDiff.added.length + edgesDiff.removed.length + edgesDiff.modified.length +
      groupsDiff.added.length + groupsDiff.removed.length + groupsDiff.modified.length,
    nodesAdded: nodesDiff.added.length,
    nodesRemoved: nodesDiff.removed.length,
    nodesModified: nodesDiff.modified.length,
    edgesAdded: edgesDiff.added.length,
    edgesRemoved: edgesDiff.removed.length,
    edgesModified: edgesDiff.modified.length,
    groupsAdded: groupsDiff.added.length,
    groupsRemoved: groupsDiff.removed.length,
    groupsModified: groupsDiff.modified.length,
  };

  return {
    nodes: nodesDiff,
    edges: edgesDiff,
    groups: groupsDiff,
    summary,
  };
}
