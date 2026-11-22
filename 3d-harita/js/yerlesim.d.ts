export type YerDurumu = 'uygun' | 'sinir-disi' | 'yasak' | 'bina' | 'yol' | 'su' | 'uzak'

export interface AvBinasi {
  anahtar: string
  ad: string
  tamAd: string
  enlem: number
  boylam: number
}

export interface AnaKonum {
  anahtar: string
  ad: string
  tamAd: string
  icinde: boolean
}

export function yerlesimOlustur(
  osm: unknown,
  sinir: unknown,
  avBinalari: unknown,
  zeminIzgarasi?: unknown,
): {
  binalar: AvBinasi[]
  durum(enlem: number, boylam: number): YerDurumu
  anaKonum(enlem: number, boylam: number): AnaKonum | null
  binayaUzaklik(anahtar: string, enlem: number, boylam: number): number
}
