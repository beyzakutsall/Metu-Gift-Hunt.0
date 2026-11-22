import { useEffect, useRef, useState } from 'react'
import { collectionAsset } from '../../services/collectionAssets'
import type { Reward } from '../../types/hunt'
import { Button, ButtonLink } from '../common/Button'
import { GiftDiscovery } from '../discovery/GiftDiscovery'

export function RewardCard({ reward, onAgain }: { reward: Reward; onAgain: () => void }) {
  const [showing, setShowing] = useState(true)
  // Until the box is opened, nothing on the page gives away what's inside.
  const [discovered, setDiscovered] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (!showing) heading.current?.focus()
  }, [showing])

  const { item, note } = reward
  const hiderNote = (
    <figure className="rounded-control bg-paper p-3 text-left text-caption">
      <figcaption className="mb-1 font-bold">Note from the student who hid it</figcaption>
      <blockquote className="break-words whitespace-pre-wrap">{note}</blockquote>
    </figure>
  )
  const toBooklet = (
    <ButtonLink to="/student" state={{ unlocked: item }}>
      Put it in my booklet
    </ButtonLink>
  )

  return (
    <section aria-labelledby="reward-title" className="space-y-field text-center">
      <div className="mx-auto grid size-36 -rotate-3 place-items-center overflow-hidden rounded-card border-4 border-surface bg-sun shadow-card">
        {discovered ? (
          <img src={collectionAsset(item.id, 'preview')} alt="" className="size-full object-contain" />
        ) : (
          <span aria-hidden className="text-7xl">🎁</span>
        )}
      </div>
      <h2 id="reward-title" ref={heading} tabIndex={-1} className="text-title focus:outline-none">
        {discovered ? `You found ${item.name}!` : 'Your gift is waiting'}
      </h2>
      {discovered && hiderNote}
      <Button variant={discovered ? 'secondary' : 'primary'} onClick={() => setShowing(true)}>
        {discovered ? 'Explore it in 3D' : 'Discover your gift'}
      </Button>
      {discovered && toBooklet}
      <button type="button" onClick={onAgain} className="text-link min-h-11 text-caption">
        Search again
      </button>

      {showing && (
        <GiftDiscovery
          item={item}
          wrapped={!discovered}
          onOpened={() => setDiscovered(true)}
          onClose={() => setShowing(false)}
        >
          {hiderNote}
          {toBooklet}
        </GiftDiscovery>
      )}
    </section>
  )
}
