// Oyun katmanı: GPS'le yürüyen oyuncu işareti ve hediye kutuları.
// Koordinatlar blok cinsindendir (projeksiyon.js); enlem-boylam dönüşümü harita.js'te yapılır.
// Oyuncu ve kutular gerçek boyutlarından büyük çizilir: 1 blok 3 m olduğundan gerçek boyutta
// kuşbakışında görünmezlerdi.
import * as THREE from 'three';
import { hacimdenGeometri } from './agaclar.js';
import { BLOK_METRE } from './projeksiyon.js';

const VOKSEL = 1 / 8;                       // blok
const ISINLANMA_ESIGI = 50 / BLOK_METRE;    // 50 m'den büyük sıçramada yürümez, ışınlanır
const EN_YUKSEK_HIZ = 6 / BLOK_METRE;       // blok/sn; GPS'in gerisinde kalınca en fazla bu hızla yetişir
const DOKUNMA_YARICAPI = 32;                // px; parmakla vurulabilsin diye kutuya bu kadar yakın dokunuş yeter
const SUTUN_BOYU = 24;                      // blok; kutunun üstündeki ışık sütunu (≈72 m)

// ---------------- Modeller ----------------

// Bloklu figür, +z'ye bakar. 8 × 16 × 4 voksel = 1 × 2 × 0,5 blok
const OYUNCU_RENK = {
  1: [235, 190, 150], // ten
  2: [200, 30, 45],   // tişört
  3: [40, 55, 95],    // pantolon
  4: [60, 40, 25],    // saç
  5: [20, 20, 20],    // göz
  6: [30, 30, 30]     // ayakkabı
};
function oyuncuVokseli(x, y, z) {
  if (y <= 6) {                                             // bacaklar
    if (z < 1 || z > 2) return 0;
    if (!(x === 1 || x === 2 || x === 5 || x === 6)) return 0; // iki bacak, arası boş
    return y === 0 ? 6 : 3;
  }
  if (y <= 11) {                                            // gövde ve kollar
    if (z < 1 || z > 2) return 0;
    if (x >= 1 && x <= 6) return 2;
    if (x === 0 || x === 7) return y <= 7 ? 1 : 2;          // kolların ucu ten rengi
    return 0;
  }
  if (x < 2 || x > 5) return 0;                             // baş
  if (y === 15) return 4;
  if (z === 0) return 4;
  if (z === 3 && y === 13 && (x === 2 || x === 5)) return 5;
  return 1;
}

// Hediye kutusu: kırmızı kutu, beyaz kurdele ve fiyonk. 10 × 11 × 10 voksel ≈ 1,25 blok
const HEDIYE_RENK = { 1: [214, 40, 40], 2: [245, 245, 245] };
function hediyeVokseli(x, y, z) {
  const ortaX = x === 4 || x === 5, ortaZ = z === 4 || z === 5;
  if (y <= 8) return ortaX || ortaZ ? 2 : 1;
  if (y === 9) return (ortaZ && x >= 2 && x <= 7) ? 2 : 0;  // fiyonk tabanı
  if (y === 10) return (ortaZ && (x === 2 || x === 3 || x === 6 || x === 7)) ? 2 : 0; // fiyonk halkaları
  return 0;
}

function vokselGeometrisi([sx, sy, sz], al, renkler) {
  const sinirli = (x, y, z) => (x < 0 || y < 0 || z < 0 || x >= sx || y >= sy || z >= sz) ? 0 : al(x, y, z);
  const g = hacimdenGeometri(sx, sy, sz, sinirli, (k) => ({ rgb: renkler[k], isikMi: false }));
  g.translate(-sx / 2, 0, -sz / 2);
  g.scale(VOKSEL, VOKSEL, VOKSEL);
  return g;
}

// ---------------- Malzemeler ----------------

// Haritadaki nesnelerle aynı ışıksız gölgelendirme (yüz yönüne göre sabit ton), hafif sis
const vokselKose = /* glsl */ `
  in vec3 renk;
  out vec3 vRenk;
  out vec3 vNormal;
  out float vDerinlik;
  void main() {
  #ifdef USE_INSTANCING
    vec4 yerel = instanceMatrix * vec4(position, 1.0);
    vec3 n = mat3(instanceMatrix) * normal;
  #else
    vec4 yerel = vec4(position, 1.0);
    vec3 n = normal;
  #endif
    vNormal = mat3(modelMatrix) * n;
    vRenk = renk;
    vec4 gorus = viewMatrix * modelMatrix * yerel;
    vDerinlik = -gorus.z;
    gl_Position = projectionMatrix * gorus;
  }
`;
const vokselParca = /* glsl */ `
  precision highp float;
  uniform vec3 sisRengi;
  in vec3 vRenk;
  in vec3 vNormal;
  in float vDerinlik;
  out vec4 renk;
  void main() {
    vec3 n = normalize(vNormal);
    float golge = n.y > 0.5 ? 1.0 : (n.y < -0.5 ? 0.55 : (abs(n.x) > abs(n.z) ? 0.82 : 0.68));
    // Oyun öğeleri uzakta da seçilsin diye sis en fazla yarıya kadar
    float sis = 0.5 * smoothstep(350.0, 1100.0, vDerinlik);
    renk = vec4(mix(vRenk * golge, sisRengi, sis), 1.0);
  }
`;
function vokselMalzemesi(gokRengi) {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: vokselKose,
    fragmentShader: vokselParca,
    uniforms: { sisRengi: { value: new THREE.Color(gokRengi).convertLinearToSRGB() } }
  });
}

// Işık sütunu: yukarı doğru solan, toplamalı karışımlı yarı saydam silindir
function sutunMalzemesi() {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      in float parlaklik;
      out float vOran;
      out float vParlaklik;
      void main() {
        vOran = position.y / ${SUTUN_BOYU.toFixed(1)};
        vParlaklik = parlaklik;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      in float vOran;
      in float vParlaklik;
      out vec4 renk;
      void main() {
        float a = pow(1.0 - clamp(vOran, 0.0, 1.0), 1.3) * 0.75 * vParlaklik;
        renk = vec4(vec3(1.0, 0.78, 0.2), a);
      }
    `
  });
}

// Mavi nokta, beyaz kenar (konum işareti)
function noktaDokusu() {
  const t = document.createElement('canvas');
  t.width = t.height = 64;
  const c = t.getContext('2d');
  c.fillStyle = 'rgba(0, 0, 0, 0.25)';
  c.beginPath(); c.arc(32, 34, 27, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#ffffff';
  c.beginPath(); c.arc(32, 32, 27, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#2f7bff';
  c.beginPath(); c.arc(32, 32, 19, 0, Math.PI * 2); c.fill();
  const doku = new THREE.CanvasTexture(t);
  doku.colorSpace = THREE.SRGBColorSpace;
  return doku;
}

// ---------------- Katman ----------------

export function oyunKatmaniOlustur(gokRengi) {
  const grup = new THREE.Group();
  const voksel = vokselMalzemesi(gokRengi);

  // --- Oyuncu ---
  const oyuncuGrubu = new THREE.Group();
  oyuncuGrubu.visible = false;
  const govde = new THREE.Mesh(vokselGeometrisi([8, 16, 4], oyuncuVokseli, OYUNCU_RENK), voksel);
  oyuncuGrubu.add(govde);

  // Başın üstünde "buradasın" noktası: ekranda hep aynı boyutta, binaların arkasından da görünür
  const isaret = new THREE.Sprite(new THREE.SpriteMaterial({
    map: noktaDokusu(), depthTest: false, depthWrite: false, sizeAttenuation: false, transparent: true
  }));
  isaret.scale.setScalar(0.045); // ekran yüksekliğinin ≈ %5'i
  isaret.renderOrder = 10;
  oyuncuGrubu.add(isaret);
  grup.add(oyuncuGrubu);

  // GPS doğruluk halkası: yerde yarı saydam mavi daire ve kenar çizgisi
  const halka = new THREE.Group();
  halka.visible = false;
  const daire = new THREE.Mesh(
    new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x2f7bff, transparent: true, opacity: 0.16, depthWrite: false })
  );
  const kenar = new THREE.Mesh(
    new THREE.RingGeometry(0.96, 1, 48).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x2f7bff, transparent: true, opacity: 0.55, depthWrite: false })
  );
  halka.add(daire, kenar);
  halka.position.y = 0.06; // zeminle çakışıp titremesin
  grup.add(halka);

  const oyuncu = {
    gorunur: false,
    konum: new THREE.Vector3(),       // çizilen (yumuşatılmış) konum
    hedef: new THREE.Vector3(),       // son GPS konumu
    yon: 0,                           // radyan, 0 = +z (güney)
    halkaYaricap: 1,
    hedefHalkaYaricap: 1,
    yuruyor: false
  };

  function oyuncuKonumu(x, z, dogrulukBlok) {
    oyuncu.hedef.set(x, 0, z);
    oyuncu.hedefHalkaYaricap = Math.max(1.5, dogrulukBlok || 0);
    if (!oyuncu.gorunur || oyuncu.konum.distanceTo(oyuncu.hedef) > ISINLANMA_ESIGI) {
      oyuncu.konum.copy(oyuncu.hedef);
      oyuncu.halkaYaricap = oyuncu.hedefHalkaYaricap;
    }
    oyuncu.gorunur = true;
    oyuncuGrubu.visible = halka.visible = true;
  }

  function oyuncuyuGizle() {
    oyuncu.gorunur = false;
    oyuncuGrubu.visible = halka.visible = false;
  }

  // --- Hediyeler ---
  const kutuGeometrisi = vokselGeometrisi([10, 11, 10], hediyeVokseli, HEDIYE_RENK);
  const sutunGeometrisi = new THREE.CylinderGeometry(0.6, 0.6, SUTUN_BOYU, 12, 1, true).translate(0, SUTUN_BOYU / 2, 0);
  const sutunMalz = sutunMalzemesi();
  let kapasite = 0, kutular = null, sutunlar = null, parlaklik = null;

  function kapasiteAyarla(n) {
    if (n <= kapasite) return;
    const yeni = Math.max(32, kapasite * 2, n);
    if (sutunlar) sutunlar.geometry.dispose(); // parlaklık özniteliği taşıyan kopya
    for (const eski of [kutular, sutunlar]) if (eski) { grup.remove(eski); eski.dispose(); }
    kutular = new THREE.InstancedMesh(kutuGeometrisi, voksel, yeni);
    parlaklik = new THREE.InstancedBufferAttribute(new Float32Array(yeni), 1);
    const sg = sutunGeometrisi.clone();
    sg.setAttribute('parlaklik', parlaklik);
    sutunlar = new THREE.InstancedMesh(sg, sutunMalz, yeni);
    for (const m of [kutular, sutunlar]) {
      m.count = 0;
      m.frustumCulled = false; // kutular kampüse dağılmış; tek sınır küresi anlamsız
      grup.add(m);
    }
    sutunlar.renderOrder = 1;
    kapasite = yeni;
  }

  const hediyeler = new Map(); // id → { x, z, alinabilir, olcek, hedefOlcek, faz }

  function hediyeleriAyarla(liste) {
    const gelen = new Set();
    for (const h of liste) {
      gelen.add(h.id);
      const var_ = hediyeler.get(h.id);
      if (var_) {
        Object.assign(var_, { x: h.x, z: h.z, alinabilir: h.alinabilir, hedefOlcek: 1 });
      } else {
        hediyeler.set(h.id, { x: h.x, z: h.z, alinabilir: h.alinabilir, olcek: 0, hedefOlcek: 1, faz: Math.random() * Math.PI * 2 });
      }
    }
    // Listeden çıkanlar küçülerek kaybolur
    for (const [id, h] of hediyeler) if (!gelen.has(id)) h.hedefOlcek = 0;
    kapasiteAyarla(hediyeler.size);
  }

  // Ekrandaki (px, py) noktasına en yakın kutunun id'si; DOKUNMA_YARICAPI'ndan uzaksa null
  const izdusum = new THREE.Vector3();
  function hediyeBul(px, py, genislik, yukseklik, kamera) {
    let enIyi = null, enIyiMesafe = Infinity, enIyiDerinlik = Infinity;
    for (const [id, h] of hediyeler) {
      if (h.hedefOlcek === 0) continue;
      izdusum.set(h.x, h.y ?? 1, h.z).project(kamera);
      if (izdusum.z < -1 || izdusum.z > 1) continue; // kameranın arkasında
      const sx = (izdusum.x + 1) / 2 * genislik;
      const sy = (1 - izdusum.y) / 2 * yukseklik;
      const d = Math.hypot(sx - px, sy - py);
      if (d > DOKUNMA_YARICAPI) continue;
      // Ekranda 4 px içinde eşitse kameraya yakın olan seçilir
      if (d < enIyiMesafe - 4 || (Math.abs(d - enIyiMesafe) <= 4 && izdusum.z < enIyiDerinlik)) {
        enIyi = id; enIyiMesafe = d; enIyiDerinlik = izdusum.z;
      }
    }
    return enIyi;
  }

  // ---------------- Her kare ----------------
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const yukari = new THREE.Vector3(0, 1, 0);
  const fark = new THREE.Vector3();

  function guncelle(dt, t) {
    // Oyuncu: GPS konumuna doğru yumuşakça yürür
    if (oyuncu.gorunur) {
      fark.subVectors(oyuncu.hedef, oyuncu.konum);
      const mesafe = fark.length();
      oyuncu.yuruyor = mesafe > 0.05;
      if (oyuncu.yuruyor) {
        const adim = Math.min(mesafe, Math.min(EN_YUKSEK_HIZ, mesafe * 2.5) * dt);
        oyuncu.konum.addScaledVector(fark, adim / mesafe);
        const hedefYon = Math.atan2(fark.x, fark.z);
        let d = hedefYon - oyuncu.yon;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        oyuncu.yon += d * Math.min(1, dt * 8);
      }
      oyuncu.halkaYaricap += (oyuncu.hedefHalkaYaricap - oyuncu.halkaYaricap) * Math.min(1, dt * 3);

      oyuncuGrubu.position.copy(oyuncu.konum);
      govde.rotation.y = oyuncu.yon;
      govde.position.y = oyuncu.yuruyor ? Math.abs(Math.sin(t * 9)) * 0.12 : 0;
      govde.scale.y = oyuncu.yuruyor ? 1 : 1 + Math.sin(t * 2) * 0.015; // dururken nefes alır
      isaret.position.y = 2.8 + Math.sin(t * 3) * 0.15;
      halka.position.x = oyuncu.konum.x;
      halka.position.z = oyuncu.konum.z;
      halka.scale.setScalar(oyuncu.halkaYaricap);
    }

    // Hediyeler: döner, süzülür; alınabilir olan zıplar ve sütunu parlar
    if (!kapasite) return;
    let i = 0;
    for (const [id, h] of hediyeler) {
      h.olcek += (h.hedefOlcek - h.olcek) * Math.min(1, dt * 5);
      if (h.hedefOlcek === 0 && h.olcek < 0.02) { hediyeler.delete(id); continue; }
      let y = 0.5 + Math.sin(t * 2 + h.faz) * 0.12;
      if (h.alinabilir) y += Math.abs(Math.sin(t * 5 + h.faz)) * 0.6;
      h.y = y + 0.6;
      q.setFromAxisAngle(yukari, t * 0.8 + h.faz);
      m.compose(p.set(h.x, y, h.z), q, s.setScalar(h.olcek));
      kutular.setMatrixAt(i, m);
      q.identity();
      m.compose(p.set(h.x, 0, h.z), q, s.set(h.olcek, h.olcek, h.olcek));
      sutunlar.setMatrixAt(i, m);
      parlaklik.setX(i, h.alinabilir ? 1.0 : 0.5);
      i++;
    }
    kutular.count = sutunlar.count = i;
    kutular.instanceMatrix.needsUpdate = sutunlar.instanceMatrix.needsUpdate = true;
    parlaklik.needsUpdate = true;
  }

  return { grup, oyuncu, oyuncuKonumu, oyuncuyuGizle, hediyeleriAyarla, hediyeBul, guncelle };
}
