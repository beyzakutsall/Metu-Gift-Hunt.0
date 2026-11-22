export function CollectionProgress({ found, total }: { found: number; total: number }) {
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 80 80" className="size-20 shrink-0" aria-hidden="true">
        <circle cx="40" cy="40" r="33" fill="none" strokeWidth="9" className="stroke-surface" />
        {found > 0 && (
          <circle
            cx="40"
            cy="40"
            r="33"
            fill="none"
            strokeWidth="9"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${(found / total) * 100} 100`}
            transform="rotate(-90 40 40)"
            className="stroke-forest"
          />
        )}
        <text x="40" y="47" textAnchor="middle" className="fill-ink font-display text-xl font-bold">
          {found}
        </text>
      </svg>
      <p>
        <strong className="block font-display text-xl">
          {found} of {total} collectibles
        </strong>
        <span className="text-caption text-ink">
          {found === 0 ? 'Your first find is out there.' : found === total ? 'Booklet complete!' : 'Keep exploring!'}
        </span>
      </p>
    </div>
  )
}
