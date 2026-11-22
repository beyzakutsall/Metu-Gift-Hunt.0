export interface NotificationEvent {
  id: number
  createdAt: Date
}

interface Listener {
  userId: string
  send(event: NotificationEvent & { mine: boolean }): void
}

// Fans out to the browsers connected to this process. With several API processes, replace it
// with PostgreSQL LISTEN/NOTIFY.
export function createNotificationHub() {
  const listeners = new Set<Listener>()
  return {
    subscribe(listener: Listener) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
    // Receivers only learn whether it was theirs, never who hid it or where.
    publish(event: NotificationEvent, hiderId: string) {
      for (const listener of listeners) listener.send({ ...event, mine: listener.userId === hiderId })
    },
  }
}
export type NotificationHub = ReturnType<typeof createNotificationHub>
