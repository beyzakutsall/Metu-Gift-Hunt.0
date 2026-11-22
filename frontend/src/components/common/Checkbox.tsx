import type { InputHTMLAttributes, ReactNode } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: ReactNode
  error?: string
}

export function Checkbox({ id, label, error, ...props }: Props) {
  return (
    <div>
      <label htmlFor={id} className="flex min-h-11 items-center gap-2.5 text-caption">
        <input
          {...props}
          id={id}
          type="checkbox"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-message` : undefined}
          className="size-5 shrink-0 cursor-pointer accent-forest"
        />
        <span>{label}</span>
      </label>
      {error && (
        <p id={`${id}-message`} className="text-caption text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
