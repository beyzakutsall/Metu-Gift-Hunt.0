import type { YerDurumu } from '../../../3d-harita/js/yerlesim.js'

export interface MapPoint {
  enlem: number
  boylam: number
}

/** What 3d-harita/js/api.js exposes. The app knows nothing else about the engine. */
export interface CampusMapApi {
  hediyeleriGoster(gifts: (MapPoint & { id: string; alinabilir?: boolean })[]): void
  hediyeVurgula(id: string | null): void
  yerIsaretle(point: MapPoint | null): void
  yerDurumu(enlem: number, boylam: number): YerDurumu
  odakla(point: MapPoint): void
  yerler: (MapPoint & { ad: string })[]
  yakinYer(enlem: number, boylam: number): { ad: string; metre: number } | null
  on(event: 'yer-secildi', listener: (place: MapPoint & { durum: YerDurumu }) => void): () => void
  on(event: 'hediye-tiklandi', listener: (gift: { id: string }) => void): () => void
}
