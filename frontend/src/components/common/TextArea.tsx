import type { Ref, TextareaHTMLAttributes } from 'react'

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string
  label: string
  value: string
  maxLength: number
  error?: string
  hint?: string
  ref?: Ref<HTMLTextAreaElement>
}

export function TextArea({ id, label, value, maxLength, error, hint, ...props }: Props) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-caption font-bold">
        {label}
      </label>
      <textarea
        rows={2}
        {...props}
        id={id}
        value={value}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        aria-describedby={`${id}-message`}
        className={`block w-full resize-y rounded-control border bg-surface p-3 placeholder:text-ink-soft ${error ? 'border-danger' : 'border-edge'}`}
      />
      <p id={`${id}-message`} className="mt-1 flex justify-between gap-3 text-caption text-ink-soft">
        <span className={error ? 'text-danger' : ''}>{error || hint}</span>
        <span className="shrink-0">
          {value.length}/{maxLength}
        </span>
      </p>
    </div>
  )
}
