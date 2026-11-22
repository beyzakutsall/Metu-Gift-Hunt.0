import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { notificationService } from '../services/notificationService'
import { AuthError } from '../types/auth'
import type { AppNotification } from '../types/notification'
import { useAuth } from './authState'
import { NotificationsContext, type Announcement } from './notificationsState'

const RETRY_MS = 5000

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { setUser } = useAuth()
  const [items, setItems] = useState<AppNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const announced = useRef(0) // newest id already shown as a toast
  const request = useRef(0)

  const announce = useCallback((id: number, count: number) => {
    if (id <= announced.current) return
    announced.current = id
    setAnnouncement({ id, count })
  }, [])

  const refresh = useCallback(async () => {
    const current = ++request.current
    try {
      const next = await notificationService.list()
      if (current !== request.current) return
      setItems(next.items)
      setUnread(next.unread)
      // Also covers whatever was hidden while this student was away.
      const missed = next.items.filter((item) => !item.read && item.id > announced.current)
      if (missed[0]) announce(missed[0].id, announced.current === 0 ? next.unread : missed.length)
    } catch (error) {
      if (error instanceof AuthError && error.code === 'UNAUTHENTICATED') setUser(null)
    }
  }, [announce, setUser])

  useEffect(() => {
    let close: (() => void) | undefined
    let retry: ReturnType<typeof setTimeout> | undefined

    function disconnect() {
      close?.()
      close = undefined
      clearTimeout(retry)
    }
    // Only while visible: browsers allow six HTTP/1.1 connections per site, so a stream in every
    // background tab would freeze the app. Returning to a tab catches up.
    function connect() {
      disconnect()
      if (document.visibilityState !== 'visible') return
      void refresh()
      close = notificationService.subscribe({
        onConnected: () => void refresh(),
        onEvent(event) {
          request.current++ // a list requested before this event is out of date
          setItems((previous) =>
            [{ ...event, read: event.mine }, ...previous.filter((item) => item.id !== event.id)].slice(0, 30),
          )
          if (!event.mine) announce(event.id, 1)
          void refresh() // the unread count comes from the server
        },
        onClosed() {
          void refresh() // notices an expired session
          clearTimeout(retry)
          retry = setTimeout(connect, RETRY_MS)
        },
      })
    }

    connect()
    document.addEventListener('visibilitychange', connect)
    return () => {
      document.removeEventListener('visibilitychange', connect)
      disconnect()
      request.current++
    }
  }, [announce, refresh])

  const dismiss = useCallback(() => setAnnouncement(null), [])

  const markAllRead = useCallback(() => {
    const newest = items[0]?.id
    if (!newest || !unread) return
    request.current++
    setUnread(0)
    setAnnouncement(null)
    notificationService.markRead(newest).then(refresh, refresh)
  }, [items, unread, refresh])

  return (
    <NotificationsContext value={{ items, unread, announcement, dismiss, markAllRead }}>{children}</NotificationsContext>
  )
}
