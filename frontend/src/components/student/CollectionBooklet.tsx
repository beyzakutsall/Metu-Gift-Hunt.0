import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import type { CollectionItem } from '../../types/student'
import { CHAPTERS } from './chapters'
import { StickerCard } from './StickerCard'

const arrow =
  'grid size-11 place-items-center rounded-full border border-edge bg-surface transition hover:bg-mint aria-disabled:cursor-default aria-disabled:opacity-35 aria-disabled:hover:bg-surface'

interface Props {
  items: CollectionItem[]
  /** A sticker just unlocked: the booklet opens on it. */
  highlight?: Pick<CollectionItem, 'id' | 'chapter'>
}

export function CollectionBooklet({ items, highlight }: Props) {
  // An open book on wide screens, one page at a time on narrow ones.
  const pagesShown = useMediaQuery('(min-width: 64rem)') ? 2 : 1
  const [selected, setSelected] = useState(() =>
    Math.max(0, CHAPTERS.findIndex((chapter) => chapter.id === highlight?.chapter)),
  )
  const book = useRef<HTMLDivElement>(null)
  const highlightId = highlight?.id
  useEffect(() => {
    if (highlightId) book.current?.querySelector('[data-new]')?.scrollIntoView({ block: 'center' })
  }, [highlightId])

  const first = selected - (selected % pagesShown)
  const visible = CHAPTERS.slice(first, first + pagesShown)
  const atStart = first === 0
  const atEnd = first + pagesShown >= CHAPTERS.length
  const label = pagesShown === 2 ? `Pages ${first + 1}–${first + 2}` : `Page ${first + 1}`

  return (
    <section aria-labelledby="booklet-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="booklet-title" className="text-title">
            My collection booklet
          </h2>
          <p className="text-ink-soft">Every sticker stays a mystery until you find it.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* aria-disabled keeps keyboard focus on the arrow at the first and last page */}
          <button
            type="button"
            aria-label="Previous page"
            aria-disabled={atStart || undefined}
            onClick={() => !atStart && setSelected(first - pagesShown)}
            className={arrow}
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <p aria-live="polite" className="min-w-28 text-center text-caption font-bold">
            {label} of {CHAPTERS.length}
          </p>
          <button
            type="button"
            aria-label="Next page"
            aria-disabled={atEnd || undefined}
            onClick={() => !atEnd && setSelected(first + pagesShown)}
            className={arrow}
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>
      </div>

      <nav aria-label="Booklet chapters" className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:px-6">
        {CHAPTERS.map(({ id, title, color }, index) => {
          const open = visible.some((chapter) => chapter.id === id)
          return (
            <button
              key={id}
              type="button"
              aria-pressed={open}
              onClick={() => setSelected(index)}
              className={`min-h-11 rounded-control px-2 py-2 text-caption font-bold transition-colors sm:rounded-b-none ${
                open ? color : 'bg-line/60 hover:bg-line'
              }`}
            >
              {title}
            </button>
          )
        })}
      </nav>

      <div ref={book} className="mt-2 rounded-card bg-forest p-2 shadow-book sm:mt-0 sm:p-3">
        <div key={first} className="relative grid animate-page-turn lg:grid-cols-2">
          {visible.map(({ id, title, subtitle, color }, index) => {
            const stickers = items.filter((item) => item.chapter === id)
            const found = stickers.filter((item) => item.foundAt !== null).length
            return (
              <article
                key={id}
                aria-label={title}
                className={`min-w-0 rounded-[1.25rem] bg-paper p-4 sm:p-6 ${
                  index === 0 ? 'lg:rounded-r-md lg:border-r lg:border-line lg:pr-9' : 'lg:rounded-l-md lg:pl-9'
                }`}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-2xl font-bold">{title}</h3>
                    <p className="text-caption text-ink-soft">{subtitle}</p>
                  </div>
                  <p className={`shrink-0 rounded-full px-3 py-1 text-caption font-bold ${color}`}>
                    {found} / {stickers.length}
                    <span className="sr-only"> found</span>
                  </p>
                </div>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                  {stickers.map((item) => (
                    <StickerCard key={item.id} item={item} color={color} isNew={item.id === highlightId} />
                  ))}
                </ul>
              </article>
            )
          })}

          {/* binder rings */}
          <div aria-hidden className="pointer-events-none absolute inset-y-10 left-1/2 hidden -translate-x-1/2 flex-col justify-between lg:flex">
            {Array.from({ length: 7 }, (_, ring) => (
              <span key={ring} className="h-3 w-10 rounded-full border-2 border-edge bg-line" />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
