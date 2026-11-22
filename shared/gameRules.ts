// Also enforced by CHECK constraints in backend/migrations. A test keeps the two in step.
export const DAILY_LIMITS = { search: 2, hide: 3 } as const

/** Daily allowances reset at midnight on campus, wherever the server runs. */
export const CAMPUS_TIME_ZONE = 'Europe/Istanbul'
