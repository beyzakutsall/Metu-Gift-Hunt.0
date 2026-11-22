import type { Gift } from '../types/gift'
import type { AppNotification, NotificationEvent } from '../types/notification'

// Mock mode only: what the gift, notification and student mocks share. Resets on reload.
export const mockState = {
  gifts: new Map<string, Gift[]>(), // by user id
  notifications: [{ id: 1, createdAt: new Date().toISOString(), mine: false, read: false }] as AppNotification[],
  listeners: new Set<(event: NotificationEvent) => void>(),
}
