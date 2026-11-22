import type { Hunt, HuntService } from '../types/hunt'
import { request } from './http'

const UPLOAD_TIMEOUT_MS = 60_000

export function createHttpHuntService(): HuntService {
  return {
    current: () => request('hunts/current'),
    start: async () => (await request<{ hunt: Hunt }>('hunts', {})).hunt,
    checkIn: (id, fix) => request(`hunts/${id}/location`, fix),
    solve: (id, input) => request(`hunts/${id}/solve`, input, UPLOAD_TIMEOUT_MS),
    giveUp: (id) => request(`hunts/${id}/give-up`, {}),
  }
}
