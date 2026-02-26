/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { convert } from '../src/index';
import {
    ALL_ROUNDTRIP_FORMATS,
    createSeedSource,
    parseByFormat,
    assertNoDanglingEdges,
    getDiagramSignature,
    subsetDifference,
} from './helpers/roundtrip-matrix';

const LOSSY_FIDELITY_FORMATS = new Set(['dot', 'excalidraw', 'structurizr']);

describe('Round-trip matrix integrity (A -> B -> A)', () => {
    for (const from of ALL_ROUNDTRIP_FORMATS) {
        for (const to of ALL_ROUNDTRIP_FORMATS) {
            if (from === to) continue;

            it(`should preserve connectivity ${from} -> ${to} -> ${from}`, () => {
                const source = createSeedSource(from);

                const originalDiagram = parseByFormat(from, source);
                assertNoDanglingEdges(originalDiagram);
                const originalSignature = getDiagramSignature(originalDiagram);

                const step1 = convert(source, { from, to });
                const intermediateDiagram = parseByFormat(to, step1.output);
                assertNoDanglingEdges(intermediateDiagram);

                const step2 = convert(step1.output, { from: to, to: from });
                const finalDiagram = parseByFormat(from, step2.output);
                assertNoDanglingEdges(finalDiagram);

                // Core invariant for ALL format pairs: no edge loss in round-trip.
                // This is the primary signal for "broken links".
                expect(
                    finalDiagram.edges.length,
                    `Edge count changed after round-trip ${from} -> ${to} -> ${from}`
                ).toBe(originalDiagram.edges.length);

                // Secondary strict fidelity checks are only reliable for non-lossy formats.
                if (LOSSY_FIDELITY_FORMATS.has(from) || LOSSY_FIDELITY_FORMATS.has(to)) {
                    return;
                }

                const finalSignature = getDiagramSignature(finalDiagram);

                const missingNodes = subsetDifference(
                    originalSignature.nodes,
                    finalSignature.nodes
                );
                const missingEdges = subsetDifference(
                    originalSignature.edges,
                    finalSignature.edges
                );

                expect(
                    missingNodes,
                    `Missing node labels after round-trip ${from} -> ${to} -> ${from}`
                ).toEqual([]);

                expect(
                    missingEdges,
                    `Missing edges after round-trip ${from} -> ${to} -> ${from}`
                ).toEqual([]);
            });
        }
    }
});
