import type { Gift } from '../../types/gift'
import { formatTime } from '../notifications/formatTime'
import { AddRiddleForm } from './AddRiddleForm'

interface Props {
  gifts: Gift[]
  selectedId: string | null
  onSelect: (gift: Gift) => void
  onChanged: (gift: Gift) => void
}

function status(gift: Gift) {
  if (gift.foundAt) return { text: 'Found', style: 'bg-leaf' }
  if (!gift.riddle) return { text: 'Needs a riddle', style: 'bg-blush' }
  return { text: 'Waiting to be found', style: 'bg-butter' }
}

export function MyGiftsList({ gifts, selectedId, onSelect, onChanged }: Props) {
  return (
    <section aria-labelledby="my-gifts" className="border-t border-line pt-4">
      <h2 id="my-gifts" className="text-lg">
        Your hidden gifts
      </h2>
      {gifts.length === 0 ? (
        <p className="mt-1 text-caption text-ink-soft">None yet. Only you can see where yours are.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {gifts.map((gift) => {
            const selected = gift.id === selectedId
            const { text, style } = status(gift)
            return (
              <li key={gift.id}>
                <button
                  type="button"
                  data-gift={gift.id}
                  aria-pressed={selected}
                  onClick={() => onSelect(gift)}
                  className={`w-full rounded-control border p-3 text-left text-caption transition-colors ${
                    selected ? 'border-forest bg-mint' : 'border-line hover:bg-paper'
                  }`}
                >
                  <span className="mb-1 flex flex-wrap items-center justify-between gap-1">
                    <strong>{gift.locationName ?? 'Older gift'}</strong>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold text-ink ${style}`}>{text}</span>
                  </span>
                  <span className="block break-words whitespace-pre-wrap">{gift.note}</span>
                  <span className="mt-1 block text-ink">{formatTime(gift.createdAt)}</span>
                </button>

                {selected &&
                  (gift.riddle ? (
                    <div className="space-y-2 px-3 py-2 text-caption">
                      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 [&_dd]:min-w-0 [&_dd]:break-words [&_dt]:font-bold">
                        <dt>Clue</dt>
                        <dd>{gift.clue}</dd>
                        <dt>Riddle</dt>
                        <dd>{gift.riddle}</dd>
                        <dt>Answer</dt>
                        <dd>{gift.answers?.join('; ')}</dd>
                      </dl>
                      {gift.photoUrl && (
                        <img src={gift.photoUrl} alt="Photo taken by the student who found this gift" className="w-full rounded-control" />
                      )}
                    </div>
                  ) : (
                    <AddRiddleForm gift={gift} onSaved={onChanged} />
                  ))}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
