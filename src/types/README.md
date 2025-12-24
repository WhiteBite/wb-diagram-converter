# Type System Documentation

Complete type definitions for the WB Diagram Converter library.

## Overview

The type system is organized into five main modules:

1. **`ir.ts`** - Intermediate Representation (IR) core types
2. **`fixer.ts`** - Syntax error detection and fixing types
3. **`api.ts`** - Fluent API for diagram creation and manipulation
4. **`mutations.ts`** - Mutation operations with discriminated unions
5. **`validation.ts`** - Comprehensive validation system

## Module Details

### 1. IR Types (`ir.ts`)

Core data structures for universal diagram representation. All parsers convert to IR, all generators convert from IR.

**Key Types:**
- `Diagram` - Complete diagram representation
- `DiagramNode` - Individual nodes/shapes
- `DiagramEdge` - Connections between nodes
- `DiagramGroup` - Containers/subgraphs
- `Position`, `Size`, `Viewport` - Layout types
- `ArrowConfig`, `NodeStyle`, `EdgeStyle` - Styling types

**Example:**
```typescript
import type { Diagram, DiagramNode } from '@whitebite/diagram-converter';

const node: DiagramNode = {
  id: 'A',
  type: 'node',
  label: 'Start',
  shape: 'rounded-rectangle',
  style: {
    fill: '#e1f5fe',
    stroke: '#01579b',
  }
};
```

### 2. Fixer Types (`fixer.ts`)

Types for rule-based syntax error detection and automatic fixing.

**Key Types:**
- `SyntaxError` - Detected syntax errors
- `FixSuggestion` - Suggested fixes
- `FixResult` - Result of fixing operation
- `FixRule` - Individual fix rule definition
- `Fixer` - Fixer interface for each format

**Example:**
```typescript
import type { FixResult } from '@whitebite/diagram-converter';

const result: FixResult = {
  success: true,
  original: 'A -> B',
  fixed: 'A --> B',
  errors: [],
  suggestions: [],
  appliedFixes: 1
};
```

### 3. API Types (`api.ts`)

Fluent API interfaces for type-safe diagram creation and manipulation.

**Key Interfaces:**
- `DiagramBuilder` - Build new diagrams from scratch
- `DiagramMutator` - Modify existing diagrams
- `NodeConfig`, `EdgeConfig`, `GroupConfig` - Configuration objects

**Builder Example:**
```typescript
import { createDiagram } from '@whitebite/diagram-converter';

const diagram = createDiagram()
  .setType('flowchart')
  .setName('User Flow')
  .addNode({ 
    id: 'start', 
    label: 'Start', 
    shape: 'circle' 
  })
  .addNode({ 
    id: 'process', 
    label: 'Process Data' 
  })
  .addEdge({ 
    source: 'start', 
    target: 'process' 
  })
  .build();
```

**Mutator Example:**
```typescript
import { mutateDiagram } from '@whitebite/diagram-converter';

const updated = mutateDiagram(diagram)
  .updateNode('start', { label: 'Begin' })
  .addNode({ id: 'end', label: 'End', shape: 'circle' })
  .addEdge({ source: 'process', target: 'end' })
  .removeNode('old-node', true) // cascade: remove connected edges
  .apply();
```

### 4. Mutation Types (`mutations.ts`)

Discriminated union types for all diagram mutation operations.

**Key Types:**
- `MutationOperation` - Union of all operation types
- `AddNodeOperation`, `UpdateNodeOperation`, `RemoveNodeOperation` - Node ops
- `AddEdgeOperation`, `UpdateEdgeOperation`, `RemoveEdgeOperation` - Edge ops
- `AddGroupOperation`, `UpdateGroupOperation`, `RemoveGroupOperation` - Group ops
- `MutationResult` - Result of applying mutations
- `MutationError` - Detailed error information

**Example:**
```typescript
import type { MutationOperation } from '@whitebite/diagram-converter';

const operations: MutationOperation[] = [
  {
    type: 'addNode',
    config: { id: 'A', label: 'Node A' }
  },
  {
    type: 'updateNode',
    id: 'B',
    updates: { label: 'Updated B' }
  },
  {
    type: 'removeNode',
    id: 'C',
    cascade: true
  }
];

// Type-safe operation handling
function applyOperation(op: MutationOperation) {
  switch (op.type) {
    case 'addNode':
      // TypeScript knows op.config exists
      return addNode(op.config);
    case 'updateNode':
      // TypeScript knows op.id and op.updates exist
      return updateNode(op.id, op.updates);
    case 'removeNode':
      // TypeScript knows op.id and op.cascade exist
      return removeNode(op.id, op.cascade);
    // ... other cases
  }
}
```

### 5. Validation Types (`validation.ts`)

Comprehensive validation system with detailed error reporting.

**Key Types:**
- `ValidationResult` - Complete validation result
- `ValidationError` - Critical errors
- `ValidationWarning` - Non-critical issues
- `ValidationErrorCode`, `ValidationWarningCode` - Error codes
- `ValidationOptions` - Validation configuration
- `DiagramValidator`, `NodeValidator`, `EdgeValidator`, `GroupValidator` - Validators

**Example:**
```typescript
import { validateDiagram } from '@whitebite/diagram-converter';
import type { ValidationOptions } from '@whitebite/diagram-converter';

const options: ValidationOptions = {
  strict: true,
  checkReferences: true,
  checkLayout: true,
  allowAutoLayout: true
};

const result = validateDiagram(diagram, options);

if (!result.valid) {
  console.error('Validation failed:');
  result.errors.forEach(error => {
    console.error(`  [${error.code}] ${error.path}: ${error.message}`);
  });
}

if (result.warnings.length > 0) {
  console.warn('Warnings:');
  result.warnings.forEach(warning => {
    console.warn(`  [${warning.code}] ${warning.path}: ${warning.message}`);
  });
}
```

## Design Principles

### 1. Immutability
All API operations return new instances. No mutations of existing objects.

```typescript
const mutator1 = mutateDiagram(diagram);
const mutator2 = mutator1.addNode({ id: 'A', label: 'A' });
// mutator1 !== mutator2 (different instances)
```

### 2. Type Safety
Discriminated unions provide complete type safety:

```typescript
type MutationOperation = 
  | { type: 'addNode'; config: NodeConfig }
  | { type: 'updateNode'; id: string; updates: Partial<DiagramNode> }
  | { type: 'removeNode'; id: string; cascade?: boolean };

// TypeScript narrows the type based on 'type' property
```

### 3. Extensibility
Easy to add new operations, validators, or diagram types:

```typescript
// Add new operation type
interface CustomOperation {
  type: 'customOp';
  data: CustomData;
}

type ExtendedOperation = MutationOperation | CustomOperation;
```

### 4. Error Handling
Detailed error codes and context for debugging:

```typescript
enum MutationErrorCode {
  NODE_NOT_FOUND = 'NODE_NOT_FOUND',
  DUPLICATE_ID = 'DUPLICATE_ID',
  INVALID_REFERENCE = 'INVALID_REFERENCE',
  // ...
}

interface MutationError {
  operation: MutationOperation;
  message: string;
  code: MutationErrorCode;
  context?: Record<string, unknown>;
}
```

### 5. Documentation
All public types have JSDoc comments with examples:

```typescript
/**
 * Add a new node to the diagram
 * 
 * @param config - Node configuration
 * @returns New mutator instance
 * @throws {Error} If node with same ID already exists
 */
addNode(config: NodeConfig): DiagramMutator;
```

## Usage Patterns

### Pattern 1: Building Diagrams

```typescript
import { createDiagram } from '@whitebite/diagram-converter';

const diagram = createDiagram('my-diagram')
  .setType('flowchart')
  .addNode({ id: 'A', label: 'Start', shape: 'circle' })
  .addNode({ id: 'B', label: 'Process' })
  .addNode({ id: 'C', label: 'End', shape: 'circle' })
  .addEdge({ source: 'A', target: 'B' })
  .addEdge({ source: 'B', target: 'C' })
  .setViewport({ width: 1200, height: 800 })
  .build();
```

### Pattern 2: Mutating Diagrams

```typescript
import { mutateDiagram } from '@whitebite/diagram-converter';

const updated = mutateDiagram(diagram)
  .updateNode('A', { 
    style: { fill: '#4caf50' } 
  })
  .moveNode('B', { x: 200, y: 100 })
  .addEdge({ 
    source: 'B', 
    target: 'D',
    arrow: { lineType: 'dashed' }
  })
  .apply();
```

### Pattern 3: Batch Operations

```typescript
import type { MutationOperation } from '@whitebite/diagram-converter';

const operations: MutationOperation[] = [
  { type: 'addNode', config: { id: 'X', label: 'X' } },
  { type: 'addNode', config: { id: 'Y', label: 'Y' } },
  { type: 'addEdge', config: { source: 'X', target: 'Y' } }
];

const result = mutateDiagram(diagram)
  .batch(operations)
  .apply();
```

### Pattern 4: Validation

```typescript
import { validateDiagram, formatValidationResult } from '@whitebite/diagram-converter';

const result = validateDiagram(diagram, {
  strict: false,
  checkReferences: true,
  checkLayout: true
});

console.log(formatValidationResult(result));
// Output:
// ✓ Diagram is valid
// Warnings (2):
//   • [MISSING_POSITION] nodes[0]: Node position not specified
//   • [DISCONNECTED_NODE] nodes[3]: Node has no connections
```

### Pattern 5: Error Handling

```typescript
import { mutateDiagram, MutationErrorCode } from '@whitebite/diagram-converter';

try {
  const updated = mutateDiagram(diagram)
    .updateNode('nonexistent', { label: 'New' })
    .apply();
} catch (error) {
  if (error.code === MutationErrorCode.NODE_NOT_FOUND) {
    console.error('Node not found:', error.context);
  }
}
```

## Type Guards and Helpers

### Mutation Operation Type Guards

```typescript
import { 
  isNodeOperation, 
  isEdgeOperation, 
  isGroupOperation 
} from '@whitebite/diagram-converter';

function processOperation(op: MutationOperation) {
  if (isNodeOperation(op)) {
    // op is AddNodeOperation | UpdateNodeOperation | RemoveNodeOperation | ...
  } else if (isEdgeOperation(op)) {
    // op is AddEdgeOperation | UpdateEdgeOperation | RemoveEdgeOperation | ...
  } else if (isGroupOperation(op)) {
    // op is AddGroupOperation | UpdateGroupOperation | RemoveGroupOperation | ...
  }
}
```

### Validation Helpers

```typescript
import { 
  hasErrors, 
  hasWarnings, 
  getAllIssues,
  getIssuesForElement,
  groupIssuesByCode
} from '@whitebite/diagram-converter';

const result = validateDiagram(diagram);

if (hasErrors(result)) {
  console.error('Validation failed');
}

if (hasWarnings(result)) {
  console.warn('Validation warnings present');
}

// Get all issues for a specific element
const nodeIssues = getIssuesForElement(result, 'node-id');

// Group issues by error code
const grouped = groupIssuesByCode(result);
```

## Best Practices

### 1. Use Builders for New Diagrams
```typescript
// ✅ Good - type-safe, fluent API
const diagram = createDiagram()
  .setType('flowchart')
  .addNode({ id: 'A', label: 'A' })
  .build();

// ❌ Bad - manual construction, error-prone
const diagram: Diagram = {
  id: 'diagram-1',
  type: 'flowchart',
  nodes: [{ id: 'A', label: 'A', /* ... */ }],
  edges: [],
  groups: []
};
```

### 2. Use Mutators for Modifications
```typescript
// ✅ Good - immutable, chainable
const updated = mutateDiagram(diagram)
  .addNode({ id: 'B', label: 'B' })
  .apply();

// ❌ Bad - direct mutation
diagram.nodes.push({ id: 'B', label: 'B', /* ... */ });
```

### 3. Validate Before Converting
```typescript
// ✅ Good - validate first
const result = validateDiagram(diagram);
if (result.valid) {
  const output = convert(diagram, 'mermaid');
}

// ❌ Bad - convert without validation
const output = convert(diagram, 'mermaid'); // May fail
```

### 4. Use Discriminated Unions
```typescript
// ✅ Good - type-safe switch
function apply(op: MutationOperation) {
  switch (op.type) {
    case 'addNode': return addNode(op.config);
    case 'updateNode': return updateNode(op.id, op.updates);
    // TypeScript ensures all cases are handled
  }
}

// ❌ Bad - type casting
function apply(op: any) {
  if (op.type === 'addNode') {
    return addNode(op.config as NodeConfig);
  }
}
```

### 5. Provide Context in Errors
```typescript
// ✅ Good - detailed error context
throw new MutationError({
  operation,
  message: 'Node not found',
  code: MutationErrorCode.NODE_NOT_FOUND,
  context: { nodeId: 'A', availableNodes: ['B', 'C'] }
});

// ❌ Bad - generic error
throw new Error('Node not found');
```

## Migration Guide

### From Manual IR Construction

**Before:**
```typescript
const diagram: Diagram = {
  id: 'my-diagram',
  type: 'flowchart',
  nodes: [
    { id: 'A', type: 'node', label: 'A', shape: 'rectangle', style: {} },
    { id: 'B', type: 'node', label: 'B', shape: 'rectangle', style: {} }
  ],
  edges: [
    { 
      id: 'A-B', 
      type: 'edge', 
      source: 'A', 
      target: 'B', 
      arrow: { sourceType: 'none', targetType: 'arrow', lineType: 'solid' },
      style: {}
    }
  ],
  groups: []
};
```

**After:**
```typescript
const diagram = createDiagram('my-diagram')
  .setType('flowchart')
  .addNode({ id: 'A', label: 'A' })
  .addNode({ id: 'B', label: 'B' })
  .addEdge({ source: 'A', target: 'B' })
  .build();
```

### From Direct Mutations

**Before:**
```typescript
diagram.nodes.push({ id: 'C', label: 'C', /* ... */ });
diagram.edges.push({ source: 'B', target: 'C', /* ... */ });
```

**After:**
```typescript
const updated = mutateDiagram(diagram)
  .addNode({ id: 'C', label: 'C' })
  .addEdge({ source: 'B', target: 'C' })
  .apply();
```

## Future Enhancements

Planned additions to the type system:

1. **Undo/Redo Support** - Operation history and reversal
2. **Diff/Patch** - Compare diagrams and generate patches
3. **Serialization** - JSON schema validation
4. **Plugins** - Extensible operation types
5. **Async Operations** - Support for async mutations
6. **Transaction Support** - Atomic batch operations with rollback

## Contributing

When adding new types:

1. Follow existing naming conventions
2. Add comprehensive JSDoc comments
3. Include usage examples
4. Update this README
5. Add tests for new types
6. Ensure no circular dependencies

## License

MIT - See LICENSE file for details
