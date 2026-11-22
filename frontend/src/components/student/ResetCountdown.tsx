import { Clock } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ResetCountdown({ resetsAt }: { resetsAt: string }) {
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [resetsAt])

  const minutes = Math.max(0, Math.ceil((Date.parse(resetsAt) - now) / 60_000))
  const hours = Math.floor(minutes / 60)
  return (
    <p className="flex items-center gap-2 text-caption text-ink">
      <Clock className="size-4 shrink-0" aria-hidden />
      Daily limits reset in {hours ? `${hours} h ` : ''}
      {minutes % 60} min
    </p>
  )
}
