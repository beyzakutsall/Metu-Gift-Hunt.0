export interface Gift {
  id: string
  latitude: number
  longitude: number
  note: string
  createdAt: string
  /** null on gifts hidden before searching existed, until the hider adds a riddle. */
  locationName: string | null
  /** null on gifts hidden before the camera came. */
  floor: string | null
  clue: string | null
  riddle: string | null
  answers: string[] | null
  foundAt: string | null
  photoUrl: string | null
}

export interface PuzzleInput {
  clue: string
  riddle: string
  /** Alternatives are separated with a semicolon. */
  answer: string
}

export interface HideGiftInput extends PuzzleInput {
  requestId: string
  latitude: number
  longitude: number
  note: string
  floor: string
  /** Where the hider is standing: they must be at the building. */
  location: { latitude: number; longitude: number; accuracy: number }
  /** Base64 JPEGs of the spot, from three angles. */
  photos: string[]
}

export interface GiftService {
  listMine(): Promise<Gift[]>
  hide(input: HideGiftInput): Promise<Gift>
  addPuzzle(id: string, input: PuzzleInput): Promise<Gift>
}
