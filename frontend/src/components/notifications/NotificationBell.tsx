import { Bell, Gift } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NEW_GIFT_MESSAGE } from '../../../../shared/giftRules'
import { useNotifications } from '../../context/notificationsState'
import { formatTime } from './formatTime'

export function NotificationBell() {
  const { items, unread, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      button.current?.focus()
    }
    // A click inside the map's iframe never reaches this document, but it does blur the window.
    const blur = () => setOpen(false)
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    window.addEventListener('blur', blur)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
      window.removeEventListener('blur', blur)
    }
  }, [open])

  function toggle() {
    if (!open) markAllRead()
    setOpen(!open)
  }

  return (
    <div ref={root} className="sm:relative">
      <button
        ref={button}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="notification-panel"
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative grid size-12 place-items-center rounded-control border border-edge bg-surface transition-colors hover:bg-mint/50"
      >
        <Bell className="size-5" aria-hidden />
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-coral px-1 text-xs font-bold text-white"
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      <section
        id="notification-panel"
        aria-label="Notifications"
        hidden={!open}
        className="absolute inset-x-gutter top-16 z-30 rounded-control border border-line bg-surface p-3 shadow-card sm:inset-x-auto sm:top-14 sm:right-0 sm:w-96"
      >
        <h2 className="px-2 py-1 text-lg">Notifications</h2>
        {items.length === 0 ? (
          <p className="px-2 py-4 text-caption text-ink-soft">Nothing yet. You’ll hear when someone hides a gift.</p>
        ) : (
          <ul className="max-h-[60dvh] overflow-y-auto" tabIndex={0} aria-label="Notification list">
            {items.map(({ id, mine, createdAt }) => (
              <li key={id} className="flex items-start gap-3 rounded-control px-2 py-2.5 text-caption">
                <span className={`grid size-9 shrink-0 place-items-center rounded-full ${mine ? 'bg-mint' : 'bg-sun'}`}>
                  <Gift className="size-4" aria-hidden />
                </span>
                <p>
                  <strong className="block">{NEW_GIFT_MESSAGE}</strong>
                  <span className="text-ink-soft">
                    {mine && 'By you · '}
                    {formatTime(createdAt)}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
