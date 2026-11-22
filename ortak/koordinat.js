/**
 * Enlem-boylam ↔ dünya dönüşümü (HARITA-MOTORU.md, Bölüm 5.1).
 * Dünya birimi blok. Orijin SINIR'ın kuzeybatı köşesi; x doğuya, z güneye, y yukarı artar.
 * Motorun dışı her zaman {enlem, boylam} konuşur; blok koordinatını yalnızca motor bilir.
 */

/** Bir bloğun metre cinsinden boyu. */
export const BLOK_METRE = 0.5;

/** Kampüs sınırı (derece). */
export const SINIR = Object.freeze({ bati: 32.760, guney: 39.880, dogu: 32.800, kuzey: 39.903 });

const DERECE = Math.PI / 180;
const ENLEM0 = (SINIR.guney + SINIR.kuzey) / 2;
const METRE_BOYLAM = 111320 * Math.cos(ENLEM0 * DERECE);
const METRE_ENLEM = 110574;
const DUNYA_YARICAPI = 6371008.8;

/**
 * @param {number} enlem
 * @param {number} boylam
 * @returns {{x: number, z: number}} blok
 */
export function enlemBoylamdanDunyaya(enlem, boylam) {
  return {
    x: (boylam - SINIR.bati) * METRE_BOYLAM / BLOK_METRE,
    z: (SINIR.kuzey - enlem) * METRE_ENLEM / BLOK_METRE,
  };
}

/**
 * @param {number} x blok
 * @param {number} z blok
 * @returns {{enlem: number, boylam: number}}
 */
export function dunyadanEnlemBoylama(x, z) {
  return {
    enlem: SINIR.kuzey - z * BLOK_METRE / METRE_ENLEM,
    boylam: SINIR.bati + x * BLOK_METRE / METRE_BOYLAM,
  };
}

/**
 * İki nokta arasındaki büyük daire uzaklığı (haversine).
 * @param {{enlem: number, boylam: number}} a
 * @param {{enlem: number, boylam: number}} b
 * @returns {number} metre
 */
export function mesafeMetre(a, b) {
  const f1 = a.enlem * DERECE;
  const f2 = b.enlem * DERECE;
  const df = f2 - f1;
  const dl = (b.boylam - a.boylam) * DERECE;
  const h = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
  return 2 * DUNYA_YARICAPI * Math.asin(Math.min(1, Math.sqrt(h)));
}
