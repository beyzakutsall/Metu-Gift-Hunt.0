// Distances are measured to the edge of the target building, not to its centre.

export const HUNT_HOURS = 24
export const MAX_WRONG_ANSWERS = 5

/** Readings less accurate than this (metres) can't reveal the clue. */
export const ARRIVE_MAX_ACCURACY = 100
/** Near enough for the clue: this radius plus some allowance for GPS error. */
export const arrivalRadius = (accuracy: number) => 40 + Math.min(accuracy, 30)

/** Indoors GPS drifts, so solving on the third floor gets more slack. */
export const SOLVE_MAX_ACCURACY = 150
export const solveRadius = (accuracy: number) => 80 + Math.min(accuracy, 70)

/** How old a reading the browser may still submit with the answer. */
export const FIX_MAX_AGE_MS = 10 * 60_000

export const PHOTO_MAX_BYTES = 3 * 1024 * 1024
export const PHOTO_MAX_EDGE = 1600
