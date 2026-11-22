import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { useState } from 'react'
import { Input, type InputProps } from '../common/Input'

export function PasswordInput(props: InputProps) {
  const [visible, setVisible] = useState(false)
  const Icon = visible ? EyeOff : Eye
  return (
    <Input
      icon={LockKeyhole}
      autoCapitalize="none"
      spellCheck={false}
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          aria-label={`Show ${props.label.toLowerCase()}`}
          aria-pressed={visible}
          aria-controls={props.id}
          onClick={() => setVisible(!visible)}
          className="absolute top-1/2 right-0.5 grid size-11 -translate-y-1/2 place-items-center rounded-control text-ink-soft transition-colors hover:text-ink"
        >
          <Icon className="size-5" aria-hidden />
        </button>
      }
    />
  )
}
