// Hediye kutuları, seçilen yer işareti ve kampüs sınırı. Modeller koddan üretilir.
import * as THREE from 'three';
import { IZGARA, enlemBoylamdanBloga } from './projeksiyon.js';

const KIRMIZI = 0xd8262b;
const SECILI = 0xffc928;
const KURDELE = 0xffffff;
const SUTUN = 0xffd36b;
const SINIR_RENGI = 0xffdc4a;
const EN_AZ_OLCEK = 1.2;
const OLCEK_UZAKLIGI = 55; // bu kadar blok uzaktan sonra kutu ekranda aynı boyda kalır

export function hediyeKatmaniOlustur() {
  const grup = new THREE.Group();
  // Etiketler (renderOrder 10) saydam geçişte çizilir; kutular da o geçişte, onlardan sonra çizilsin
  const duz = (renk) => new THREE.MeshBasicMaterial({ color: renk, transparent: true });
  // Renkler ışıksız olduğu için kapak biraz daha açık: kutu düz bir kare gibi görünmesin
  const kutuGeo = new THREE.BoxGeometry(2, 1.6, 2).translate(0, 0.8, 0);
  const kapakGeo = new THREE.BoxGeometry(2.3, 0.45, 2.3).translate(0, 1.8, 0);
  const seritX = new THREE.BoxGeometry(2.36, 2.1, 0.4).translate(0, 1.05, 0);
  const seritZ = new THREE.BoxGeometry(0.4, 2.1, 2.36).translate(0, 1.05, 0);
  const fiyonk = new THREE.BoxGeometry(1, 0.45, 0.6).translate(0, 2.3, 0);
  const sutunGeo = new THREE.CylinderGeometry(0.3, 0.3, 14, 6, 1, true).translate(0, 9, 0);

  const kurdele = duz(KURDELE);
  const sutun = new THREE.MeshBasicMaterial({ color: SUTUN, transparent: true, opacity: 0.45, depthWrite: false });
  const normal = { govde: duz(KIRMIZI), kapak: duz(0xee4a45) };
  const secili = { govde: duz(SECILI), kapak: duz(0xffe27a) };

  function kutuOlustur(renk) {
    const kutu = new THREE.Group();
    for (const [geo, malzeme] of [
      [kutuGeo, renk.govde], [kapakGeo, renk.kapak], [seritX, kurdele], [seritZ, kurdele], [fiyonk, kurdele], [sutunGeo, sutun]
    ]) {
      const parca = new THREE.Mesh(geo, malzeme);
      parca.renderOrder = malzeme === sutun ? 12 : 11;
      kutu.add(parca);
    }
    return kutu;
  }

  const kutular = new Map(); // id → Group
  const isaret = kutuOlustur(secili);
  isaret.visible = false;
  grup.add(isaret);
  let vurgulu = null;

  function yerlestir(nesne, { enlem, boylam }) {
    const { x, z } = enlemBoylamdanBloga(enlem, boylam);
    nesne.position.set(x, 0, z);
  }

  return {
    grup,
    goster(liste) {
      const kalan = new Set(liste.map(h => h.id));
      for (const [id, kutu] of kutular) {
        if (!kalan.has(id)) { grup.remove(kutu); kutular.delete(id); }
      }
      for (const h of liste) {
        if (!kutular.has(h.id)) {
          const kutu = kutuOlustur(normal);
          kutular.set(h.id, kutu);
          grup.add(kutu);
        }
        const kutu = kutular.get(h.id);
        kutu.userData.alinabilir = !!h.alinabilir;
        yerlestir(kutu, h);
      }
    },
    vurgula(id) { vurgulu = id; },
    isaretle(yer) {
      isaret.visible = !!yer;
      if (yer) yerlestir(isaret, yer);
    },
    sinirCiz(halka) {
      const koseler = [];
      const { genislik, derinlik } = IZGARA;
      const noktalar = halka.map(n => enlemBoylamdanBloga(n.lat, n.lon));
      for (let k = 0; k + 1 < noktalar.length; k++) {
        const a = noktalar[k], b = noktalar[k + 1];
        // Kalın çizgi: WebGL lineWidth desteklemediği için ince dörtgenler, haritanın dışına taşmadan
        const adim = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 4));
        for (let s = 0; s < adim; s++) {
          const px = a.x + (b.x - a.x) * s / adim, pz = a.z + (b.z - a.z) * s / adim;
          const qx = a.x + (b.x - a.x) * (s + 1) / adim, qz = a.z + (b.z - a.z) * (s + 1) / adim;
          if (Math.min(px, qx, pz, qz) < 0 || Math.max(px, qx) > genislik || Math.max(pz, qz) > derinlik) continue;
          const boy = Math.hypot(qx - px, qz - pz);
          if (!boy) continue;
          const nx = -(qz - pz) / boy * 0.7, nz = (qx - px) / boy * 0.7, y = 0.15;
          koseler.push(
            px + nx, y, pz + nz, qx + nx, y, qz + nz, qx - nx, y, qz - nz,
            px + nx, y, pz + nz, qx - nx, y, qz - nz, px - nx, y, pz - nz
          );
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(koseler, 3));
      grup.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: SINIR_RENGI, side: THREE.DoubleSide })));
    },
    guncelle(kamera, saniye) {
      const olcek = (nesne) => Math.max(EN_AZ_OLCEK, kamera.position.distanceTo(nesne.position) / OLCEK_UZAKLIGI);
      if (isaret.visible) {
        isaret.scale.setScalar(olcek(isaret) * (1.1 + 0.08 * Math.sin(saniye * 4)));
      }
      for (const [id, kutu] of kutular) {
        const one = id === vurgulu || kutu.userData.alinabilir;
        kutu.scale.setScalar(olcek(kutu) * (id === vurgulu ? 1.4 : 1));
        kutu.position.y = one ? Math.abs(Math.sin(saniye * 3)) * 1.2 : 0;
      }
    },
    // Ekranda dokunulan yere en yakın kutu: küçük kutu parmakla da seçilebilsin
    enYakin(kamera, ekranX, ekranY, genislik, yukseklik) {
      let enIyi = null, enIyiUzaklik = 22; // piksel
      const p = new THREE.Vector3();
      for (const [id, kutu] of kutular) {
        p.copy(kutu.position);
        p.y += kutu.scale.y; // kutunun ortası
        p.project(kamera);
        if (p.z > 1) continue;
        const uzaklik = Math.hypot((p.x + 1) / 2 * genislik - ekranX, (1 - p.y) / 2 * yukseklik - ekranY);
        if (uzaklik < enIyiUzaklik) { enIyiUzaklik = uzaklik; enIyi = id; }
      }
      return enIyi;
    }
  };
}
