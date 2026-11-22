export type YerDurumu = 'uygun' | 'sinir-disi' | 'yasak' | 'bina' | 'yol' | 'su'

export function yerlesimOlustur(
  osm: unknown,
  sinir: unknown,
  zeminIzgarasi?: unknown,
): { durum(enlem: number, boylam: number): YerDurumu }
