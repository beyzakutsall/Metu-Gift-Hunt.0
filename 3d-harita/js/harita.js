// Haritanın tek kapısı. Başka bir sayfa (ör. React uygulaması) haritayı yalnızca bu dosya
// üzerinden kullanır; dış dünya her zaman {enlem, boylam} konuşur, blok koordinatını harita bilir.
//
//   const harita = haritaBaslat(kapsayici, { veriAdresi: '/3d-harita/' });
//   harita.on('hazir', () => ...);
//   harita.gpsKonumu({ enlem, boylam, dogruluk });
//   harita.hediyeleriGoster([{ id, enlem, boylam, alinabilir }]);
//   harita.on('hediye-tiklandi', ({ id }) => ...);
//   harita.yokEt(); // sayfadan çıkarken
//
// Ayrıntılar: README.md, "Uygulamaya gömmek".
import * as THREE from 'three';
import { enlemBoylamdanBloga } from './projeksiyon.js';
import { zeminIzgarasiOlustur } from './dunya.js';
import { zeminDokulariniOlustur, binaDokulariniOlustur } from './dokular.js';
import { zeminOlustur } from './zemin.js';
import { binaIzgarasiOlustur, binalariOlustur } from './binalar.js';
import { agaclariOlustur } from './agaclar.js';
import { dolulukOlustur } from './doluluk.js';
import { binaAdlariniYukle, adliBinalariBul } from './bina-adlari.js';
import { girisleriBul, tabelaYerleriniSec, tabelalariOlustur } from './tabelalar.js';
import { etiketleriOlustur } from './etiketler.js';
import { elleEklenenleriYukle, nesneYerleriniSec, nesneleriOlustur } from './nesneler.js';
import { kameraKontrolleriniKur } from './kamera.js';
import { oyunKatmaniOlustur } from './oyun-katmani.js';
import { BLOK_METRE } from './projeksiyon.js';

const GOK_RENGI = 0x8ec8ff;
const BASLANGIC = { enlem: 39.8915, boylam: 32.7835 }; // Devrim Stadı / Kütüphane civarı
const ODAKLANMA_UZAKLIGI = 70;                        // blok; odaklanınca kamera en fazla bu kadar uzakta kalır
const OLAYLAR = ['hazir', 'hata', 'hediye-tiklandi'];

/**
 * Haritayı verilen öğenin içine kurar. Hemen döner; kurulum arkada sürer ve bitince
 * 'hazir' olayı gelir. Kurulum bitmeden çağrılan gpsKonumu ve hediyeleriGoster saklanır,
 * harita hazır olunca uygulanır.
 *
 * @param {HTMLElement} kapsayici Haritanın çizileceği öğe; CSS ile genişliği ve yüksekliği olmalı.
 * @param {object} [secenekler]
 * @param {string} [secenekler.veriAdresi] data/ ve modeller/ klasörlerinin bulunduğu adres.
 *   Verilmezse bu dosyanın bir üst klasörü (3d-harita/) kullanılır.
 * @param {{enlem: number, boylam: number}} [secenekler.baslangic] Kameranın ilk baktığı yer.
 * @param {boolean} [secenekler.yuklemeEkrani=true] Kurulurken ve hata olunca kutunun ortasında yazı göster.
 * @param {boolean} [secenekler.atif=true] Sağ alt köşede OSM ve model atfını göster (lisans gereği zorunlu;
 *   kapatırsanız atfı sayfanızda başka bir yerde gösterin).
 * @param {boolean} [secenekler.ilkKonumdaOdaklan=true] İlk GPS konumu gelince kamera oyuncuya uçsun.
 */
export function haritaBaslat(kapsayici, secenekler = {}) {
  if (!(kapsayici instanceof HTMLElement)) {
    throw new TypeError('haritaBaslat: ilk parametre haritanın çizileceği HTML öğesi olmalı.');
  }
  const veriAdresi = klasorAdresi(secenekler.veriAdresi ?? new URL(/* @vite-ignore */ '../', import.meta.url).href);
  const baslangic = secenekler.baslangic ?? BASLANGIC;
  const ilkKonumdaOdaklan = secenekler.ilkKonumdaOdaklan !== false;

  let durum = 'kuruluyor';          // 'kuruluyor' | 'hazir' | 'hata' | 'kapandi'
  let hataBilgisi = null;
  const dinleyiciler = new Map(OLAYLAR.map((o) => [o, new Set()]));
  const yay = (olay, veri) => {
    for (const cb of [...dinleyiciler.get(olay)]) {
      try { cb(veri); } catch (e) { console.error(`harita.on('${olay}') dinleyicisi hata verdi:`, e); }
    }
  };

  let hazirCoz, hazirReddet;
  const hazir = new Promise((coz, reddet) => { hazirCoz = coz; hazirReddet = reddet; });
  hazir.catch(() => {}); // kimse beklemiyorsa konsola "yakalanmamış hata" düşmesin

  // Kurulum bitmeden gelen istekler
  let bekleyenKonum;                 // undefined: yok, null: gizle, nesne: konum
  let bekleyenHediyeler = null;

  // Tuval ve yazılar kutuya mutlak konumla yerleşir; kutu konumlandırılmamışsa göreli yapılır
  // (kapatınca eski hâline döner). Tuval kutunun boyutunu etkilemez, kutunun boyutunu CSS verir.
  let eskiKonumStili = null;
  if (getComputedStyle(kapsayici).position === 'static') {
    eskiKonumStili = kapsayici.style.position;
    kapsayici.style.position = 'relative';
  }

  // --- Kutunun içindeki yazılar (yükleniyor, atıf) ---
  const eklenenler = [];
  let yaziKutusu = null;
  if (secenekler.yuklemeEkrani !== false) {
    yaziKutusu = ogeOlustur('div', YAZI_STILI, 'Kampüs inşa ediliyor…');
    kapsayici.appendChild(yaziKutusu);
    eklenenler.push(yaziKutusu);
  }
  if (secenekler.atif !== false) {
    const atif = ogeOlustur('div', ATIF_STILI);
    atif.innerHTML = ATIF_HTML;
    kapsayici.appendChild(atif);
    eklenenler.push(atif);
  }

  function basarisiz(hata) {
    if (durum === 'kapandi') return;
    console.error(hata);
    durum = 'hata';
    hataBilgisi = { mesaj: hataMesaji(hata) };
    if (yaziKutusu) { yaziKutusu.textContent = hataBilgisi.mesaj; yaziKutusu.hidden = false; }
    hazirReddet(new Error(hataBilgisi.mesaj));
    yay('hata', hataBilgisi);
  }

  // --- Çizici ---
  let renderer = null;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false });
  } catch (e) {
    queueMicrotask(() => basarisiz(new WebGLYokHatasi(e)));
  }

  const sahne = new THREE.Scene();
  sahne.background = new THREE.Color(GOK_RENGI);
  const kamera = new THREE.PerspectiveCamera(50, 1, 0.5, 4000);
  const katman = oyunKatmaniOlustur(GOK_RENGI);
  sahne.add(katman.grup);
  let kontroller = null, etiketler = null, agaclar = null, nesneler = null;

  let genislik = 0, yukseklik = 0;
  function boyutla() {
    const g = kapsayici.clientWidth, y = kapsayici.clientHeight;
    if (!g || !y || (g === genislik && y === yukseklik)) return;
    genislik = g; yukseklik = y;
    kamera.aspect = g / y;
    kamera.updateProjectionMatrix();
    renderer.setSize(g, y, false); // CSS boyutu kutudan gelir
  }
  let gozlemci = null;
  const tuval = renderer?.domElement;
  if (renderer) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    Object.assign(tuval.style, { display: 'block', position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', touchAction: 'none' });
    kapsayici.insertBefore(tuval, kapsayici.firstChild);
    boyutla();
    if (!genislik || !yukseklik) {
      console.warn('Harita kapsayıcısının genişliği ya da yüksekliği 0. Kapsayıcıya CSS ile boyut verin (ör. height: 100%).');
    }
    gozlemci = new ResizeObserver(boyutla);
    gozlemci.observe(kapsayici);
  }

  // --- Dokunma: sürüklemeden kısa dokunuş bir hediyeye yakınsa olay çıkar ---
  let basilan = null;
  const asagi = (e) => { if (e.isPrimary) basilan = { x: e.clientX, y: e.clientY, t: performance.now() }; };
  const yukari = (e) => {
    if (!e.isPrimary || !basilan) return;
    const kisaDokunus = Math.hypot(e.clientX - basilan.x, e.clientY - basilan.y) < 8 && performance.now() - basilan.t < 600;
    basilan = null;
    if (!kisaDokunus || durum !== 'hazir') return;
    const r = tuval.getBoundingClientRect();
    const id = katman.hediyeBul(e.clientX - r.left, e.clientY - r.top, r.width, r.height, kamera);
    if (id !== null) yay('hediye-tiklandi', { id });
  };
  tuval?.addEventListener('pointerdown', asagi);
  tuval?.addEventListener('pointerup', yukari);

  // --- Kamera: oyuncuya uçuş ve takip ---
  let takip = false;
  let ucus = null;
  const fark = new THREE.Vector3(), ofset = new THREE.Vector3();

  function kamerayiKaydir(dx, dz) {
    kontroller.target.x += dx; kontroller.target.z += dz;
    kamera.position.x += dx; kamera.position.z += dz;
  }

  function kameraGuncelle(dt) {
    const oyuncu = katman.oyuncu;
    if (ucus) {
      ucus.t = Math.min(1, ucus.t + dt / 0.9);
      const k = ucus.t < 0.5 ? 2 * ucus.t * ucus.t : 1 - (-2 * ucus.t + 2) ** 2 / 2; // yumuşak başla, yumuşak dur
      const hedef = oyuncu.gorunur ? oyuncu.konum : ucus.son;
      kamerayiKaydir(
        ucus.bas.x + (hedef.x - ucus.bas.x) * k - kontroller.target.x,
        ucus.bas.z + (hedef.z - ucus.bas.z) * k - kontroller.target.z
      );
      // Çok uzaktaysa yaklaş
      ofset.subVectors(kamera.position, kontroller.target);
      const uzunluk = ucus.basUzaklik + (ucus.sonUzaklik - ucus.basUzaklik) * k;
      kamera.position.copy(kontroller.target).add(ofset.setLength(uzunluk));
      if (ucus.t >= 1) ucus = null;
    } else if (takip && oyuncu.gorunur) {
      fark.subVectors(oyuncu.konum, kontroller.target);
      const a = Math.min(1, dt * 4);
      kamerayiKaydir(fark.x * a, fark.z * a);
    }
  }

  // --- Kurulum ---
  async function kur() {
    const yanit = await fetch(new URL('data/campus.json', veriAdresi));
    if (!yanit.ok) throw new Error(`data/campus.json okunamadı (HTTP ${yanit.status})`);
    const osm = await yanit.json();
    if (durum === 'kapandi') return;

    const anizotropi = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const izgara = zeminIzgarasiOlustur(osm);
    sahne.add(zeminOlustur(izgara, zeminDokulariniOlustur(anizotropi), GOK_RENGI));

    const binaIzgarasi = binaIzgarasiOlustur(osm);
    const binalar = binalariOlustur(binaIzgarasi, binaDokulariniOlustur(anizotropi), GOK_RENGI);
    sahne.add(binalar);
    console.info(`Binalar: ${binaIzgarasi.binaSayisi} bina, ${binalar.userData.dortgenSayisi} dörtgen`);

    const doluluk = dolulukOlustur(izgara, binaIzgarasi); // tabela, nesne ve ağaçlar birbirine girmesin

    const kisaAdlar = await binaAdlariniYukle(veriAdresi);
    if (durum === 'kapandi') return;
    const adliBinalar = adliBinalariBul(osm, kisaAdlar, binaIzgarasi);
    const tabelalar = tabelalariOlustur(tabelaYerleriniSec(adliBinalar, girisleriBul(osm), izgara, doluluk), GOK_RENGI);
    sahne.add(tabelalar);
    etiketler = etiketleriOlustur(adliBinalar);
    sahne.add(etiketler);
    console.info(`Tabelalar: ${tabelalar.userData.tabelaSayisi} tabela (${adliBinalar.length} adlı bina), ${etiketler.userData.etiketSayisi} yüzen etiket`);

    const elleEklenenler = await elleEklenenleriYukle(veriAdresi);
    if (durum === 'kapandi') return;
    nesneler = nesneleriOlustur(nesneYerleriniSec(osm, elleEklenenler, izgara, doluluk), GOK_RENGI);
    sahne.add(nesneler);
    const nesneSayilari = Object.entries(nesneler.userData.sayilar).map(([tur, n]) => `${n} ${tur}`).join(', ');
    console.info(`Nesneler: ${nesneSayilari} (toplam ${nesneler.userData.toplamUcgen} üçgen)`);

    agaclar = await agaclariOlustur(izgara, binaIzgarasi, GOK_RENGI, doluluk, veriAdresi);
    sahne.add(agaclar);
    if (durum === 'kapandi') { sahneyiTemizle(); return; }

    const b = enlemBoylamdanBloga(baslangic.enlem, baslangic.boylam);
    kontroller = kameraKontrolleriniKur(kamera, tuval, new THREE.Vector3(b.x, 0, b.z));
    kontroller.enablePan = !takip;

    durum = 'hazir';
    if (yaziKutusu) yaziKutusu.hidden = true;
    if (bekleyenHediyeler) harita.hediyeleriGoster(bekleyenHediyeler);
    if (bekleyenKonum !== undefined) harita.gpsKonumu(bekleyenKonum);
    bekleyenHediyeler = null; bekleyenKonum = undefined;
    cizimiAyarla();
    hazirCoz(harita);
    yay('hazir');
  }

  // --- Çizim döngüsü (sekme gizliyken durur) ---
  let oncekiZaman = null;
  function ciz(zamanMs) {
    const saniye = zamanMs / 1000;
    const dt = oncekiZaman === null ? 0 : Math.min(0.1, saniye - oncekiZaman);
    oncekiZaman = saniye;
    agaclar.userData.guncelle(saniye);   // ışıkların yanıp sönmesi
    nesneler.userData.guncelle(saniye);  // lambalar gece yanar
    katman.guncelle(dt, saniye);
    kameraGuncelle(dt);
    kontroller.update();
    etiketler.userData.guncelle(kamera, genislik, yukseklik); // yakında solar, çakışan gizlenir
    renderer.render(sahne, kamera);
  }
  function cizimiAyarla() {
    if (durum !== 'hazir') return;
    const acik = !document.hidden;
    oncekiZaman = null;
    renderer.setAnimationLoop(acik ? ciz : null);
  }
  document.addEventListener('visibilitychange', cizimiAyarla);

  function sahneyiTemizle() {
    sahne.traverse((o) => {
      o.geometry?.dispose();
      const malzemeler = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
      for (const mal of malzemeler) {
        mal.map?.dispose();
        for (const u of Object.values(mal.uniforms ?? {})) if (u?.value?.isTexture) u.value.dispose();
        mal.dispose();
      }
      if (o.isInstancedMesh) o.dispose();
    });
  }

  // ---------------- Dışa açılan nesne ----------------
  const harita = {
    /** Kurulum bitince çözülen söz. Hata olursa Türkçe mesajlı bir Error ile reddedilir. */
    hazir,

    /**
     * Olay dinler. Dönen fonksiyon çağrılınca dinleme biter.
     * 'hazir' → veri yok; 'hata' → { mesaj }; 'hediye-tiklandi' → { id }
     * Harita zaten hazırsa (ya da hata verdiyse) sonradan bağlanan 'hazir'/'hata' dinleyicisi de çağrılır.
     */
    on(olay, cb) {
      if (!dinleyiciler.has(olay)) throw new Error(`harita.on: bilinmeyen olay "${olay}". Olaylar: ${OLAYLAR.join(', ')}`);
      if (typeof cb !== 'function') return () => {};
      dinleyiciler.get(olay).add(cb);
      if (olay === 'hazir' && durum === 'hazir') queueMicrotask(() => cb());
      if (olay === 'hata' && durum === 'hata') queueMicrotask(() => cb(hataBilgisi));
      return () => dinleyiciler.get(olay)?.delete(cb);
    },

    /**
     * Oyuncunun konumu (telefonun GPS'inden). Oyuncu işareti oraya yürür; 50 m'den büyük
     * sıçramada ışınlanır. dogruluk (metre) yerdeki mavi halkanın yarıçapıdır.
     * null verilirse oyuncu işareti gizlenir (ör. konum izni geri alındı).
     * @param {{enlem: number, boylam: number, dogruluk?: number} | null} konum
     */
    gpsKonumu(konum) {
      if (durum === 'kapandi') return;
      if (konum !== null && !(Number.isFinite(konum?.enlem) && Number.isFinite(konum?.boylam))) {
        console.warn('harita.gpsKonumu: {enlem, boylam} sayı olmalı; yok sayıldı:', konum);
        return;
      }
      if (durum !== 'hazir') { bekleyenKonum = konum; return; }
      if (konum === null) { katman.oyuncuyuGizle(); return; }
      const ilk = !katman.oyuncu.gorunur;
      const b = enlemBoylamdanBloga(konum.enlem, konum.boylam);
      katman.oyuncuKonumu(b.x, b.z, (konum.dogruluk ?? 0) / BLOK_METRE);
      if (ilk && ilkKonumdaOdaklan && !takip) harita.oyuncuyaOdaklan();
    },

    /**
     * Haritadaki hediye kutularını verilen listeyle değiştirir. Yeni gelen kutu büyüyerek
     * belirir, listeden çıkan küçülerek kaybolur. alinabilir: true olan zıplar ve ışığı parlar.
     * @param {Array<{id: string|number, enlem: number, boylam: number, alinabilir?: boolean}>} liste
     */
    hediyeleriGoster(liste) {
      if (durum === 'kapandi') return;
      if (!Array.isArray(liste)) { console.warn('harita.hediyeleriGoster: dizi bekleniyordu:', liste); return; }
      if (durum !== 'hazir') { bekleyenHediyeler = liste; return; }
      const temiz = [];
      for (const h of liste) {
        if (h?.id === undefined || h.id === null || !Number.isFinite(h.enlem) || !Number.isFinite(h.boylam)) {
          console.warn('harita.hediyeleriGoster: {id, enlem, boylam} eksik; bu kutu atlandı:', h);
          continue;
        }
        const b = enlemBoylamdanBloga(h.enlem, h.boylam);
        temiz.push({ id: h.id, x: b.x, z: b.z, alinabilir: h.alinabilir === true });
      }
      katman.hediyeleriAyarla(temiz);
    },

    /**
     * Bir noktanın ekrandaki yeri: kapsayıcının sol üst köşesine göre CSS pikseli.
     * Kameranın arkasındaysa ya da harita hazır değilse null. Ör. bir kutunun üstüne baloncuk koymak için.
     * @param {{enlem: number, boylam: number}} nokta
     * @param {number} [yukseklikMetre=3] Yerden yükseklik (hediye kutusunun ortası ≈ 3 m)
     * @returns {{x: number, y: number} | null}
     */
    ekranKonumu(nokta, yukseklikMetre = 3) {
      if (durum !== 'hazir' || !Number.isFinite(nokta?.enlem) || !Number.isFinite(nokta?.boylam)) return null;
      const b = enlemBoylamdanBloga(nokta.enlem, nokta.boylam);
      const v = new THREE.Vector3(b.x, yukseklikMetre / BLOK_METRE, b.z).project(kamera);
      if (v.z < -1 || v.z > 1) return null;
      return { x: (v.x + 1) / 2 * genislik, y: (1 - v.y) / 2 * yukseklik };
    },

    /** Kamerayı oyuncuya uçurur (oyuncu henüz görünmüyorsa bir şey yapmaz). */
    oyuncuyaOdaklan() {
      if (durum !== 'hazir' || !katman.oyuncu.gorunur) return;
      const uzaklik = kamera.position.distanceTo(kontroller.target);
      ucus = {
        t: 0,
        bas: kontroller.target.clone(),
        son: katman.oyuncu.konum.clone(),
        basUzaklik: uzaklik,
        sonUzaklik: Math.min(uzaklik, ODAKLANMA_UZAKLIGI)
      };
    },

    /**
     * true: kamera oyuncuyu izler (döndürme ve yakınlaştırma çalışır, kaydırma kapanır).
     * false: kamera serbest.
     */
    takipEt(acik) {
      takip = !!acik;
      if (kontroller) kontroller.enablePan = !takip;
      if (takip) harita.oyuncuyaOdaklan();
    },

    /** Haritayı kapatır: çizimi durdurur, belleği ve WebGL bağlamını bırakır, öğeleri kaldırır. */
    yokEt() {
      if (durum === 'kapandi') return;
      durum = 'kapandi';
      renderer?.setAnimationLoop(null);
      gozlemci?.disconnect();
      document.removeEventListener('visibilitychange', cizimiAyarla);
      tuval?.removeEventListener('pointerdown', asagi);
      tuval?.removeEventListener('pointerup', yukari);
      kontroller?.dispose();
      sahneyiTemizle();
      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss(); // tarayıcının WebGL bağlam sınırına takılmamak için hemen bırak
        tuval.remove();
      }
      for (const oge of eklenenler) oge.remove();
      if (eskiKonumStili !== null) kapsayici.style.position = eskiKonumStili;
      for (const set of dinleyiciler.values()) set.clear();
    }
  };

  if (renderer) kur().catch(basarisiz);
  return harita;
}

// ---------------- Yardımcılar ----------------

class WebGLYokHatasi extends Error {
  constructor(neden) { super('WebGL yok'); this.neden = neden; }
}

function hataMesaji(hata) {
  if (hata instanceof WebGLYokHatasi) return 'Bu cihaz ya da tarayıcı 3B haritayı (WebGL) desteklemiyor.';
  if (location.protocol === 'file:') return 'Sayfa yerel bir sunucu üzerinden açılmalı (README\'ye bakın).';
  if (hata instanceof TypeError && /fetch/i.test(hata.message)) return 'Harita verisi indirilemedi. İnternet bağlantınızı kontrol edin.';
  return 'Harita yüklenemedi: ' + (hata?.message ?? String(hata));
}

function klasorAdresi(adres) {
  const tam = new URL(adres, document.baseURI).href;
  return tam.endsWith('/') ? tam : tam + '/';
}

function ogeOlustur(etiket, stil, yazi = '') {
  const o = document.createElement(etiket);
  Object.assign(o.style, stil);
  o.textContent = yazi;
  return o;
}

// Sayfanın CSS'ine dokunmamak için yazıların stili satır içi
const YAZI_STILI = {
  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
  maxWidth: 'calc(100% - 64px)', padding: '14px 20px', background: '#4a4d52', color: '#fff',
  border: '4px solid #2e3034', boxShadow: 'inset -4px -4px 0 #3a3d41, inset 4px 4px 0 #62656a',
  font: '600 15px/1.4 system-ui, sans-serif', textAlign: 'center', zIndex: '1', pointerEvents: 'none'
};
const ATIF_STILI = {
  position: 'absolute', right: '0', bottom: '0', padding: '3px 8px',
  background: 'rgba(255, 255, 255, 0.8)', color: '#333', font: '12px system-ui, sans-serif', zIndex: '1'
};
const ATIF_HTML =
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener" style="color:inherit;text-decoration:none">© OpenStreetMap katkıcıları</a>' +
  ' · <a href="https://sketchfab.com/3d-models/minecraft-christmas-tree-free-21010e7da7134d3899e6c0d7d008593a" target="_blank" rel="noopener" style="color:inherit;text-decoration:none">Ağaç modeli: CombatCraft Game / UnitedPechoraRecords</a>, ' +
  '<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener" style="color:inherit;text-decoration:none">CC BY 4.0</a>';
