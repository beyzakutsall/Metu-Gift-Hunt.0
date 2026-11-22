import type { NotificationService } from '../types/notification'
import { mockState } from './mockGameState'

export function createMockNotificationService(): NotificationService {
  return {
    async list() {
      const items = mockState.notifications.map((item) => ({ ...item }))
      return { items, unread: items.filter((item) => !item.read).length }
    },
    async markRead(upTo) {
      for (const item of mockState.notifications) if (item.id <= upTo) item.read = true
    },
    subscribe({ onEvent, onConnected }) {
      mockState.listeners.add(onEvent)
      onConnected()
      return () => void mockState.listeners.delete(onEvent)
    },
  }
}
