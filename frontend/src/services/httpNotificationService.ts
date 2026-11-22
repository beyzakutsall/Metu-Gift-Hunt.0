import type { NotificationService } from '../types/notification'
import { request } from './http'

export function createHttpNotificationService(): NotificationService {
  return {
    list: () => request('notifications'),
    markRead: (upTo) => request('notifications/read', { upTo }),
    subscribe({ onEvent, onConnected, onClosed }) {
      const stream = new EventSource('/api/notifications/stream')
      stream.addEventListener('open', onConnected)
      stream.addEventListener('gift-hidden', (event) => onEvent(JSON.parse((event as MessageEvent<string>).data)))
      stream.addEventListener('error', () => {
        if (stream.readyState === EventSource.CLOSED) onClosed()
      })
      return () => stream.close()
    },
  }
}
