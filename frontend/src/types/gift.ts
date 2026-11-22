export interface Gift {
  id: string
  latitude: number
  longitude: number
  note: string
  createdAt: string
}

export interface HideGiftInput {
  requestId: string
  latitude: number
  longitude: number
  note: string
}

export interface GiftService {
  listMine(): Promise<Gift[]>
  hide(input: HideGiftInput): Promise<Gift>
}
