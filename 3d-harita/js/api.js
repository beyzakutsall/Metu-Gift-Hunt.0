// harita.js'in eklentisi: uygulama (iframe'in dışı) yalnızca window.kampusHarita ile konuşur.
// Adlar HARITA-MOTORU.md Bölüm 5.2'den; yer seçimiyle ilgili olanlar ek. Dışarısı hep enlem/boylam konuşur.
//
//   hediyeleriGoster([{ id, enlem, boylam, alinabilir }])
//   hediyeVurgula(id | null)
//   gpsKonumu({ enlem, boylam, dogruluk } | null), oyuncuyaOdaklan()  → harita.js'teki
//   yerIsaretle({ enlem, boylam } | null)
//   yerDurumu(enlem, boylam)  → yerlesim.js'teki YER değerlerinden biri
//   odakla({ enlem, boylam })
//   yerler                    → [{ ad, enlem, boylam }] kampüsteki adlı binaların önündeki uygun nokta
//   yakinYer(enlem, boylam)   → { ad, metre } | null
//   on('yer-secildi' | 'hediye-tiklandi', cb) → aboneliği kaldıran fonksiyon
import * as THREE from 'three';
import { IZGARA, BLOK_METRE, enlemBoylamdanBloga, bloktanEnlemBoylama } from './projeksiyon.js';
import { yerlesimOlustur, YER } from './yerlesim.js';
import { secimKatmaniOlustur } from './secim-katmani.js';

const DOKUNMA_PAYI = 8; // piksel; daha fazla kayarsa sürükleme sayılır
const YER_ARAMA = 40;   // blok
const YAKINLIK = 130;   // odaklanınca kamera uzaklığı
const yuvarla = (d) => Math.round(d * 1e6) / 1e6; // shared/giftRules.ts ile aynı

// Binanın kenarından en yakın uygun hücre: halka halka dışarı bakılır
function binaOnu(bina, yerlesim) {
  const mi = Math.floor(bina.merkez.x), mj = Math.floor(bina.merkez.z);
  for (let r = 0; r <= YER_ARAMA; r++) {
    for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) {
      if (Math.max(Math.abs(a), Math.abs(b)) !== r) continue;
      if (yerlesim.hucreDurumu(mi + a, mj + b) === YER.UYGUN) return { i: mi + a, j: mj + b };
    }
  }
  return null;
}

export async function apiKur(baglam, harita) {
  const { osm, izgara, binaIzgarasi, sahne, kamera, kontroller, tuval, zeminNesnesi, binalar, adliBinalar, veriAdresi, hediyeBul } = baglam;
  const yanit = await fetch(new URL('data/kampus-siniri.json', veriAdresi));
  if (!yanit.ok) throw new Error(`data/kampus-siniri.json okunamadı (HTTP ${yanit.status})`);
  const sinir = await yanit.json();
  const yerlesim = yerlesimOlustur(osm, sinir, izgara);

  const katman = secimKatmaniOlustur(binaIzgarasi);
  katman.sinirCiz(sinir.halka);
  sahne.add(katman.grup);

  const secilen = new Map();
  for (const bina of adliBinalar) {
    if (yerlesim.hucreDurumu(Math.floor(bina.merkez.x), Math.floor(bina.merkez.z)) === YER.SINIR_DISI) continue;
    if (!secilen.has(bina.ad) || bina.alan > secilen.get(bina.ad).alan) secilen.set(bina.ad, bina);
  }
  const yerler = [];
  for (const bina of secilen.values()) {
    const on = binaOnu(bina, yerlesim);
    if (!on) continue;
    const g = bloktanEnlemBoylama(on.i + 0.5, on.j + 0.5);
    yerler.push({ ad: bina.ad, enlem: yuvarla(g.enlem), boylam: yuvarla(g.boylam) });
  }
  yerler.sort((p, q) => p.ad.localeCompare(q.ad, 'tr'));

  const dinleyiciler = { 'yer-secildi': new Set() };
  const yay = (olay, veri) => { for (const cb of dinleyiciler[olay]) cb(veri); };

  // Kısa, tek parmakla, kaymayan dokunuş seçimdir; gerisi kamera hareketi
  const isin = new THREE.Raycaster();
  const parmaklar = new Set();
  let baslangic = null;
  tuval.addEventListener('pointerdown', (e) => {
    parmaklar.add(e.pointerId);
    baslangic = parmaklar.size === 1 && e.button === 0 ? { x: e.clientX, y: e.clientY } : null;
  });
  tuval.addEventListener('pointermove', (e) => {
    if (baslangic && Math.hypot(e.clientX - baslangic.x, e.clientY - baslangic.y) > DOKUNMA_PAYI) baslangic = null;
  });
  tuval.addEventListener('pointercancel', (e) => { parmaklar.delete(e.pointerId); baslangic = null; });
  tuval.addEventListener('pointerup', (e) => {
    parmaklar.delete(e.pointerId);
    if (!baslangic) return;
    baslangic = null;

    const kutu = tuval.getBoundingClientRect();
    const x = e.clientX - kutu.left, y = e.clientY - kutu.top;
    // Kutuya dokunulduysa olayı harita.js verir; yer seçimi sayılmaz
    if (hediyeBul(x, y, kutu.width, kutu.height, kamera) !== null) return;

    isin.setFromCamera(new THREE.Vector2(x / kutu.width * 2 - 1, 1 - y / kutu.height * 2), kamera);
    const vurus = isin.intersectObjects([zeminNesnesi, binalar], false)[0];
    if (!vurus) return;
    const nokta = vurus.point.clone();
    // Bina yüzüne dokunulduysa nokta binanın içine alınır, "bina" desin
    if (vurus.object === binalar && vurus.face) nokta.addScaledVector(vurus.face.normal, -0.05);
    const g = bloktanEnlemBoylama(nokta.x, nokta.z);
    const enlem = yuvarla(g.enlem), boylam = yuvarla(g.boylam);
    yay('yer-secildi', { enlem, boylam, durum: yerlesim.durum(enlem, boylam) });
  });

  let hediyeler = [];

  return {
    guncelle: (saniye) => katman.guncelle(kamera, saniye),
    api: {
      hediyeleriGoster(liste) {
        hediyeler = liste;
        harita.hediyeleriGoster(liste);
      },
      hediyeVurgula: (id) => katman.vurgula(hediyeler.find((h) => h.id === id) ?? null),
      gpsKonumu: (konum) => harita.gpsKonumu(konum),
      oyuncuyaOdaklan: () => harita.oyuncuyaOdaklan(),
      yerIsaretle: (yer) => katman.isaretle(yer),
      yerDurumu: (enlem, boylam) => yerlesim.durum(enlem, boylam),
      yerler,
      yakinYer(enlem, boylam) {
        const n = enlemBoylamdanBloga(enlem, boylam);
        let enIyi = null;
        for (const yer of yerler) {
          const b = enlemBoylamdanBloga(yer.enlem, yer.boylam);
          const metre = Math.round(Math.hypot(b.x - n.x, b.z - n.z) * BLOK_METRE);
          if (!enIyi || metre < enIyi.metre) enIyi = { ad: yer.ad, metre };
        }
        return enIyi;
      },
      odakla({ enlem, boylam }) {
        const { x, z } = enlemBoylamdanBloga(enlem, boylam);
        const hedef = new THREE.Vector3(
          THREE.MathUtils.clamp(x, 0, IZGARA.genislik), 0, THREE.MathUtils.clamp(z, 0, IZGARA.derinlik)
        );
        // Tepeye yakın bir açı: seçilen yer ağaçların arkasında kalmasın
        kamera.position.copy(hedef).add(new THREE.Vector3(0, YAKINLIK * 0.88, YAKINLIK * 0.47));
        kontroller.target.copy(hedef);
        kontroller.update();
      },
      on(olay, cb) {
        if (olay === 'hediye-tiklandi') return harita.on(olay, cb);
        dinleyiciler[olay].add(cb);
        return () => dinleyiciler[olay].delete(cb);
      }
    }
  };
}
