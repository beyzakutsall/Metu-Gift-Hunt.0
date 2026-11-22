/**
 * Harita motorunun tek kapısı (HARITA-MOTORU.md, Bölüm 5.2).
 * Aşama 1 taslağı: yeşil düzlem, hediye kutuları, kuşbakışı ve basit takip kamerası,
 * bütün olaylar. Gerçek kod gelince içi değişir, imzalar değişmez.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SINIR, BLOK_METRE, enlemBoylamdanDunyaya, dunyadanEnlemBoylama } from '../ortak/koordinat.js';

/** Metreyi bloğa çevirir. */
const m = (metre) => metre / BLOK_METRE;
const DERECE = Math.PI / 180;

const GOKYUZU = 0xf4e3c8;
const CIM = 0x86b85c;
const PARCA_CIZGI = 0x76a64f;
const SUTUN = 0xffd36b;

const YURUME = m(1.4);
const KOSMA = m(4);
const GPS_HIZ = m(6);
const ISINLANMA = m(50);
const HAREKET_ARALIGI = 500;

/**
 * Yüz yönüne göre sabit ton (Bölüm 9.3): üst 1,0, doğu-batı 0,82, kuzey-güney 0,68, alt 0,55.
 * @param {THREE.BufferGeometry} geo
 * @param {number} renk
 */
function tonla(geo, renk) {
  const normal = geo.attributes.normal;
  const c = new THREE.Color(renk);
  const dizi = new Float32Array(normal.count * 3);
  for (let i = 0; i < normal.count; i++) {
    const nx = normal.getX(i);
    const ny = normal.getY(i);
    const t = ny > 0.5 ? 1 : ny < -0.5 ? 0.55 : Math.abs(nx) > 0.5 ? 0.82 : 0.68;
    dizi.set([c.r * t, c.g * t, c.b * t], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(dizi, 3));
  return geo;
}

/** Metre cinsinden, alt yüzü y'de duran tonlu kutu. */
function kutu(gx, gy, gz, x, y, z, renk) {
  const g = new THREE.BoxGeometry(m(gx), m(gy), m(gz));
  g.translate(m(x), m(y + gy / 2), m(z));
  return tonla(g, renk);
}

/** 1,75 m boyunda bloklu yer tutucu figür; yüzü −z'ye bakar. */
function avatarGeometrisi() {
  const ten = 0xe8b48a, sac = 0x3b2a20, gomlek = 0xc8322d, pantolon = 0x2f4170, ayakkabi = 0x222222;
  return mergeGeometries([
    kutu(0.2, 0.08, 0.28, -0.11, 0, -0.02, ayakkabi),
    kutu(0.2, 0.08, 0.28, 0.11, 0, -0.02, ayakkabi),
    kutu(0.2, 0.74, 0.22, -0.11, 0.08, 0, pantolon),
    kutu(0.2, 0.74, 0.22, 0.11, 0.08, 0, pantolon),
    kutu(0.5, 0.6, 0.28, 0, 0.82, 0, gomlek),
    kutu(0.13, 0.58, 0.2, -0.32, 0.84, 0, gomlek),
    kutu(0.13, 0.58, 0.2, 0.32, 0.84, 0, gomlek),
    kutu(0.3, 0.3, 0.3, 0, 1.42, 0, ten),
    kutu(0.32, 0.06, 0.32, 0, 1.69, 0, sac),
    kutu(0.06, 0.05, 0.02, -0.07, 1.56, -0.16, 0x222222),
    kutu(0.06, 0.05, 0.02, 0.07, 1.56, -0.16, 0x222222),
  ]);
}

/** 50 cm'lik kırmızı kutu, beyaz kurdele; tabanı orijinde. */
function hediyeGeometrisi() {
  return mergeGeometries([
    kutu(0.5, 0.5, 0.5, 0, 0, 0, 0xd8262b),
    kutu(0.1, 0.52, 0.52, 0, -0.01, 0, 0xffffff),
    kutu(0.52, 0.52, 0.1, 0, -0.01, 0, 0xffffff),
  ]);
}

const sinirla = (d, a, b) => Math.min(b, Math.max(a, d));
const yumusat = (t) => t * t * (3 - 2 * t);
/** Açı farkını −π..π aralığına getirir. */
const aciFarki = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

/**
 * @typedef {{enlem: number, boylam: number}} EnlemBoylam
 * @typedef {{id: any, enlem: number, boylam: number, alinabilir?: boolean}} Hediye
 */

/**
 * @param {HTMLElement} kapsayici
 * @param {{baslangic?: EnlemBoylam, mod?: 'kus' | 'takip'}} [secenekler]
 */
export async function haritaBaslat(kapsayici, secenekler = {}) {
  /** @type {Map<string, Function[]>} */
  const dinleyiciler = new Map();
  let hazirOldu = false;
  let durdu = false;

  function yay(olay, veri) {
    for (const cb of dinleyiciler.get(olay) ?? []) {
      try { cb(veri); } catch (e) { console.error(e); }
    }
  }
  function hataVer(mesaj, sebep) {
    if (sebep) console.error(sebep);
    yay('hata', { mesaj });
  }

  // --- Renderer ---
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  } catch (e) {
    console.error(e);
    throw new Error('Bu cihazda harita çizilemiyor: WebGL açılamadı.');
  }
  let pikselOrani = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(pikselOrani);
  renderer.setClearColor(GOKYUZU);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  kapsayici.appendChild(renderer.domElement);
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    durdu = true;
    hataVer('Harita çizimi durdu. Sayfayı yenileyip yeniden dene.');
  });

  const sahne = new THREE.Scene();
  sahne.background = new THREE.Color(GOKYUZU);
  sahne.fog = new THREE.Fog(GOKYUZU, m(600), m(2600));

  const kamera = new THREE.PerspectiveCamera(55, 1, m(0.5), m(4000));

  // --- Zemin: kampüs büyüklüğünde yeşil düzlem ve parça sınırları ---
  const kose = enlemBoylamdanDunyaya(SINIR.guney, SINIR.dogu);
  const genislik = kose.x;
  const derinlik = kose.z;
  const zeminGeo = new THREE.PlaneGeometry(genislik, derinlik);
  zeminGeo.rotateX(-Math.PI / 2);
  zeminGeo.translate(genislik / 2, 0, derinlik / 2);
  sahne.add(new THREE.Mesh(zeminGeo, new THREE.MeshBasicMaterial({ color: CIM })));

  const cizgiler = [];
  for (let x = 0; x <= genislik; x += 128) cizgiler.push(x, 0.02, 0, x, 0.02, derinlik);
  for (let z = 0; z <= derinlik; z += 128) cizgiler.push(0, 0.02, z, genislik, 0.02, z);
  const cizgiGeo = new THREE.BufferGeometry();
  cizgiGeo.setAttribute('position', new THREE.Float32BufferAttribute(cizgiler, 3));
  sahne.add(new THREE.LineSegments(cizgiGeo, new THREE.LineBasicMaterial({ color: PARCA_CIZGI })));

  // --- Oyuncu ---
  const bas = secenekler.baslangic ?? {
    enlem: (SINIR.guney + SINIR.kuzey) / 2, boylam: (SINIR.bati + SINIR.dogu) / 2,
  };
  const basDunya = enlemBoylamdanDunyaya(bas.enlem, bas.boylam);
  const oyuncuPoz = new THREE.Vector3(basDunya.x, 0, basDunya.z);
  let oyuncuYon = 0; // radyan, 0 = kuzey, saat yönünde artar
  let adimFazi = 0;
  const avatar = new THREE.Mesh(avatarGeometrisi(), new THREE.MeshBasicMaterial({ vertexColors: true }));
  sahne.add(avatar);

  /** @type {THREE.Vector3 | null} */
  let gpsHedef = null;
  let serbest = false;
  const joystick = { ileri: 0, yan: 0 };
  const tuslar = new Set();

  // --- Hediyeler ---
  const kutuGeo = hediyeGeometrisi();
  const kutuMalz = new THREE.MeshBasicMaterial({ vertexColors: true });
  const sutunGeo = new THREE.CylinderGeometry(m(1.2), m(1.2), m(20), 8, 1, true);
  sutunGeo.translate(0, m(10), 0);
  const sutunMalz = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
  let kapasite = 0;
  /** @type {THREE.InstancedMesh} */ let kutuMesh;
  /** @type {THREE.InstancedMesh} */ let sutunMesh;
  function kapasiteAyarla(n) {
    if (n <= kapasite) return;
    kapasite = Math.max(64, 2 ** Math.ceil(Math.log2(n)));
    for (const eski of [kutuMesh, sutunMesh]) if (eski) { sahne.remove(eski); eski.dispose(); }
    kutuMesh = new THREE.InstancedMesh(kutuGeo, kutuMalz, kapasite);
    sutunMesh = new THREE.InstancedMesh(sutunGeo, sutunMalz, kapasite);
    for (const mesh of [kutuMesh, sutunMesh]) {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.count = 0;
      sahne.add(mesh);
    }
    sutunMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(kapasite * 3), 3);
    sutunMesh.renderOrder = 1;
  }
  kapasiteAyarla(64);

  /** @type {Map<any, {id: any, x: number, z: number, alinabilir: boolean, olcek: number, cikiyor: boolean, faz: number}>} */
  const hediyeler = new Map();
  let vurgulu = null;

  // --- Kamera durumu ---
  let mod = secenekler.mod === 'takip' ? 'takip' : 'kus';
  const kontrol = new OrbitControls(kamera, renderer.domElement);
  kontrol.enableDamping = true;
  kontrol.screenSpacePanning = false;
  kontrol.minDistance = m(40);
  kontrol.maxDistance = m(1800);
  kontrol.minPolarAngle = (90 - 75) * DERECE;
  kontrol.maxPolarAngle = (90 - 20) * DERECE;

  const bakis = new THREE.Vector3();
  let takipYaw = 0;
  let takipUzaklik = m(9);
  /** @type {number | null} */ let pusula = null;
  /** @type {{t: number, basPoz: THREE.Vector3, basBakis: THREE.Vector3, hedefPoz?: THREE.Vector3, hedefBakis?: THREE.Vector3} | null} */
  let ucus = null;

  function takipHedefi(poz, bak) {
    const yonX = Math.sin(takipYaw), yonZ = -Math.cos(takipYaw);
    const yukseklik = takipUzaklik * 5 / 9;
    poz.set(oyuncuPoz.x - yonX * takipUzaklik, oyuncuPoz.y + yukseklik, oyuncuPoz.z - yonZ * takipUzaklik);
    bak.set(oyuncuPoz.x, oyuncuPoz.y + m(1.2), oyuncuPoz.z);
  }
  function kusHedefi(poz, bak) {
    let dx = kamera.position.x - oyuncuPoz.x;
    let dz = kamera.position.z - oyuncuPoz.z;
    const yatay = Math.hypot(dx, dz);
    if (yatay < 1e-3) { dx = 0; dz = 1; } else { dx /= yatay; dz /= yatay; }
    const uzaklik = m(250), egim = 50 * DERECE;
    bak.copy(oyuncuPoz);
    poz.set(oyuncuPoz.x + dx * uzaklik * Math.cos(egim), uzaklik * Math.sin(egim), oyuncuPoz.z + dz * uzaklik * Math.cos(egim));
  }

  if (mod === 'kus') {
    kontrol.target.copy(oyuncuPoz);
    kamera.position.set(oyuncuPoz.x, 0, oyuncuPoz.z + 1);
    kusHedefi(kamera.position, bakis);
    kontrol.update();
  } else {
    kontrol.enabled = false;
    takipHedefi(kamera.position, bakis);
    kamera.lookAt(bakis);
  }

  // --- Girdi: klavye, takip modunda sürükleme ve yakınlaştırma, hediye seçimi ---
  const tusKodlari = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']);
  function yaziAlani(e) {
    const t = /** @type {HTMLElement} */ (e.target);
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  }
  window.addEventListener('keydown', (e) => {
    if (!tusKodlari.has(e.code) || yaziAlani(e)) return;
    tuslar.add(e.code);
    if (e.code.startsWith('Arrow')) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => tuslar.delete(e.code));
  window.addEventListener('blur', () => tuslar.clear());

  const imlecler = new Map();
  let basilma = null;
  const tuval = renderer.domElement;
  tuval.addEventListener('pointerdown', (e) => {
    imlecler.set(e.pointerId, { x: e.clientX, y: e.clientY });
    basilma = imlecler.size === 1 ? { x: e.clientX, y: e.clientY, zaman: performance.now() } : null;
  });
  tuval.addEventListener('pointermove', (e) => {
    const onceki = imlecler.get(e.pointerId);
    if (!onceki) return;
    if (mod === 'takip' && !ucus) {
      if (imlecler.size === 1) {
        takipYaw -= (e.clientX - onceki.x) * 0.006;
      } else if (imlecler.size === 2) {
        const [a, b] = [...imlecler.values()];
        const once = Math.hypot(a.x - b.x, a.y - b.y);
        imlecler.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const [c, d] = [...imlecler.values()];
        const sonra = Math.hypot(c.x - d.x, c.y - d.y);
        if (once > 0 && sonra > 0) takipUzaklik = sinirla(takipUzaklik * once / sonra, m(4), m(20));
        return;
      }
    }
    imlecler.set(e.pointerId, { x: e.clientX, y: e.clientY });
  });
  const imlecBirak = (e) => {
    imlecler.delete(e.pointerId);
    if (e.type === 'pointerup' && basilma
      && Math.hypot(e.clientX - basilma.x, e.clientY - basilma.y) < 8
      && performance.now() - basilma.zaman < 600) {
      hediyeSec(e.clientX, e.clientY);
    }
    basilma = null;
  };
  tuval.addEventListener('pointerup', imlecBirak);
  tuval.addEventListener('pointercancel', imlecBirak);
  tuval.addEventListener('wheel', (e) => {
    if (mod !== 'takip') return;
    e.preventDefault();
    takipUzaklik = sinirla(takipUzaklik * (1 + e.deltaY * 0.001), m(4), m(20));
  }, { passive: false });

  const yansitma = new THREE.Vector3();
  /**
   * Yalnızca kutulara bakar: ekranda dokunulan noktaya en yakın kutu (en fazla 32 px).
   * Ekran uzaklıkları 4 px içinde eşitse kameraya yakın olan seçilir.
   */
  function hediyeSec(ekranX, ekranY) {
    const kutuSinir = tuval.getBoundingClientRect();
    const ESIT = 4;
    let enIyi = null, enIyiUzaklik = 32, enIyiDerinlik = Infinity;
    for (const h of hediyeler.values()) {
      if (h.cikiyor || h.olcek < 0.5) continue;
      yansitma.set(h.x, m(1.25), h.z).project(kamera);
      if (yansitma.z < -1 || yansitma.z > 1) continue;
      const px = kutuSinir.left + (yansitma.x + 1) / 2 * kutuSinir.width;
      const py = kutuSinir.top + (1 - yansitma.y) / 2 * kutuSinir.height;
      const d = Math.hypot(px - ekranX, py - ekranY);
      if (d > 32) continue;
      const derinlik = kamera.position.distanceToSquared(konumV.set(h.x, m(1.25), h.z));
      const esit = enIyi && Math.abs(d - enIyiUzaklik) <= ESIT;
      if (!enIyi || (esit ? derinlik < enIyiDerinlik : d < enIyiUzaklik)) {
        enIyi = h; enIyiUzaklik = d; enIyiDerinlik = derinlik;
      }
    }
    if (enIyi) yay('hediye-tiklandi', { id: enIyi.id });
  }

  // --- Boyut ---
  function boyutla() {
    const g = kapsayici.clientWidth || window.innerWidth;
    const y = kapsayici.clientHeight || window.innerHeight;
    renderer.setSize(g, y, false);
    kamera.aspect = g / y;
    kamera.updateProjectionMatrix();
  }
  new ResizeObserver(boyutla).observe(kapsayici);
  boyutla();

  // --- Kare döngüsü ---
  const saat = new THREE.Clock();
  const ileriYon = new THREE.Vector3();
  const hedefPoz = new THREE.Vector3();
  const hedefBakis = new THREE.Vector3();
  const matris = new THREE.Matrix4();
  const donus = new THREE.Quaternion();
  const yukari = new THREE.Vector3(0, 1, 0);
  const olcekV = new THREE.Vector3();
  const konumV = new THREE.Vector3();
  const sutunRengi = new THREE.Color();
  let sonHareketZamani = 0;
  const sonHareketPoz = oyuncuPoz.clone();
  let kareSayaci = 0, kareZamani = 0, dusukSaniye = 0, pikselDusuruldu = false;

  function oyuncuyuGuncelle(dt) {
    let hiz = 0;
    if (serbest) {
      const klavyeIleri = (tuslar.has('KeyW') || tuslar.has('ArrowUp') ? 1 : 0) - (tuslar.has('KeyS') || tuslar.has('ArrowDown') ? 1 : 0);
      const klavyeYan = (tuslar.has('KeyD') || tuslar.has('ArrowRight') ? 1 : 0) - (tuslar.has('KeyA') || tuslar.has('ArrowLeft') ? 1 : 0);
      let ileri = sinirla(klavyeIleri + joystick.ileri, -1, 1);
      let yan = sinirla(klavyeYan + joystick.yan, -1, 1);
      const buyukluk = Math.hypot(ileri, yan);
      if (buyukluk > 0.05) {
        if (buyukluk > 1) { ileri /= buyukluk; yan /= buyukluk; }
        kamera.getWorldDirection(ileriYon);
        ileriYon.y = 0;
        if (ileriYon.lengthSq() < 1e-6) ileriYon.set(0, 0, -1);
        ileriYon.normalize();
        const dx = ileriYon.x * ileri - ileriYon.z * yan;
        const dz = ileriYon.z * ileri + ileriYon.x * yan;
        hiz = (tuslar.has('ShiftLeft') || tuslar.has('ShiftRight') ? KOSMA : YURUME) * Math.min(1, Math.hypot(ileri, yan));
        const l = Math.hypot(dx, dz);
        oyuncuPoz.x += dx / l * hiz * dt;
        oyuncuPoz.z += dz / l * hiz * dt;
        oyuncuYon = Math.atan2(dx, -dz);
      }
    } else if (gpsHedef) {
      const dx = gpsHedef.x - oyuncuPoz.x, dz = gpsHedef.z - oyuncuPoz.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.05) {
        const adim = Math.min(d, GPS_HIZ * dt);
        oyuncuPoz.x += dx / d * adim;
        oyuncuPoz.z += dz / d * adim;
        hiz = adim / dt;
        oyuncuYon = Math.atan2(dx, -dz);
      }
    }
    oyuncuPoz.x = sinirla(oyuncuPoz.x, 0, genislik);
    oyuncuPoz.z = sinirla(oyuncuPoz.z, 0, derinlik);

    // Yürürken inip kalkma, dururken nefes alma.
    const zaman = saat.elapsedTime;
    let salinim;
    if (hiz > 0.1) {
      adimFazi += dt * Math.min(hiz / YURUME, 3) * 9;
      salinim = Math.abs(Math.sin(adimFazi)) * m(0.05);
    } else {
      salinim = 0;
    }
    avatar.position.set(oyuncuPoz.x, oyuncuPoz.y + salinim, oyuncuPoz.z);
    avatar.rotation.y = -oyuncuYon;
    avatar.scale.y = hiz > 0.1 ? 1 : 1 + Math.sin(zaman * 2.2) * 0.012;

    const simdi = performance.now();
    if (simdi - sonHareketZamani >= HAREKET_ARALIGI && oyuncuPoz.distanceToSquared(sonHareketPoz) > 0.01) {
      sonHareketZamani = simdi;
      sonHareketPoz.copy(oyuncuPoz);
      yay('oyuncu-hareket', dunyadanEnlemBoylama(oyuncuPoz.x, oyuncuPoz.z));
    }
  }

  function kamerayiGuncelle(dt) {
    if (mod === 'takip' && pusula !== null && !ucus) {
      takipYaw += aciFarki(takipYaw, pusula * DERECE) * Math.min(1, dt * 3);
    }
    if (ucus) {
      ucus.t += dt;
      const k = yumusat(Math.min(ucus.t / 1, 1));
      if (mod === 'takip') takipHedefi(hedefPoz, hedefBakis);
      else { hedefPoz.copy(ucus.hedefPoz); hedefBakis.copy(ucus.hedefBakis); }
      kamera.position.lerpVectors(ucus.basPoz, hedefPoz, k);
      bakis.lerpVectors(ucus.basBakis, hedefBakis, k);
      kamera.lookAt(bakis);
      if (k >= 1) {
        ucus = null;
        if (mod === 'kus') {
          kontrol.target.copy(bakis);
          kontrol.enabled = true;
          kontrol.update();
        }
      }
    } else if (mod === 'takip') {
      takipHedefi(hedefPoz, hedefBakis);
      const k = 1 - Math.exp(-dt * 8);
      kamera.position.lerp(hedefPoz, k);
      bakis.lerp(hedefBakis, k);
      kamera.lookAt(bakis);
    } else {
      kontrol.target.x = sinirla(kontrol.target.x, 0, genislik);
      kontrol.target.z = sinirla(kontrol.target.z, 0, derinlik);
      kontrol.target.y = 0;
      kontrol.update();
      bakis.copy(kontrol.target);
    }
  }

  function hediyeleriGuncelle(dt) {
    const zaman = saat.elapsedTime;
    let i = 0;
    for (const h of [...hediyeler.values()]) {
      const hedef = h.cikiyor ? 0 : vurgulu === h.id ? 1.35 : 1;
      h.olcek += (hedef - h.olcek) * Math.min(1, dt * 6);
      if (h.cikiyor && h.olcek < 0.02) { hediyeler.delete(h.id); continue; }
      const ziplama = h.alinabilir ? Math.abs(Math.sin(zaman * 4 + h.faz)) * m(0.3) : 0;
      donus.setFromAxisAngle(yukari, zaman * 0.8 + h.faz);
      olcekV.setScalar(Math.max(h.olcek, 1e-4));
      konumV.set(h.x, m(1) + ziplama, h.z);
      matris.compose(konumV, donus, olcekV);
      kutuMesh.setMatrixAt(i, matris);
      donus.identity();
      konumV.set(h.x, 0, h.z);
      matris.compose(konumV, donus, olcekV);
      sutunMesh.setMatrixAt(i, matris);
      sutunRengi.set(SUTUN).multiplyScalar(h.alinabilir ? 1 : 0.35);
      sutunMesh.setColorAt(i, sutunRengi);
      i++;
    }
    kutuMesh.count = sutunMesh.count = i;
    kutuMesh.instanceMatrix.needsUpdate = true;
    sutunMesh.instanceMatrix.needsUpdate = true;
    if (sutunMesh.instanceColor) sutunMesh.instanceColor.needsUpdate = true;
  }

  function kareHiziniIzle(dt) {
    kareSayaci++;
    kareZamani += dt;
    if (kareZamani < 1) return;
    const fps = kareSayaci / kareZamani;
    kareSayaci = 0;
    kareZamani = 0;
    dusukSaniye = fps < 24 ? dusukSaniye + 1 : 0;
    if (dusukSaniye >= 3 && !pikselDusuruldu && pikselOrani > 1) {
      pikselDusuruldu = true;
      pikselOrani = 1;
      renderer.setPixelRatio(1);
      boyutla();
    }
  }

  function kare() {
    if (durdu) return;
    try {
      const dt = Math.min(saat.getDelta(), 0.1);
      oyuncuyuGuncelle(dt);
      kamerayiGuncelle(dt);
      hediyeleriGuncelle(dt);
      renderer.render(sahne, kamera);
      kareHiziniIzle(dt);
      if (!hazirOldu) {
        hazirOldu = true;
        yay('hazir');
      }
    } catch (e) {
      durdu = true;
      renderer.setAnimationLoop(null);
      hataVer('Harita çizilirken bir sorun çıktı. Sayfayı yenileyip yeniden dene.', e);
    }
  }

  function dongu(acik) {
    if (acik && !durdu) {
      saat.getDelta();
      renderer.setAnimationLoop(kare);
    } else {
      renderer.setAnimationLoop(null);
    }
  }
  document.addEventListener('visibilitychange', () => dongu(!document.hidden));
  dongu(!document.hidden);

  // --- Dışa açılan nesne ---
  const harita = {
    /** @param {'kus' | 'takip'} yeni */
    kameraModu(yeni) {
      if (yeni !== 'kus' && yeni !== 'takip') return;
      if (yeni === mod) return;
      mod = yeni;
      kontrol.enabled = false;
      ucus = { t: 0, basPoz: kamera.position.clone(), basBakis: bakis.clone() };
      if (mod === 'takip') {
        takipYaw = pusula !== null ? pusula * DERECE : oyuncuYon;
      } else {
        ucus.hedefPoz = new THREE.Vector3();
        ucus.hedefBakis = new THREE.Vector3();
        kusHedefi(ucus.hedefPoz, ucus.hedefBakis);
      }
    },

    /** @param {{enlem: number, boylam: number, dogruluk?: number}} konum */
    gpsKonumu(konum) {
      if (!konum || !Number.isFinite(konum.enlem) || !Number.isFinite(konum.boylam)) return;
      const { x, z } = enlemBoylamdanDunyaya(konum.enlem, konum.boylam);
      gpsHedef = new THREE.Vector3(sinirla(x, 0, genislik), 0, sinirla(z, 0, derinlik));
      if (!serbest && gpsHedef.distanceTo(oyuncuPoz) > ISINLANMA) oyuncuPoz.copy(gpsHedef);
    },

    /** @param {{ileri: number, yan: number}} girdi -1..1 */
    hareketGirdisi(girdi) {
      joystick.ileri = sinirla(Number(girdi?.ileri) || 0, -1, 1);
      joystick.yan = sinirla(Number(girdi?.yan) || 0, -1, 1);
    },

    /** @param {boolean} acik */
    serbestGezinti(acik) {
      serbest = !!acik;
      if (!serbest && gpsHedef && gpsHedef.distanceTo(oyuncuPoz) > ISINLANMA) oyuncuPoz.copy(gpsHedef);
    },

    /** Yalnızca görüntü içindir; oyun kararları cihazın gerçek GPS'iyle verilir. */
    oyuncu() {
      const { enlem, boylam } = dunyadanEnlemBoylama(oyuncuPoz.x, oyuncuPoz.z);
      const yon = ((oyuncuYon / DERECE) % 360 + 360) % 360;
      return { enlem, boylam, yon };
    },

    /** @param {number | null} derece */
    pusulaYonu(derece) {
      pusula = Number.isFinite(derece) ? Number(derece) : null;
    },

    /** Tüm listeyi değiştirir. @param {Hediye[]} liste */
    hediyeleriGoster(liste) {
      const yeni = new Set();
      for (const h of Array.isArray(liste) ? liste : []) {
        if (h == null || h.id == null || !Number.isFinite(h.enlem) || !Number.isFinite(h.boylam)) {
          console.warn('Geçersiz hediye atlandı:', h);
          continue;
        }
        yeni.add(h.id);
        const { x, z } = enlemBoylamdanDunyaya(h.enlem, h.boylam);
        const var_ = hediyeler.get(h.id);
        if (var_) {
          Object.assign(var_, { x, z, alinabilir: !!h.alinabilir, cikiyor: false });
        } else {
          hediyeler.set(h.id, { id: h.id, x, z, alinabilir: !!h.alinabilir, olcek: 0, cikiyor: false, faz: Math.random() * Math.PI * 2 });
        }
      }
      for (const h of hediyeler.values()) if (!yeni.has(h.id)) h.cikiyor = true;
      kapasiteAyarla(hediyeler.size);
    },

    /** @param {any | null} id */
    hediyeVurgula(id) {
      vurgulu = id ?? null;
    },

    /**
     * @param {'hazir' | 'hediye-tiklandi' | 'oyuncu-hareket' | 'hata'} olay
     * @param {Function} cb
     */
    on(olay, cb) {
      if (typeof cb !== 'function') return harita;
      if (!dinleyiciler.has(olay)) dinleyiciler.set(olay, []);
      dinleyiciler.get(olay).push(cb);
      if (olay === 'hazir' && hazirOldu) queueMicrotask(() => cb());
      return harita;
    },
  };
  return harita;
}
