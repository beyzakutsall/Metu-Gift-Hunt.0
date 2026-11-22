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

export interface ModelCredit {
  title: string
  author: string
  source: string
  license: string
  licenseUrl: string
  changes: string
}

export interface FoundItem extends ItemBase {
  name: string
  credit: ModelCredit
}

/** A locked item carries no name, credit or model: the server withholds them until it is found. */
export type CollectionItem =
  | (ItemBase & { foundAt: null; name: null; credit: null })
  | (FoundItem & { foundAt: string })

export interface StudentProfile {
  searches: Allowance
  hides: Allowance
  resetsAt: string
  items: CollectionItem[]
}

export interface StudentService {
  getProfile(): Promise<StudentProfile>
}
