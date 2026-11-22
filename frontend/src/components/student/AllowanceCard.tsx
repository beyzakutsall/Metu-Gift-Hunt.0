import { Check, type LucideIcon } from 'lucide-react'
import type { Allowance } from '../../types/student'

const tones = {
  search: { badge: 'bg-sky', used: 'border-forest bg-forest text-white' },
  hide: { badge: 'bg-blush', used: 'border-coral bg-coral text-white' },
}

interface Props {
  tone: keyof typeof tones
  icon: LucideIcon
  title: string
  verb: string
  allowance: Allowance
}

export function AllowanceCard({ tone, icon: Icon, title, verb, allowance: { today, limit, total } }: Props) {
  const left = Math.max(0, limit - today)
  return (
    <article aria-label={title} className="flex min-w-0 flex-col rounded-card border border-line bg-surface p-3 shadow-card sm:p-5">
      <div className="flex items-center gap-2 sm:gap-3">
        <span className={`grid size-9 shrink-0 sm:size-11 place-items-center rounded-control ${tones[tone].badge}`}>
          <Icon className="size-5" aria-hidden />
        </span>
        <h2 className="min-w-0 text-base leading-tight sm:text-lg">{title}</h2>
      </div>

      <p className="mt-3 flex items-baseline gap-1.5 sm:gap-2">
        <strong className="font-display text-4xl sm:text-5xl">{today}</strong>
        <span className="font-display text-xl text-ink-soft sm:text-2xl">/ {limit}</span>
        <span className="text-caption text-ink-soft">today</span>
      </p>

      <div aria-hidden className="mt-3 flex gap-1 sm:gap-2">
        {Array.from({ length: limit }, (_, slot) => (
          <span
            key={slot}
            className={`grid h-8 min-w-0 flex-1 sm:h-10 place-items-center rounded-control border-2 ${
              slot < today ? tones[tone].used : 'border-dashed border-line bg-paper text-ink-soft'
            }`}
          >
            {slot < today ? <Check className="size-5" /> : <Icon className="size-4" />}
          </span>
        ))}
      </div>

      <p className="mt-3 flex flex-wrap justify-between gap-x-3 text-caption">
        <strong>{left ? `${left} left to ${verb}` : 'All used for today'}</strong>
        <span className="text-ink-soft">{total} all time</span>
      </p>
    </article>
  )
}
