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

// Camera matching. Calibrate on campus with `npm run match:test -w backend`; these are the only numbers to change.
/** Photos the hider takes of the spot. */
export const SCENE_PHOTOS = 3
/** Longest edge, in pixels, of every photo and camera frame used for matching. */
export const MATCH_EDGE = 640
/** A spot photo needs at least this many distinctive points, or it's too plain to recognise. */
export const SCENE_MIN_KEYPOINTS = 150
/** Geometrically consistent matches a frame needs with one of the spot photos to count. */
export const MATCH_MIN_INLIERS = 25
/** Frames in a row that must match. One lucky frame isn't enough. */
export const MATCH_STREAK = 2
/** Frames tried before the riddle opens as a fallback, so the camera is always tried first. */
export const FALLBACK_MIN_FRAMES = 20
/** How often the browser sends a frame. Render's free CPU is small, so not faster. */
export const FRAME_INTERVAL_MS = 1500
export const FRAME_MAX_BYTES = 400 * 1024

// Location sanity checks. Readings that fail them are refused, never stored.
/** Faster than a bike on campus paths, after GPS error is allowed for. */
export const MAX_SPEED_MPS = 15
/** Seconds between arriving and finding, so a teleporting script can't grab a gift. */
export const MIN_FIND_SECONDS = 20
/** Real phones never report better than this. */
export const MIN_ACCURACY = 1
