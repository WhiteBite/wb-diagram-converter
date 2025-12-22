/**
 * Timing constants
 * 
 * Timeouts, debounce delays, animation durations
 */

/** Debounce delays in milliseconds */
export const DEBOUNCE = {
    INPUT: 300,
    RESIZE: 150,
    SEARCH: 200,
} as const;

/** Animation durations in milliseconds */
export const ANIMATION = {
    FAST: 150,
    NORMAL: 200,
    SLOW: 300,
    TRANSITION: 200,
} as const;

/** Timeout values in milliseconds */
export const TIMEOUT = {
    TOAST: 3000,
    NOTIFICATION: 5000,
    REQUEST: 10000,
    RENDER: 5000,
} as const;

/** Retry settings */
export const RETRY = {
    MAX_ATTEMPTS: 3,
    DELAY: 1000,
    BACKOFF_MULTIPLIER: 2,
} as const;
