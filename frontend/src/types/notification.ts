export interface NotificationEvent {
  id: number
  createdAt: string
  mine: boolean
}

export interface AppNotification extends NotificationEvent {
  read: boolean
}

export interface NotificationService {
  list(): Promise<{ items: AppNotification[]; unread: number }>
  markRead(upTo: number): Promise<void>
  /** onConnected also runs after every reconnect, so anything missed can be fetched. */
  subscribe(handlers: {
    onEvent(event: NotificationEvent): void
    onConnected(): void
    /** The stream was refused and won't retry by itself. */
    onClosed(): void
  }): () => void
}
