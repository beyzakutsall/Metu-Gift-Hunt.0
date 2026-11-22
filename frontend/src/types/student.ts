export type ChapterId = 'creatures' | 'nature' | 'student-life' | 'adventure'

export interface Allowance {
  today: number
  limit: number
  total: number
}

interface ItemBase {
  id: number
  chapter: ChapterId
}

/** A locked item carries no name or emoji: the server withholds them until it is found. */
export type CollectionItem = ItemBase &
  ({ foundAt: null; name: null; emoji: null } | { foundAt: string; name: string; emoji: string })

export interface StudentProfile {
  searches: Allowance
  hides: Allowance
  resetsAt: string
  items: CollectionItem[]
}

export interface StudentService {
  getProfile(): Promise<StudentProfile>
}
