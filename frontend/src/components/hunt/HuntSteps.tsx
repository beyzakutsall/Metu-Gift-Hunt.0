import { Check } from 'lucide-react'

const STEPS = ['Go there', 'Get the clue', 'Find the spot']

/** `done` is how many steps are finished. */
export function HuntSteps({ done }: { done: number }) {
  return (
    <ol aria-label="Hunt progress" className="grid grid-cols-3 gap-1">
      {STEPS.map((step, index) => (
        <li key={step} aria-current={index === done ? 'step' : undefined} className="text-center text-xs font-bold">
          <span
            className={`mx-auto mb-1 grid size-8 place-items-center rounded-full ${
              index < done ? 'bg-forest text-white' : index === done ? 'bg-sun' : 'bg-line'
            }`}
          >
            {index < done ? <Check className="size-4" aria-hidden /> : index + 1}
          </span>
          {step}
          {index < done && <span className="sr-only"> (done)</span>}
        </li>
      ))}
    </ol>
  )
}
