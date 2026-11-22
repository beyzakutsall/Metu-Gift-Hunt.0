import type { FoundItem } from './student'

export interface Hunt {
  id: string
  location: { key: string; name: string; fullName: string; latitude: number; longitude: number }
  expiresAt: string
  arrived: boolean
  /** Both null until the server has seen the student at the building. */
  clue: string | null
  riddle: string | null
  attemptsLeft: number
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

export interface HuntService {
  current(): Promise<{ hunt: Hunt | null; available: boolean }>
  start(): Promise<Hunt>
  checkIn(id: string, fix: Fix): Promise<CheckIn>
  solve(id: string, input: Fix & { answer: string; photo: string }): Promise<Reward>
  giveUp(id: string): Promise<void>
}
