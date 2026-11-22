import { createContext, use } from 'react'
import type { AppNotification } from '../types/notification'

export interface Announcement {
  id: number
  count: number
}

export interface NotificationsState {
  items: AppNotification[]
  unread: number
  announcement: Announcement | null
  dismiss(): void
  markAllRead(): void
}

// Kept apart from the provider for the same reason as authState.ts.
export const NotificationsContext = createContext<NotificationsState | null>(null)

export function useNotifications() {
  const state = use(NotificationsContext)
  if (!state) throw new Error('useNotifications must be used inside NotificationsProvider')
  return state
}
