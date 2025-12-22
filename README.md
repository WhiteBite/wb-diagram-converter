# @whitebite/diagram-converter

Universal diagram format converter. Convert between Mermaid, Draw.io, Excalidraw, PlantUML, DOT and more.

## Installation

```bash
npm install @whitebite/diagram-converter
```

## Usage

```typescript
import { convert } from '@whitebite/diagram-converter';

// Convert Mermaid to Draw.io
const result = convert(mermaidCode, {
  from: 'mermaid',
  to: 'drawio',
});

console.log(result.output);
```

## Supported Formats

| Format | Parse | Generate |
|--------|-------|----------|
| Mermaid | ✅ | ✅ |
| Draw.io | ✅ | ✅ |
| Excalidraw | ✅ | ✅ |
| PlantUML | ✅ | ✅ |
| DOT (Graphviz) | ✅ | ✅ |
| SVG | ❌ | ✅ |
| PNG | ❌ | ✅ |

## API

### `convert(source, options)`

Convert diagram from one format to another.

```typescript
interface ConvertOptions {
  from: InputFormat;
  to: OutputFormat;
  autoLayout?: boolean;
}

interface ConvertResult {
  output: string;
  diagram: Diagram;
  warnings?: string[];
}
```

### Individual Parsers

```typescript
import { parseMermaid, parseDrawio } from '@whitebite/diagram-converter/parsers';

const diagram = parseMermaid(`
  graph TD
    A --> B
    B --> C
`);
```

### Individual Generators

```typescript
import { generateMermaid, generateDrawio } from '@whitebite/diagram-converter/generators';

const mermaidCode = generateMermaid(diagram);
const drawioXml = generateDrawio(diagram);
```

## License

MIT © WhiteBite
