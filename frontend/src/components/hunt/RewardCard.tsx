import { useEffect, useRef } from 'react'
import type { Reward } from '../../types/hunt'
import { ButtonLink } from '../common/Button'

export function RewardCard({ reward, onAgain }: { reward: Reward; onAgain: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => heading.current?.focus(), [])

  return (
    <section aria-labelledby="reward-title" className="space-y-field text-center">
      <div className="mx-auto grid size-36 -rotate-3 animate-page-turn place-items-center rounded-card border-4 border-surface bg-sun shadow-card">
        <span aria-hidden className="text-7xl">{reward.item.emoji}</span>
      </div>
      <h2 id="reward-title" ref={heading} tabIndex={-1} className="text-title focus:outline-none">
        You found {reward.item.name}!
      </h2>
      <p className="text-caption">It’s unlocked in your collection booklet.</p>
      <figure className="rounded-control bg-paper p-3 text-left text-caption">
        <figcaption className="mb-1 font-bold">Note from the student who hid it</figcaption>
        <blockquote className="break-words whitespace-pre-wrap">{reward.note}</blockquote>
      </figure>
      <ButtonLink to="/student" state={{ unlocked: reward.item }}>See it in my booklet</ButtonLink>
      <button type="button" onClick={onAgain} className="text-link min-h-11 text-caption">
        Search again
      </button>
    </section>
  )
}
