import { LockKeyhole, Rotate3d } from 'lucide-react'
import { collectionAsset } from '../../services/collectionAssets'
import type { CollectionItem, FoundItem } from '../../types/student'

// What's under the blur is a decoy. The real model isn't in the browser until it is found.
const DECOYS = ['🎁', '🦊', '🍉', '🪁', '🐠', '🌻', '🎨', '🦋', '🍩', '🐸', '🎈']

const date = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/Istanbul' })

interface Props {
  item: CollectionItem
  color: string
  isNew?: boolean
  onView: (item: FoundItem & { foundAt: string }, from: DOMRect) => void
}

export function CollectibleCard({ item, color, isNew = false, onView }: Props) {
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
    <li data-state="found" data-new={isNew || undefined} className="min-w-0">
      <button
        type="button"
        aria-label={`Explore ${item.name} in 3D`}
        onClick={(event) => onView(item, event.currentTarget.getBoundingClientRect())}
        className={`relative grid aspect-square w-full place-items-center overflow-hidden rounded-control border-4 border-surface shadow-pill transition-transform duration-200 hover:scale-105 ${color} ${isNew ? 'ring-4 ring-coral ring-offset-1 ring-offset-paper' : ''} ${
          item.id % 2 ? '-rotate-2' : 'rotate-2'
        }`}
      >
        <img src={collectionAsset(item.id, 'preview')} alt="" draggable={false} className="size-full object-contain" />
        <span aria-hidden className="absolute right-1.5 bottom-1.5 inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-xs font-bold">
          <Rotate3d className="size-3.5" />
          3D
        </span>
      </button>
      <p className="mt-1.5 text-center text-caption leading-tight">
        <strong className="block break-words">{item.name}</strong>
        <span className="text-ink-soft">{isNew ? 'New! ' : ''}Found {date.format(new Date(item.foundAt))}</span>
      </p>
    </li>
  )
}
