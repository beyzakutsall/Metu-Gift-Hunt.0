import type { ChapterId } from '../../types/student'

export const CHAPTERS: { id: ChapterId; title: string; subtitle: string; color: string }[] = [
  { id: 'creatures', title: 'Cute crew', subtitle: 'Small friends with big eyes', color: 'bg-lilac' },
  { id: 'nature', title: 'Winter wonders', subtitle: 'A little magic for cold days', color: 'bg-sky' },
  { id: 'student-life', title: 'Study break', subtitle: 'Best enjoyed between lectures', color: 'bg-blush' },
  { id: 'adventure', title: 'Rare treasures', subtitle: 'For those who leave the path', color: 'bg-sun' },
]
