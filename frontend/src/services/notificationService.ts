import type { NotificationService } from '../types/notification'
import { createHttpNotificationService } from './httpNotificationService'
import { createMockNotificationService } from './mockNotificationService'

export const notificationService: NotificationService =
  import.meta.env.MODE === 'mock' ? createMockNotificationService() : createHttpNotificationService()
