// konum.js için TypeScript tanımları

export interface OkunanKonum {
  enlem: number;
  boylam: number;
  /** metre */
  dogruluk: number;
  /** ms (Date.now biçiminde) */
  zaman: number;
}

export interface KonumHatasi {
  kod: 'guvenli-degil' | 'desteklenmiyor' | 'izin-yok' | 'konum-yok' | 'zaman-asimi' | 'bilinmiyor';
  /** Kullanıcıya gösterilebilir Türkçe cümle */
  mesaj: string;
}

export interface KonumIzlemeSecenekleri {
  konum: (k: OkunanKonum) => void;
  hata?: (h: KonumHatasi) => void;
  /** Doğruluğu kötü olduğu için atılan okumalar */
  zayif?: (dogruluk: number) => void;
  /** metre; bundan kötü okumalar atılır (varsayılan 100) */
  enKotuDogruluk?: number;
}

/** Konumu sürekli izler; dönen fonksiyon izlemeyi durdurur. */
export function konumuIzle(secenekler: KonumIzlemeSecenekleri): () => void;

/** İki nokta arası mesafe, metre */
export function mesafeMetre(a: { enlem: number; boylam: number }, b: { enlem: number; boylam: number }): number;

/** Nokta haritanın kapsadığı alanın içinde mi */
export function kampusteMi(nokta: { enlem: number; boylam: number }): boolean;
