import type { Hunt, HuntService } from '../types/hunt'
import { request } from './http'

const FRAME_TIMEOUT_MS = 20_000

export function createHttpHuntService(): HuntService {
  return {
    current: () => request('hunts/current'),
    start: async () => (await request<{ hunt: Hunt }>('hunts', {})).hunt,
    checkIn: (id, fix) => request(`hunts/${id}/location`, fix),
    frame: (id, input) => request(`hunts/${id}/frame`, input, FRAME_TIMEOUT_MS),
    solve: (id, input) => request(`hunts/${id}/solve`, input),
    giveUp: (id) => request(`hunts/${id}/give-up`, {}),
  }
}
