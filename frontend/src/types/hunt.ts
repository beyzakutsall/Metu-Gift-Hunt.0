import type { FoundItem } from './student'

export interface Hunt {
  id: string
  location: { key: string; name: string; fullName: string; latitude: number; longitude: number }
  expiresAt: string
  arrived: boolean
  /** All null until the server has seen the student at the building. */
  floor: string | null
  clue: string | null
  riddle: string | null
  attemptsLeft: number
  /** Camera frames tried. The riddle opens after FALLBACK_MIN_FRAMES. */
  framesTried: number
}

export interface Fix {
  latitude: number
  longitude: number
  accuracy: number
}

export interface CheckIn {
  hunt: Hunt
  /** Metres to the building, rounded. */
  distance: number
  accurate: boolean
}

export interface Reward {
  item: FoundItem
  note: string
}

/** How a camera frame went. Never a score: only how many matches in a row. */
export type FrameResult =
  | { found: Reward }
  | { found: null; matched: boolean; streak: number; needed: number; framesTried: number }

export interface HuntService {
  current(): Promise<{ hunt: Hunt | null; available: boolean }>
  start(): Promise<Hunt>
  checkIn(id: string, fix: Fix): Promise<CheckIn>
  frame(id: string, input: Fix & { frame: string }): Promise<FrameResult>
  /** The riddle, once the camera has had a fair try. */
  solve(id: string, input: Fix & { answer: string }): Promise<Reward>
  giveUp(id: string): Promise<void>
}
