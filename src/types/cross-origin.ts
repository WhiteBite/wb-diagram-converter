/**
 * Cross-Origin Message Types
 * 
 * Types for communication between wb-diagram-converter-web and wb-diagram-board
 * via postMessage API (works across different origins on GitHub Pages)
 */

import type { Diagram } from './ir';

// =============================================================================
// Message Types
// =============================================================================

/** Start editing session - sent from Converter to Board */
export interface EditSessionStartMessage {
  readonly type: 'wb-edit-session-start';
  readonly sessionId: string;
  readonly diagram: Diagram;
  readonly sourceFormat: DiagramFormat;
  readonly returnFormat?: DiagramFormat;
  readonly timestamp: number;
}

/** Edit session result - sent from Board to Converter */
export interface EditSessionResultMessage {
  readonly type: 'wb-edit-session-result';
  readonly sessionId: string;
  readonly diagram: Diagram;
  readonly code: string;
  readonly format: DiagramFormat;
  readonly timestamp: number;
}

/** Cancel edit session - sent from Board to Converter */
export interface EditSessionCancelMessage {
  readonly type: 'wb-edit-session-cancel';
  readonly sessionId: string;
  readonly timestamp: number;
}

/** Ready signal - sent from Board to Converter when ready to receive data */
export interface EditSessionReadyMessage {
  readonly type: 'wb-edit-session-ready';
  readonly sessionId: string;
  readonly timestamp: number;
}

/** Union of all message types */
export type CrossOriginMessage =
  | EditSessionStartMessage
  | EditSessionResultMessage
  | EditSessionCancelMessage
  | EditSessionReadyMessage;

// =============================================================================
// Supporting Types
// =============================================================================

/** Supported diagram formats */
export type DiagramFormat = 
  | 'mermaid'
  | 'plantuml'
  | 'dot'
  | 'drawio'
  | 'excalidraw';

/** Edit mode configuration passed via URL */
export interface EditModeParams {
  readonly mode: 'edit';
  readonly sessionId: string;
  readonly openerOrigin: string;
  /** Compressed diagram data for small diagrams */
  readonly data?: string;
}

// =============================================================================
// Type Guards
// =============================================================================

/** Check if message is a valid cross-origin message */
export function isCrossOriginMessage(data: unknown): data is CrossOriginMessage {
  if (typeof data !== 'object' || data === null) return false;
  const msg = data as Record<string, unknown>;
  return (
    typeof msg.type === 'string' &&
    msg.type.startsWith('wb-edit-session-') &&
    typeof msg.sessionId === 'string'
  );
}

/** Check if message is EditSessionStart */
export function isEditSessionStart(msg: CrossOriginMessage): msg is EditSessionStartMessage {
  return msg.type === 'wb-edit-session-start';
}

/** Check if message is EditSessionResult */
export function isEditSessionResult(msg: CrossOriginMessage): msg is EditSessionResultMessage {
  return msg.type === 'wb-edit-session-result';
}

/** Check if message is EditSessionCancel */
export function isEditSessionCancel(msg: CrossOriginMessage): msg is EditSessionCancelMessage {
  return msg.type === 'wb-edit-session-cancel';
}

/** Check if message is EditSessionReady */
export function isEditSessionReady(msg: CrossOriginMessage): msg is EditSessionReadyMessage {
  return msg.type === 'wb-edit-session-ready';
}

// =============================================================================
// Message Creators
// =============================================================================

/** Create EditSessionStart message */
export function createEditSessionStart(
  sessionId: string,
  diagram: Diagram,
  sourceFormat: DiagramFormat,
  returnFormat?: DiagramFormat
): EditSessionStartMessage {
  return {
    type: 'wb-edit-session-start',
    sessionId,
    diagram,
    sourceFormat,
    returnFormat: returnFormat ?? sourceFormat,
    timestamp: Date.now(),
  };
}

/** Create EditSessionResult message */
export function createEditSessionResult(
  sessionId: string,
  diagram: Diagram,
  code: string,
  format: DiagramFormat
): EditSessionResultMessage {
  return {
    type: 'wb-edit-session-result',
    sessionId,
    diagram,
    code,
    format,
    timestamp: Date.now(),
  };
}

/** Create EditSessionCancel message */
export function createEditSessionCancel(sessionId: string): EditSessionCancelMessage {
  return {
    type: 'wb-edit-session-cancel',
    sessionId,
    timestamp: Date.now(),
  };
}

/** Create EditSessionReady message */
export function createEditSessionReady(sessionId: string): EditSessionReadyMessage {
  return {
    type: 'wb-edit-session-ready',
    sessionId,
    timestamp: Date.now(),
  };
}
