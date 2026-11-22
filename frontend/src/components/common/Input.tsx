import { CircleAlert, type LucideIcon } from 'lucide-react'
import type { InputHTMLAttributes, ReactNode } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  icon?: LucideIcon
  error?: string
  hint?: string
  trailing?: ReactNode
}

export function Input({ id, label, icon: Icon, error, hint, trailing, ...props }: InputProps) {
  const message = error || hint
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-caption font-bold">
        {label}
      </label>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-ink-soft" aria-hidden />}
        <input
          {...props}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={message ? `${id}-message` : undefined}
          className={`h-touch w-full rounded-control border bg-surface text-control transition placeholder:text-ink-soft focus:border-forest focus:ring-4 focus:ring-leaf/30 focus-visible:outline-2 focus-visible:outline-offset-0 ${
            Icon ? 'pl-11' : 'pl-3.5'
          } ${trailing ? 'pr-12' : 'pr-3.5'} ${error ? 'border-danger bg-danger-soft/40' : 'border-edge'}`}
        />
        {trailing}
      </div>
      {message && (
        <p id={`${id}-message`} className={`mt-1.5 flex items-start gap-1.5 text-caption ${error ? 'text-danger' : 'text-ink-soft'}`}>
          {error && <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />}
          {message}
        </p>
      )}
    </div>
  )
}
