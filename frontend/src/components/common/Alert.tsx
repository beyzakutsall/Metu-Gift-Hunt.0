import { CircleAlert, CircleCheck, Info } from 'lucide-react'
import type { ReactNode } from 'react'

const tones = {
  error: { icon: CircleAlert, style: 'bg-danger-soft text-danger' },
  success: { icon: CircleCheck, style: 'bg-mint text-ink' },
  info: { icon: Info, style: 'bg-butter text-ink' },
}

export function Alert({ tone, children }: { tone: keyof typeof tones; children: ReactNode }) {
  const { icon: Icon, style } = tones[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex gap-2.5 rounded-control p-3.5 text-caption ${style}`}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  )
}
