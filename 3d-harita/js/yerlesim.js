// Hediye avında kullanılabilecek yerler ve binalar. Saf modül (three.js yok): tarayıcı anında
// uyarı için, sunucu ise asıl denetim için aynı kuralı kullanır.
//
// Hediye ya ava açık bir binanın içinde (data/hediye-binalari.json) ya da böyle bir binanın en fazla
// BINA_CEVRESI metre yakınındadır; o bina hediyenin "ana konumu"dur. Oyuncular buralara yürüyüp
// fotoğraf çektiği için hassas binaların çevresi ve Teknokent kapalıdır.
import { IZGARA, BLOK_METRE, enlemBoylamdanBloga, bloktanEnlemBoylama } from './projeksiyon.js';
import { ZEMIN, poligonTara, noktalaraCevir, zeminIzgarasiOlustur } from './dunya.js';

export const YER = {
  UYGUN: 'uygun',
  SINIR_DISI: 'sinir-disi', // kampüs dışı ya da haritanın dışı
  YASAK: 'yasak',           // askeri alan, şantiye, Teknokent, hassas bina çevresi
  BINA: 'bina',             // ava kapalı bina
  YOL: 'yol',               // araç yolu
  SU: 'su',
  UZAK: 'uzak'              // ava açık bir binaya uzak
};

const BINA_CEVRESI = 75;    // metre
const HASSAS_CEVRE = 24;    // metre

// Adında bunlar geçen binaların çevresinde hediye olmaz
const HASSAS_AD = /aselsan|havelsan|milsoft|savunma|tübi̇?tak|sage\b|\btai\b|\btsk\b|radyasyon|yüksek gerilim|harita genel|destek birliği|anaokul|yuva|kreş|lisesi|ilköğretim|kolej|yurt|yurd|konukevi|lojman|misafirhane/;

function halkalariAl(oge) {
  if (oge.type === 'way' && oge.geometry) return [noktalaraCevir(oge.geometry)];
  if (oge.type === 'relation' && oge.members) {
    return oge.members.filter(u => u.type === 'way' && u.geometry).map(u => noktalaraCevir(u.geometry));
  }
  return [];
}

const kapaliAlanMi = (t) =>
  t.landuse === 'military' || t.landuse === 'construction' || t.landuse === 'commercial' || !!t.military || t.building === 'construction';

// binalar.js ile aynı: çatıdan ibaret yapılar ve inşaatlar bina sayılmaz
const binaMi = (t) => !!t.building && t.building !== 'roof' && t.building !== 'construction';

const hassasMi = (t) =>
  t.amenity === 'kindergarten' || t.building === 'dormitory' || HASSAS_AD.test((t.name || '').toLocaleLowerCase('tr'));

export function yerlesimOlustur(osm, sinir, avBinalari, zeminIzgarasi = zeminIzgarasiOlustur(osm)) {
  const { genislik, derinlik } = IZGARA;
  const { zemin } = zeminIzgarasi;
  const boyut = genislik * derinlik;

  function tara(halkalar, ziyaret) {
    if (!halkalar.length) return;
    poligonTara(halkalar, genislik, derinlik, (j, i0, i1) => {
      for (let i = i0; i <= i1; i++) ziyaret(i, j, j * genislik + i);
    });
  }

  const kampus = new Uint8Array(boyut), kapali = new Uint8Array(boyut), bina = new Uint8Array(boyut);
  const hassas = new Uint8Array(boyut);
  const avNo = new Int16Array(boyut).fill(-1);    // hücredeki ava açık bina
  const yakinNo = new Int16Array(boyut).fill(-1); // BINA_CEVRESI içindeki en yakın ava açık bina
  const yakinUzaklik = new Float32Array(boyut).fill(Infinity);

  tara([noktalaraCevir(sinir.halka)], (i, j, h) => { kampus[h] = 1; });

  const binalar = [];
  for (const oge of osm.elements) {
    const t = oge.tags || {};
    const alanKapali = kapaliAlanMi(t);
    if (!alanKapali && !binaMi(t)) continue;
    const halkalar = halkalariAl(oge);
    if (alanKapali) tara(halkalar, (i, j, h) => { kapali[h] = 1; });
    if (!binaMi(t)) continue;

    const anahtar = `${oge.type}/${oge.id}`;
    const ad = avBinalari.binalar[anahtar];
    const acik = typeof ad === 'string';
    const tehlikeli = !acik && hassasMi(t);
    const r = tehlikeli ? Math.ceil(HASSAS_CEVRE / BLOK_METRE) : 0;
    const hucreler = [];
    tara(halkalar, (i, j, h) => {
      bina[h] = 1;
      if (acik && avNo[h] < 0) { avNo[h] = binalar.length; hucreler.push(h); }
      if (!tehlikeli) return;
      for (let b = Math.max(0, j - r); b <= Math.min(derinlik - 1, j + r); b++) {
        hassas.fill(1, b * genislik + Math.max(0, i - r), b * genislik + Math.min(genislik - 1, i + r) + 1);
      }
    });
    if (hucreler.length) binalar.push({ anahtar, ad, tamAd: t.name || ad, hucreler });
  }

  const cevre = Math.ceil(BINA_CEVRESI / BLOK_METRE);
  binalar.forEach((b, no) => {
    // Ortaya en yakın kendi hücresi: avlulu binada ağırlık merkezi binanın dışında kalabilir
    const n = b.hucreler.length;
    const mi = b.hucreler.reduce((t, h) => t + h % genislik, 0) / n;
    const mj = b.hucreler.reduce((t, h) => t + Math.floor(h / genislik), 0) / n;
    let orta = b.hucreler[0], enAz = Infinity;
    for (const h of b.hucreler) {
      const i = h % genislik, j = Math.floor(h / genislik);
      const u = (i - mi) ** 2 + (j - mj) ** 2;
      if (u < enAz) { enAz = u; orta = h; }
      // Yalnızca kenar hücreleri çevreye yayılır
      if (avNo[h - 1] === no && avNo[h + 1] === no && avNo[h - genislik] === no && avNo[h + genislik] === no) continue;
      for (let y = Math.max(0, j - cevre); y <= Math.min(derinlik - 1, j + cevre); y++) {
        for (let x = Math.max(0, i - cevre); x <= Math.min(genislik - 1, i + cevre); x++) {
          const uz = Math.hypot(x - i, y - j);
          const q = y * genislik + x;
          if (uz <= cevre && uz < yakinUzaklik[q]) { yakinUzaklik[q] = uz; yakinNo[q] = no; }
        }
      }
    }
    const g = bloktanEnlemBoylama(orta % genislik + 0.5, Math.floor(orta / genislik) + 0.5);
    b.enlem = Math.round(g.enlem * 1e6) / 1e6;
    b.boylam = Math.round(g.boylam * 1e6) / 1e6;
  });
  const anahtardan = new Map(binalar.map(b => [b.anahtar, b]));

  function hucreDurumu(i, j) {
    if (!(i >= 0 && j >= 0 && i < genislik && j < derinlik)) return YER.SINIR_DISI;
    const h = j * genislik + i;
    if (!kampus[h]) return YER.SINIR_DISI;
    if (avNo[h] >= 0) return YER.UYGUN;
    if (kapali[h] || hassas[h]) return YER.YASAK;
    if (bina[h]) return YER.BINA;
    if (zemin[h] === ZEMIN.ASFALT) return YER.YOL;
    if (zemin[h] === ZEMIN.SU) return YER.SU;
    if (yakinNo[h] < 0) return YER.UZAK;
    return YER.UYGUN;
  }

  function hucre(enlem, boylam) {
    const { x, z } = enlemBoylamdanBloga(enlem, boylam);
    return { x, z, i: Math.floor(x), j: Math.floor(z) };
  }

  return {
    hucreDurumu,
    binalar: binalar.map(({ anahtar, ad, tamAd, enlem, boylam }) => ({ anahtar, ad, tamAd, enlem, boylam })),
    hucreleri: (anahtar) => anahtardan.get(anahtar)?.hucreler ?? [],
    durum(enlem, boylam) {
      const { i, j } = hucre(enlem, boylam);
      return hucreDurumu(i, j);
    },
    // Uygun bir yerin ana konumu
    anaKonum(enlem, boylam) {
      const { i, j } = hucre(enlem, boylam);
      if (hucreDurumu(i, j) !== YER.UYGUN) return null;
      const h = j * genislik + i;
      const icinde = avNo[h] >= 0;
      const { anahtar, ad, tamAd } = binalar[icinde ? avNo[h] : yakinNo[h]];
      return { anahtar, ad, tamAd, icinde };
    },
    // Noktanın binaya uzaklığı (metre); içindeyse 0, bina yoksa Infinity
    binayaUzaklik(anahtar, enlem, boylam) {
      const b = anahtardan.get(anahtar);
      if (!b) return Infinity;
      const { x, z } = hucre(enlem, boylam);
      let enAz = Infinity;
      for (const h of b.hucreler) {
        const i = h % genislik, j = Math.floor(h / genislik);
        const dx = Math.max(i - x, 0, x - i - 1), dz = Math.max(j - z, 0, z - j - 1);
        enAz = Math.min(enAz, dx * dx + dz * dz);
      }
      return Math.sqrt(enAz) * BLOK_METRE;
    }
  };
}
