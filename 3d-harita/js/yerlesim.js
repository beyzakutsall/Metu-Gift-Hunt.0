// Hediye saklanabilecek yerler. Saf modül (three.js yok): tarayıcı anında uyarı için,
// sunucu ise asıl denetim için aynı kuralı kullanır.
import { IZGARA, enlemBoylamdanBloga } from './projeksiyon.js';
import { ZEMIN, poligonTara, noktalaraCevir, zeminIzgarasiOlustur } from './dunya.js';

export const YER = {
  UYGUN: 'uygun',
  SINIR_DISI: 'sinir-disi', // kampüs dışı ya da haritanın dışı
  YASAK: 'yasak',           // askeri alan, şantiye
  BINA: 'bina',
  YOL: 'yol',               // araç yolu
  SU: 'su'
};

function halkalariAl(oge) {
  if (oge.type === 'way' && oge.geometry) return [noktalaraCevir(oge.geometry)];
  if (oge.type === 'relation' && oge.members) {
    return oge.members.filter(u => u.type === 'way' && u.geometry).map(u => noktalaraCevir(u.geometry));
  }
  return [];
}

const yasakMi = (t) =>
  t.landuse === 'military' || t.landuse === 'construction' || !!t.military || t.building === 'construction';

// binalar.js ile aynı: çatıdan ibaret yapılar ve inşaatlar bina sayılmaz
const binaMi = (t) => !!t.building && t.building !== 'roof' && t.building !== 'construction';

export function yerlesimOlustur(osm, sinir, zeminIzgarasi = zeminIzgarasiOlustur(osm)) {
  const { genislik, derinlik } = IZGARA;
  const { zemin } = zeminIzgarasi;

  function maskele(halkaListesi) {
    const maske = new Uint8Array(genislik * derinlik);
    for (const halkalar of halkaListesi) {
      if (!halkalar.length) continue;
      poligonTara(halkalar, genislik, derinlik, (j, i0, i1) => maske.fill(1, j * genislik + i0, j * genislik + i1 + 1));
    }
    return maske;
  }
  const secilenler = (kosul) => osm.elements.filter(o => kosul(o.tags || {})).map(halkalariAl);

  const kampus = maskele([[noktalaraCevir(sinir.halka)]]);
  const yasak = maskele(secilenler(yasakMi));
  const bina = maskele(secilenler(binaMi));

  function hucreDurumu(i, j) {
    if (!(i >= 0 && j >= 0 && i < genislik && j < derinlik)) return YER.SINIR_DISI;
    const h = j * genislik + i;
    if (!kampus[h]) return YER.SINIR_DISI;
    if (yasak[h]) return YER.YASAK;
    if (bina[h]) return YER.BINA;
    if (zemin[h] === ZEMIN.ASFALT) return YER.YOL;
    if (zemin[h] === ZEMIN.SU) return YER.SU;
    return YER.UYGUN;
  }

  return {
    hucreDurumu,
    durum(enlem, boylam) {
      const { x, z } = enlemBoylamdanBloga(enlem, boylam);
      return hucreDurumu(Math.floor(x), Math.floor(z));
    }
  };
}
