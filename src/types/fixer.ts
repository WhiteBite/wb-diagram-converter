/**
 * Syntax Fixer Types
 * 
 * Types for rule-based syntax error detection and fixing
 */

import type { InputFormat } from './ir';

/** Syntax error found in diagram code */
export interface SyntaxError {
    line: number;
    column?: number;
    message: string;
    severity: 'error' | 'warning';
    ruleId: string;
}

/** Suggested fix for a syntax error */
export interface FixSuggestion {
    ruleId: string;
    description: string;
    original: string;
    fixed: string;
    line: number;
    confidence: FixConfidence;
}

/** Confidence level for a fix */
export type FixConfidence = 'high' | 'medium' | 'low';

/** Result of syntax fixing */
export interface FixResult {
    success: boolean;
    original: string;
    fixed: string;
    errors: SyntaxError[];
    suggestions: FixSuggestion[];
    appliedFixes: number;
}

/** Context passed to fix rules */
export interface FixContext {
    lines: string[];
    lineIndex: number;
    format: InputFormat;
    fullSource: string;
}

/** Single fix rule definition */
export interface FixRule {
    id: string;
    description: string;
    /** Pattern to match problematic code */
    pattern: RegExp;
    /** Fix function - returns fixed line or null if can't fix */
    fix: (match: RegExpMatchArray, line: string, context: FixContext) => string | null;
    /** How confident we are in this fix */
    confidence: FixConfidence;
    /** Optional: only apply to specific line types */
    lineFilter?: (line: string, context: FixContext) => boolean;
}

/** Fixer interface for each format */
export interface Fixer {
    format: InputFormat;
    rules: FixRule[];
    fix(source: string): FixResult;
    validate(source: string): SyntaxError[];
}
