import { LockKeyhole } from 'lucide-react'
import type { CollectionItem } from '../../types/student'

// What's under the blur is a decoy. The real sticker isn't in the browser until it is found.
const DECOYS = ['🎁', '🦊', '🍉', '🪁', '🐠', '🌻', '🎨', '🦋', '🍩', '🐸', '🎈']

const date = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/Istanbul' })

export function StickerCard({ item, color }: { item: CollectionItem; color: string }) {
  const number = String(item.id).padStart(2, '0')

  if (item.foundAt === null) {
    return (
      <li data-state="locked" className="min-w-0">
        <div className="relative grid aspect-square place-items-center overflow-hidden rounded-control border-2 border-dashed border-edge/50">
          <span aria-hidden className={`absolute inset-0 opacity-30 ${color}`} />
          <span aria-hidden className="scale-125 text-6xl opacity-80 blur-[9px] select-none">
            {DECOYS[item.id % DECOYS.length]}
          </span>
          <span className="absolute grid size-10 place-items-center rounded-full bg-surface shadow-pill">
            <LockKeyhole className="size-5" aria-hidden />
          </span>
        </div>
        <p className="mt-1.5 text-center text-caption leading-tight">
          <strong className="block">Locked</strong>
          <span className="text-ink-soft">No. {number}</span>
        </p>
      </li>
    )
  }

  return (
    <li data-state="found" className="min-w-0">
      <div
        className={`grid aspect-square place-items-center rounded-control border-4 border-surface shadow-pill transition-transform duration-200 hover:scale-105 ${color} ${
          item.id % 2 ? '-rotate-2' : 'rotate-2'
        }`}
      >
        <span aria-hidden className="text-6xl select-none">
          {item.emoji}
        </span>
      </div>
      <p className="mt-1.5 text-center text-caption leading-tight">
        <strong className="block break-words">{item.name}</strong>
        <span className="text-ink-soft">Found {date.format(new Date(item.foundAt))}</span>
      </p>
    </li>
  )
}
