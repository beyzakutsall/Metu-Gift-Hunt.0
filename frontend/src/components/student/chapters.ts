import type { ChapterId } from '../../types/student'

export const CHAPTERS: { id: ChapterId; title: string; subtitle: string; color: string }[] = [
  { id: 'creatures', title: 'Creatures', subtitle: 'The real owners of campus', color: 'bg-lilac' },
  { id: 'nature', title: 'Nature', subtitle: 'Forest, seasons and sky', color: 'bg-leaf' },
  { id: 'student-life', title: 'Student life', subtitle: 'Between lectures and after them', color: 'bg-blush' },
  { id: 'adventure', title: 'Adventure', subtitle: 'For those who leave the path', color: 'bg-sun' },
]
