// Telefonun konumunu okur ve haritaya verilecek biçime çevirir. Haritadan bağımsızdır:
// three.js kullanmaz, React uygulaması da doğrudan kullanabilir.
//
//   const durdur = konumuIzle({
//     konum: (k) => harita.gpsKonumu(k),     // { enlem, boylam, dogruluk, zaman }
//     hata: ({ kod, mesaj }) => ...           // mesaj kullanıcıya gösterilebilir Türkçe cümle
//   });
//   durdur(); // sayfadan çıkarken (pil için önemli)
//
// Konum yalnızca HTTPS'te (ve localhost'ta) çalışır. İzni bir düğmeye basılınca isteyin:
// tarayıcı izin penceresini açar, kullanıcı neden sorulduğunu bilir.
import { SINIR } from './projeksiyon.js';

/**
 * Konumu sürekli izler. Doğruluğu enKotuDogruluk metreden kötü okumalar atılır.
 * @param {object} s
 * @param {(k: {enlem: number, boylam: number, dogruluk: number, zaman: number}) => void} s.konum
 * @param {(h: {kod: string, mesaj: string}) => void} [s.hata]
 * @param {(dogruluk: number) => void} [s.zayif] Atılan zayıf okumalar için (ör. "Sinyal zayıf" yazmak)
 * @param {number} [s.enKotuDogruluk=100] metre
 * @returns {() => void} İzlemeyi durduran fonksiyon
 */
export function konumuIzle({ konum, hata = () => {}, zayif = () => {}, enKotuDogruluk = 100 } = {}) {
  if (!window.isSecureContext) {
    hata({ kod: 'guvenli-degil', mesaj: 'Konum yalnızca HTTPS adreslerinde çalışır.' });
    return () => {};
  }
  if (!('geolocation' in navigator)) {
    hata({ kod: 'desteklenmiyor', mesaj: 'Bu tarayıcı konum özelliğini desteklemiyor.' });
    return () => {};
  }

  const izleme = navigator.geolocation.watchPosition(
    (p) => {
      const { latitude, longitude, accuracy } = p.coords;
      if (accuracy > enKotuDogruluk) { zayif(accuracy); return; }
      konum({ enlem: latitude, boylam: longitude, dogruluk: accuracy, zaman: p.timestamp });
    },
    (e) => hata(konumHatasi(e)),
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
  );
  return () => navigator.geolocation.clearWatch(izleme);
}

function konumHatasi(e) {
  switch (e.code) {
    case 1: return { kod: 'izin-yok', mesaj: 'Konum izni verilmedi. Tarayıcı ayarlarından bu siteye konum izni verin.' };
    case 2: return { kod: 'konum-yok', mesaj: 'Konum alınamadı. Telefonun konum servisi açık mı?' };
    case 3: return { kod: 'zaman-asimi', mesaj: 'Konum gecikiyor. Açık bir alanda biraz bekleyin.' };
    default: return { kod: 'bilinmiyor', mesaj: 'Konum alınamadı: ' + e.message };
  }
}

/** İki nokta arası mesafe (metre, haversine). a ve b: {enlem, boylam} */
export function mesafeMetre(a, b) {
  const R = 6371000, r = Math.PI / 180;
  const dEnlem = (b.enlem - a.enlem) * r, dBoylam = (b.boylam - a.boylam) * r;
  const h = Math.sin(dEnlem / 2) ** 2 + Math.cos(a.enlem * r) * Math.cos(b.enlem * r) * Math.sin(dBoylam / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Nokta haritanın kapsadığı alanın içinde mi? */
export function kampusteMi({ enlem, boylam }) {
  return enlem >= SINIR.guney && enlem <= SINIR.kuzey && boylam >= SINIR.bati && boylam <= SINIR.dogu;
}
