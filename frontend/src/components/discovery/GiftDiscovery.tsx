import { X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useGiftScene } from '../../hooks/useGiftScene'
import type { FoundItem } from '../../types/student'
import { Button } from '../common/Button'
import { GiftStage } from './GiftStage'
import { ModelCredit } from './ModelCredit'

interface Props {
  item: FoundItem
  /** A fresh find starts as a wrapped gift. One from the booklet is shown at once. */
  wrapped?: boolean
  /** Where it flies in from on its way to the middle of the page. */
  from?: DOMRect
  onOpened?: () => void
  onClose: () => void
  /** Shown once the gift is open. */
  children: ReactNode
}

export function GiftDiscovery({ item, wrapped: startsWrapped = false, from, onOpened, onClose, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  // Fixed at mount: the parent unwraps it once opened, which mustn't restart the scene.
  const [wrapped] = useState(startsWrapped)
  const gift = useGiftScene(item.id, wrapped)
  const { opened } = gift

  // Layout effect, so closing hands focus back while the dialog is still in the page.
  useLayoutEffect(() => {
    const element = dialog.current!
    element.showModal()
    return () => element.close()
  }, [])

  useEffect(() => {
    heading.current?.focus()
    if (opened) onOpened?.()
    // Only when it opens, not whenever the parent passes a new callback.
  }, [opened])

  const origin = from && {
    '--from-x': `${from.x + from.width / 2 - innerWidth / 2}px`,
    '--from-y': `${from.y + from.height / 2 - innerHeight / 2}px`,
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="discovery-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      // Browsers let a second Escape skip the cancel event.
      onClose={() => {
        if (dialog.current && !dialog.current.open) onClose()
      }}
      style={origin as CSSProperties | undefined}
      className="gift-dialog m-auto w-[min(calc(100%-1.5rem),36rem)] max-w-none animate-to-middle overflow-hidden rounded-card bg-surface p-0 text-ink shadow-book backdrop:bg-ink/65 backdrop:backdrop-blur-xs"
    >
      <div className="gift-layout">
        <GiftStage item={item} gift={gift} />

        <div className="gift-details space-y-3 overflow-y-auto p-5 text-center">
          <h2 id="discovery-title" ref={heading} tabIndex={-1} className="text-title break-words focus:outline-none">
            {!opened ? 'You found a gift!' : wrapped ? `It’s ${item.name}!` : item.name}
          </h2>
          {opened ? (
            <>
              {children}
              <ModelCredit credit={item.credit} />
            </>
          ) : (
            <>
              <p className="text-ink-soft">Open it to see what was hidden inside.</p>
              <Button loading={gift.opening} onClick={gift.open}>
                {gift.opening ? 'Opening…' : 'Open your gift'}
              </Button>
            </>
          )}
        </div>
      </div>

      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute top-3 right-3 grid size-11 place-items-center rounded-full bg-surface shadow-pill hover:bg-mint"
      >
        <X className="size-5" aria-hidden />
      </button>
    </dialog>
  )
}
