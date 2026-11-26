import type { FoundItem } from '../types/student'

// Mock mode only. Keep the ids in step with frontend/mockCollectionPlugin.ts.
export const MOCK_ITEMS: FoundItem[] = [
  {
    id: 1,
    chapter: 'creatures',
    name: 'Pink Axolotl',
    credit: {
      title: 'Cute Axolotl - Tripo AI vs SupaVoxel',
      author: 'Maya Nakamura',
      source: 'https://sketchfab.com/3d-models/cute-axolotl-tripo-ai-vs-supavoxel-d471cebc1a8446469c45dc7ffbc6e6b2',
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      changes: 'optimized',
    },
  },
  {
    id: 5,
    chapter: 'creatures',
    name: 'Little Reindeer',
    credit: {
      title: 'Christmas cute reindeer',
      author: 'kiiztie',
      source: 'https://sketchfab.com/3d-models/christmas-cute-reindeer-4252a63ee1dd40c6a78c698cf0d3a313',
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      changes: 'optimized',
    },
  },
  {
    id: 6,
    chapter: 'nature',
    name: 'Snow Globe',
    credit: {
      title: 'Snowglobe',
      author: 'jpgrandi',
      source: 'https://sketchfab.com/3d-models/snowglobe-023cd6bbc64c43128e286dff47341489',
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      changes: 'optimized, glass made more visible',
    },
  },
  {
    id: 7,
    chapter: 'nature',
    name: 'Starry Bauble',
    credit: {
      title: 'Christmas Tree Bauble',
      author: 'QuantumBerry',
      source: 'https://sketchfab.com/3d-models/christmas-tree-bauble-a21c89d379594eafa27ed9666d3be060',
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      changes: 'optimized',
    },
  },
  {
    id: 12,
    chapter: 'student-life',
    name: 'Gingerbread Friend',
    credit: {
      title: 'Christmas Cookies Collection',
      author: 'Martini-SF',
      source: 'https://sketchfab.com/3d-models/christmas-cookies-collection-e4a9dabca39144d2afedaf70cd3905e8',
      license: 'CC BY-NC 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-nc/4.0/',
      changes: 'optimized, separated from the set',
    },
  },
]

export const MOCK_REWARD_ID = 7
