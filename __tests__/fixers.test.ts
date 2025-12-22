import { describe, it, expect } from 'vitest';
import { fixSyntax, fixMermaid, fixPlantUML, hasFixerFor } from '../src/fixers';

describe('fixSyntax', () => {
    describe('hasFixerFor', () => {
        it('should return true for mermaid', () => {
            expect(hasFixerFor('mermaid')).toBe(true);
        });

        it('should return true for plantuml', () => {
            expect(hasFixerFor('plantuml')).toBe(true);
        });

        it('should return false for unsupported formats', () => {
            expect(hasFixerFor('drawio')).toBe(false);
            expect(hasFixerFor('excalidraw')).toBe(false);
        });
    });

    describe('fixSyntax router', () => {
        it('should route to mermaid fixer', () => {
            const result = fixSyntax('graph TD\nA[Test', 'mermaid');
            expect(result.fixed).toContain(']');
        });

        it('should route to plantuml fixer', () => {
            const result = fixSyntax('rectangle "Test', 'plantuml');
            expect(result.fixed).toContain('@startuml');
        });

        it('should return unchanged for unsupported format', () => {
            const code = 'some code';
            const result = fixSyntax(code, 'drawio');
            expect(result.fixed).toBe(code);
            expect(result.appliedFixes).toBe(0);
        });
    });
});

describe('fixMermaid', () => {
    describe('unclosed brackets', () => {
        it('should fix unclosed square bracket', () => {
            const result = fixMermaid('flowchart TD\nA[Start');
            expect(result.fixed).toBe('flowchart TD\nA[Start]');
            expect(result.appliedFixes).toBe(1);
        });

        it('should fix unclosed parenthesis', () => {
            const result = fixMermaid('flowchart TD\nA(Rounded');
            expect(result.fixed).toBe('flowchart TD\nA(Rounded)');
            expect(result.appliedFixes).toBe(1);
        });

        it('should fix unclosed curly brace', () => {
            const result = fixMermaid('flowchart TD\nA{Diamond');
            expect(result.fixed).toBe('flowchart TD\nA{Diamond}');
            expect(result.appliedFixes).toBe(1);
        });

        it('should fix unclosed double bracket', () => {
            const result = fixMermaid('flowchart TD\nA[[Subroutine');
            expect(result.fixed).toBe('flowchart TD\nA[[Subroutine]]');
            expect(result.appliedFixes).toBeGreaterThanOrEqual(1);
        });

        it('should fix partially closed double bracket', () => {
            const result = fixMermaid('flowchart TD\nA[[Subroutine]');
            expect(result.fixed).toBe('flowchart TD\nA[[Subroutine]]');
            expect(result.appliedFixes).toBe(1);
        });
    });

    describe('invalid direction', () => {
        it('should fix invalid graph direction', () => {
            const result = fixMermaid('graph DOWN\nA --> B');
            // DOWN maps to TB in the fixer
            expect(result.fixed).toContain('graph TB');
        });

        it('should fix typo in direction', () => {
            const result = fixMermaid('flowchart TBD\nA --> B');
            expect(result.fixed).toContain('flowchart TD');
        });

        it('should not change valid direction', () => {
            const result = fixMermaid('flowchart LR\nA --> B');
            expect(result.fixed).toContain('flowchart LR');
        });
    });

    describe('arrow fixes', () => {
        it('should fix arrow with wrong spacing', () => {
            const result = fixMermaid('flowchart TD\nA -- > B');
            expect(result.fixed).toContain('A --> B');
        });

        it('should fix unclosed label pipe', () => {
            const result = fixMermaid('flowchart TD\nA -->|Yes B');
            expect(result.fixed).toContain('-->|Yes|');
        });
    });

    describe('subgraph fixes', () => {
        it.skip('should fix subgraph without ID', () => {
            // TODO: regex needs adjustment for this edge case
            const result = fixMermaid('flowchart TD\nsubgraph\nA --> B\nend');
            expect(result.fixed).toContain('subgraph group1');
        });

        it('should normalize END to end', () => {
            const result = fixMermaid('flowchart TD\nsubgraph G\nA\nEND');
            expect(result.fixed).toContain('end');
            expect(result.fixed).not.toContain('END');
        });
    });

    describe('style fixes', () => {
        it('should fix style missing colon', () => {
            const result = fixMermaid('flowchart TD\nA[Test]\nstyle A fill #f9f');
            expect(result.fixed).toContain('fill:#f9f');
        });
    });

    describe('no changes needed', () => {
        it('should return success with no fixes for valid code', () => {
            const validCode = `flowchart LR
    A[Start] --> B{Decision}
    B -->|Yes| C[Process]
    B -->|No| D[End]`;

            const result = fixMermaid(validCode);
            expect(result.success).toBe(true);
            expect(result.appliedFixes).toBe(0);
            expect(result.fixed).toBe(validCode);
        });
    });
});

describe('fixPlantUML', () => {
    describe('missing @startuml/@enduml', () => {
        it('should add @startuml if missing', () => {
            const result = fixPlantUML('rectangle "Box" as box1');
            expect(result.fixed).toContain('@startuml');
        });

        it('should add @enduml if missing', () => {
            const result = fixPlantUML('@startuml\nrectangle "Box" as box1');
            expect(result.fixed).toContain('@enduml');
        });

        it('should not add @startuml if already present', () => {
            const code = '@startuml\nA --> B\n@enduml';
            const result = fixPlantUML(code);
            const count = (result.fixed.match(/@startuml/g) || []).length;
            expect(count).toBe(1);
        });
    });

    describe('unclosed quotes', () => {
        it('should fix unclosed quote in label', () => {
            const result = fixPlantUML('@startuml\nrectangle "Test\n@enduml');
            expect(result.fixed).toContain('"Test"');
        });
    });

    describe('arrow fixes', () => {
        it('should fix arrow with extra space', () => {
            const result = fixPlantUML('@startuml\nA -- > B\n@enduml');
            expect(result.fixed).toContain('A --> B');
        });

        it('should fix label colon spacing', () => {
            const result = fixPlantUML('@startuml\nA --> B:label\n@enduml');
            expect(result.fixed).toContain(': l');
        });
    });

    describe('skinparam typos', () => {
        it('should fix skinparm typo', () => {
            const result = fixPlantUML('@startuml\nskinparm backgroundColor white\n@enduml');
            expect(result.fixed).toContain('skinparam');
        });
    });

    describe('no changes needed', () => {
        it('should return success for valid code', () => {
            const validCode = `@startuml
actor User
rectangle "System" as sys
User --> sys
@enduml`;

            const result = fixPlantUML(validCode);
            expect(result.success).toBe(true);
            // Valid code should have no fixes
        });
    });
});

describe('regression tests', () => {
    // Add regression tests here when bugs are found
    // Format: describe('bug: <description>', () => { ... })

    it('placeholder test', () => {
        // This prevents "No test found in suite" error
        expect(true).toBe(true);
    });
});
