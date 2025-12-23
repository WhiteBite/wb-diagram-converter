# @whitebite/diagram-converter

[English](#english) | [Русский](#русский)

---

## English

Universal diagram format converter library. Convert between Mermaid, Draw.io, Excalidraw, PlantUML, DOT (Graphviz) and more.

### 🔗 Related Projects

- **[Web Converter](https://whitebite.github.io/wb-diagram-converter-web/)** — Online tool for diagram conversion
- **[Diagram Board](https://whitebite.github.io/wb-diagram-board/)** — Interactive canvas for creating diagrams

### Installation

```bash
npm install @whitebite/diagram-converter
```

### Quick Start

```typescript
import { convert } from '@whitebite/diagram-converter';

// Convert Mermaid to Draw.io
const result = convert(mermaidCode, {
  from: 'mermaid',
  to: 'drawio',
});

console.log(result.output);
```

### Supported Formats

| Format | Parse | Generate |
|--------|:-----:|:--------:|
| Mermaid | ✅ | ✅ |
| Draw.io | ✅ | ✅ |
| Excalidraw | ✅ | ✅ |
| PlantUML | ✅ | ✅ |
| DOT (Graphviz) | ✅ | ✅ |
| SVG | — | ✅ |
| PNG | — | ✅ |

### API

#### `convert(source, options)`

Main conversion function.

```typescript
import { convert } from '@whitebite/diagram-converter';

const result = convert(source, {
  from: 'mermaid',    // Input format
  to: 'drawio',       // Output format
  autoLayout: true,   // Apply automatic layout (optional)
});

// result.output - converted diagram code
// result.diagram - intermediate representation (IR)
// result.warnings - conversion warnings (if any)
```

#### Individual Parsers

```typescript
import { parseMermaid, parseDrawio, parsePlantUML } from '@whitebite/diagram-converter/parsers';

const diagram = parseMermaid(`
  graph TD
    A[Start] --> B[Process]
    B --> C[End]
`);
```

#### Individual Generators

```typescript
import { generateMermaid, generateDrawio, generateExcalidraw } from '@whitebite/diagram-converter/generators';

const mermaidCode = generateMermaid(diagram);
const drawioXml = generateDrawio(diagram);
```

### Use Cases

- **Documentation migration** — convert diagrams when switching tools
- **CI/CD pipelines** — auto-generate diagrams in multiple formats
- **Editor plugins** — add conversion capabilities to your IDE
- **Web applications** — build diagram tools with format flexibility

### License

MIT © WhiteBite

---

## Русский

Универсальная библиотека для конвертации диаграмм. Преобразование между Mermaid, Draw.io, Excalidraw, PlantUML, DOT (Graphviz) и другими форматами.

### 🔗 Связанные проекты

- **[Веб-конвертер](https://whitebite.github.io/wb-diagram-converter-web/)** — Онлайн-инструмент для конвертации диаграмм
- **[Diagram Board](https://whitebite.github.io/wb-diagram-board/)** — Интерактивный холст для создания диаграмм

### Установка

```bash
npm install @whitebite/diagram-converter
```

### Быстрый старт

```typescript
import { convert } from '@whitebite/diagram-converter';

// Конвертация Mermaid в Draw.io
const result = convert(mermaidCode, {
  from: 'mermaid',
  to: 'drawio',
});

console.log(result.output);
```

### Поддерживаемые форматы

| Формат | Парсинг | Генерация |
|--------|:-------:|:---------:|
| Mermaid | ✅ | ✅ |
| Draw.io | ✅ | ✅ |
| Excalidraw | ✅ | ✅ |
| PlantUML | ✅ | ✅ |
| DOT (Graphviz) | ✅ | ✅ |
| SVG | — | ✅ |
| PNG | — | ✅ |

### API

#### `convert(source, options)`

Основная функция конвертации.

```typescript
import { convert } from '@whitebite/diagram-converter';

const result = convert(source, {
  from: 'mermaid',    // Входной формат
  to: 'drawio',       // Выходной формат
  autoLayout: true,   // Применить авто-раскладку (опционально)
});

// result.output - код сконвертированной диаграммы
// result.diagram - промежуточное представление (IR)
// result.warnings - предупреждения конвертации (если есть)
```

#### Отдельные парсеры

```typescript
import { parseMermaid, parseDrawio, parsePlantUML } from '@whitebite/diagram-converter/parsers';

const diagram = parseMermaid(`
  graph TD
    A[Начало] --> B[Процесс]
    B --> C[Конец]
`);
```

#### Отдельные генераторы

```typescript
import { generateMermaid, generateDrawio, generateExcalidraw } from '@whitebite/diagram-converter/generators';

const mermaidCode = generateMermaid(diagram);
const drawioXml = generateDrawio(diagram);
```

### Сценарии использования

- **Миграция документации** — конвертация диаграмм при смене инструментов
- **CI/CD пайплайны** — автогенерация диаграмм в разных форматах
- **Плагины для редакторов** — добавление возможностей конвертации в IDE
- **Веб-приложения** — создание инструментов для работы с диаграммами

### Лицензия

MIT © WhiteBite
