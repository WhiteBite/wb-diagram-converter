/**
 * Automatic diagram format detection
 * 
 * Analyzes diagram source code and determines the most likely format
 * based on syntax patterns and structural markers.
 */

import type { InputFormat } from '../types/ir';

export interface DetectionResult {
  format: InputFormat | null;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

interface FormatPattern {
  format: InputFormat;
  patterns: Array<{
    regex: RegExp;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
  }>;
}

/**
 * Format detection patterns ordered by specificity.
 * More specific patterns (high confidence) are checked first within each format.
 * Formats with unique markers are placed earlier in the array.
 */
const FORMAT_PATTERNS: FormatPattern[] = [
  // PlantUML - very specific markers
  {
    format: 'plantuml',
    patterns: [
      { regex: /@startuml/i, confidence: 'high', reason: 'PlantUML start tag' },
      { regex: /@startmindmap/i, confidence: 'high', reason: 'PlantUML mindmap' },
      { regex: /@startwbs/i, confidence: 'high', reason: 'PlantUML WBS' },
      { regex: /@startgantt/i, confidence: 'high', reason: 'PlantUML Gantt' },
      { regex: /@enduml/i, confidence: 'high', reason: 'PlantUML end tag' },
    ],
  },
  // BPMN - XML with specific namespace
  {
    format: 'bpmn',
    patterns: [
      { regex: /<bpmn:definitions/i, confidence: 'high', reason: 'BPMN definitions element' },
      { regex: /<bpmn2:definitions/i, confidence: 'high', reason: 'BPMN 2.0 definitions element' },
      { regex: /xmlns:bpmn/i, confidence: 'high', reason: 'BPMN namespace declaration' },
      { regex: /xmlns="http:\/\/www\.omg\.org\/spec\/BPMN/i, confidence: 'high', reason: 'BPMN OMG namespace' },
    ],
  },
  // GraphML - XML with specific namespace
  {
    format: 'graphml',
    patterns: [
      { regex: /<graphml/i, confidence: 'high', reason: 'GraphML root element' },
      { regex: /xmlns.*graphml/i, confidence: 'high', reason: 'GraphML namespace' },
    ],
  },
  // Draw.io - XML with mxfile/mxGraphModel
  {
    format: 'drawio',
    patterns: [
      { regex: /<mxfile/i, confidence: 'high', reason: 'Draw.io mxfile root element' },
      { regex: /<mxGraphModel/i, confidence: 'high', reason: 'Draw.io mxGraphModel element' },
      { regex: /<mxCell/i, confidence: 'medium', reason: 'Draw.io mxCell element' },
    ],
  },
  // Excalidraw - JSON with specific type field
  {
    format: 'excalidraw',
    patterns: [
      { regex: /"type"\s*:\s*"excalidraw"/i, confidence: 'high', reason: 'Excalidraw type field' },
      { regex: /"appState"\s*:\s*\{/i, confidence: 'medium', reason: 'Excalidraw appState object' },
    ],
  },
  // Lucidchart - CSV with specific headers
  {
    format: 'lucidchart',
    patterns: [
      { regex: /^Id,Name,Shape Library/m, confidence: 'high', reason: 'Lucidchart CSV header' },
      { regex: /^"?Id"?,"?Name"?,"?Shape Library"?/m, confidence: 'high', reason: 'Lucidchart CSV header (quoted)' },
    ],
  },
  // Structurizr - DSL with workspace keyword
  {
    format: 'structurizr',
    patterns: [
      { regex: /^\s*workspace\s*(\{|")/im, confidence: 'high', reason: 'Structurizr workspace declaration' },
      { regex: /\bsoftwareSystem\s+"/i, confidence: 'high', reason: 'Structurizr softwareSystem' },
      { regex: /\bcontainer\s+"/i, confidence: 'medium', reason: 'Structurizr container' },
      { regex: /\bmodel\s*\{/i, confidence: 'medium', reason: 'Structurizr model block' },
    ],
  },
  // Mermaid - specific diagram type declarations
  {
    format: 'mermaid',
    patterns: [
      { regex: /^%%\{init:/m, confidence: 'high', reason: 'Mermaid init directive' },
      { regex: /^graph\s+(TB|BT|LR|RL|TD)\b/m, confidence: 'high', reason: 'Mermaid graph directive' },
      { regex: /^flowchart\s+(TB|BT|LR|RL|TD)\b/m, confidence: 'high', reason: 'Mermaid flowchart directive' },
      { regex: /^sequenceDiagram\b/m, confidence: 'high', reason: 'Mermaid sequence diagram' },
      { regex: /^classDiagram\b/m, confidence: 'high', reason: 'Mermaid class diagram' },
      { regex: /^stateDiagram(-v2)?\b/m, confidence: 'high', reason: 'Mermaid state diagram' },
      { regex: /^erDiagram\b/m, confidence: 'high', reason: 'Mermaid ER diagram' },
      { regex: /^gantt\b/m, confidence: 'high', reason: 'Mermaid Gantt chart' },
      { regex: /^pie\b/m, confidence: 'high', reason: 'Mermaid pie chart' },
      { regex: /^mindmap\b/m, confidence: 'high', reason: 'Mermaid mindmap' },
      { regex: /^journey\b/m, confidence: 'high', reason: 'Mermaid user journey' },
      { regex: /^gitGraph\b/m, confidence: 'high', reason: 'Mermaid git graph' },
      { regex: /^C4Context\b/m, confidence: 'high', reason: 'Mermaid C4 context' },
      { regex: /^quadrantChart\b/m, confidence: 'high', reason: 'Mermaid quadrant chart' },
      { regex: /^requirementDiagram\b/m, confidence: 'high', reason: 'Mermaid requirement diagram' },
      // Medium confidence - arrow syntax (could be other formats)
      { regex: /\s*-->|==>|-.->|-\.->|-->/m, confidence: 'medium', reason: 'Mermaid arrow syntax' },
      { regex: /\[\[.*\]\]|\(\(.*\)\)|\{\{.*\}\}/m, confidence: 'medium', reason: 'Mermaid node shape syntax' },
    ],
  },
  // DOT (Graphviz) - graph/digraph declarations
  {
    format: 'dot',
    patterns: [
      { regex: /^\s*strict\s+(di)?graph\b/im, confidence: 'high', reason: 'DOT strict graph declaration' },
      { regex: /^\s*(di)?graph\s+(\w+\s*)?\{/im, confidence: 'high', reason: 'DOT graph declaration' },
      { regex: /^\s*(di)?graph\s*\{/im, confidence: 'high', reason: 'DOT anonymous graph' },
      { regex: /\bnode\s*\[/m, confidence: 'medium', reason: 'DOT node attributes' },
      { regex: /\bedge\s*\[/m, confidence: 'medium', reason: 'DOT edge attributes' },
      { regex: /\brankdir\s*=/i, confidence: 'medium', reason: 'DOT rankdir attribute' },
    ],
  },
  // D2 - specific D2 syntax
  {
    format: 'd2',
    patterns: [
      { regex: /^direction:\s*(up|down|left|right)\b/im, confidence: 'high', reason: 'D2 direction directive' },
      { regex: /\.style\.(fill|stroke|font-color|opacity)/m, confidence: 'high', reason: 'D2 style property' },
      { regex: /\.shape:\s*(rectangle|oval|circle|diamond|hexagon|cloud)/m, confidence: 'high', reason: 'D2 shape property' },
      { regex: /:\s*\|[^|]+\|/m, confidence: 'medium', reason: 'D2 label syntax' },
      { regex: /\bclasses:\s*\{/m, confidence: 'medium', reason: 'D2 classes block' },
      { regex: /\.class:\s*\w+/m, confidence: 'medium', reason: 'D2 class assignment' },
    ],
  },
];

/**
 * Detect the format of a diagram from its source code
 * 
 * @param code - The diagram source code to analyze
 * @returns Detection result with format, confidence level, and reason
 * 
 * @example
 * ```typescript
 * const result = detectFormat('graph TD\n  A --> B');
 * // { format: 'mermaid', confidence: 'high', reason: 'Mermaid graph directive' }
 * 
 * const result2 = detectFormat('@startuml\nAlice -> Bob\n@enduml');
 * // { format: 'plantuml', confidence: 'high', reason: 'PlantUML start tag' }
 * ```
 */
export function detectFormat(code: string): DetectionResult {
  const trimmed = code.trim();

  if (!trimmed) {
    return {
      format: null,
      confidence: 'low',
      reason: 'Empty input',
    };
  }

  // Check each format's patterns
  for (const { format, patterns } of FORMAT_PATTERNS) {
    for (const { regex, confidence, reason } of patterns) {
      if (regex.test(trimmed)) {
        return { format, confidence, reason };
      }
    }
  }

  return {
    format: null,
    confidence: 'low',
    reason: 'No matching format detected',
  };
}

/**
 * Simple format detection that returns just the format or null
 * 
 * @param code - The diagram source code to analyze
 * @returns The detected format or null if unknown
 * 
 * @example
 * ```typescript
 * const format = detectFormatSimple('graph TD\n  A --> B');
 * // 'mermaid'
 * ```
 */
export function detectFormatSimple(code: string): InputFormat | null {
  return detectFormat(code).format;
}

/**
 * Check if the code matches a specific format
 * 
 * @param code - The diagram source code to analyze
 * @param format - The format to check against
 * @returns True if the code appears to be in the specified format
 */
export function isFormat(code: string, format: InputFormat): boolean {
  const result = detectFormat(code);
  return result.format === format;
}

/**
 * Get all possible format matches with their confidence levels
 * Useful when multiple formats could match
 * 
 * @param code - The diagram source code to analyze
 * @returns Array of all matching formats with confidence levels
 */
export function detectAllFormats(code: string): DetectionResult[] {
  const trimmed = code.trim();
  const results: DetectionResult[] = [];

  if (!trimmed) {
    return results;
  }

  for (const { format, patterns } of FORMAT_PATTERNS) {
    for (const { regex, confidence, reason } of patterns) {
      if (regex.test(trimmed)) {
        results.push({ format, confidence, reason });
        break; // Only add first match per format
      }
    }
  }

  // Sort by confidence (high > medium > low)
  const confidenceOrder = { high: 0, medium: 1, low: 2 };
  results.sort((a, b) => confidenceOrder[a.confidence] - confidenceOrder[b.confidence]);

  return results;
}
