import type { Gift } from '../../types/gift'
import { formatTime } from '../notifications/formatTime'

interface Props {
  gifts: Gift[]
  selectedId: string | null
  onSelect: (gift: Gift) => void
}

export function MyGiftsList({ gifts, selectedId, onSelect }: Props) {
  return (
    <section aria-labelledby="my-gifts" className="border-t border-line pt-4">
      <h2 id="my-gifts" className="text-lg">
        Your hidden gifts
      </h2>
      {gifts.length === 0 ? (
        <p className="mt-1 text-caption text-ink-soft">None yet. Only you can see where yours are.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {gifts.map((gift) => (
            <li key={gift.id}>
              <button
                type="button"
                data-gift={gift.id}
                aria-pressed={gift.id === selectedId}
                onClick={() => onSelect(gift)}
                className={`w-full rounded-control border p-3 text-left text-caption transition-colors ${
                  gift.id === selectedId ? 'border-forest bg-mint' : 'border-line hover:bg-paper'
                }`}
              >
                <span className="block break-words whitespace-pre-wrap">{gift.note}</span>
                <span className="mt-1 block text-ink-soft">{formatTime(gift.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
