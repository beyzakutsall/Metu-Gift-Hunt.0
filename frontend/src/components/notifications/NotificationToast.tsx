import { Gift, X } from 'lucide-react'
import { useEffect } from 'react'
import { NEW_GIFT_MESSAGE } from '../../../../shared/giftRules'
import { useNotifications } from '../../context/NotificationsContext'

const VISIBLE_MS = 8000

export function NotificationToast() {
  const { announcement, dismiss } = useNotifications()

  useEffect(() => {
    if (!announcement) return
    const timer = setTimeout(dismiss, VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [announcement, dismiss])

  return (
    // Always mounted, so screen readers announce what appears inside.
    <div aria-live="polite" className="pointer-events-none fixed inset-x-gutter top-20 z-40 flex justify-center">
      {announcement && (
        <div
          key={announcement.id}
          className="pointer-events-auto flex w-full max-w-md animate-from-right items-center gap-3 rounded-control bg-ink p-2 pl-3 text-white shadow-card"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sun text-ink">
            <Gift className="size-5" aria-hidden />
          </span>
          <p className="min-w-0 flex-1 text-caption">
            <strong className="block">{NEW_GIFT_MESSAGE}</strong>
            {announcement.count > 1 && `${announcement.count} new since you last looked`}
          </p>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss notification"
            className="grid size-11 shrink-0 place-items-center rounded-control hover:bg-white/10"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
      )}
    </div>
  )
}
