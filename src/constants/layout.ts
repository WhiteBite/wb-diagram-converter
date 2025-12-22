/**
 * Layout constants
 * 
 * Default sizes, spacing, and positioning values
 */

/** Default node dimensions */
export const NODE_SIZE = {
    WIDTH: 120,
    HEIGHT: 60,
    MIN_WIDTH: 40,
    MIN_HEIGHT: 30,
    MAX_WIDTH: 400,
    MAX_HEIGHT: 200,
} as const;

/** Spacing between elements */
export const SPACING = {
    NODE: 50,
    RANK: 70,
    GROUP_PADDING: 20,
    EDGE_LABEL_OFFSET: 10,
} as const;

/** Canvas margins */
export const MARGIN = {
    X: 50,
    Y: 50,
} as const;

/** Grid settings */
export const GRID = {
    SIZE: 20,
    SNAP_THRESHOLD: 10,
} as const;

/** Edge/arrow defaults */
export const EDGE = {
    WIDTH: 2,
    ARROW_SIZE: 10,
    CURVE_RADIUS: 5,
} as const;

/** Font settings */
export const FONT = {
    SIZE: 14,
    FAMILY: 'sans-serif',
    LINE_HEIGHT: 1.4,
} as const;
