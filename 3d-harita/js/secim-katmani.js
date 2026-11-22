// Uygulamanın haritaya eklediği işaretler: seçilen yer, vurgulanan nokta, aranan bina, kampüs sınırı.
// Oyuncu ve hediye kutuları oyun-katmani.js'te.
import * as THREE from 'three';
import { IZGARA, enlemBoylamdanBloga } from './projeksiyon.js';

const SECILI = 0xffc928;
const VURGU = 0xd8262b;
const SINIR_RENGI = 0xffdc4a;
const EN_AZ_OLCEK = 1.2;
const OLCEK_UZAKLIGI = 55; // bu kadar blok uzaktan sonra işaret ekranda aynı boyda kalır

export function secimKatmaniOlustur(binaIzgarasi) {
  const grup = new THREE.Group();
  // Etiketler (renderOrder 10) saydam geçişte çizilir; işaretler de o geçişte, onlardan sonra
  const duz = (color) => new THREE.MeshBasicMaterial({ color, transparent: true });
  const kutuGeo = new THREE.BoxGeometry(2, 1.6, 2).translate(0, 0.8, 0);
  const kapakGeo = new THREE.BoxGeometry(2.3, 0.45, 2.3).translate(0, 1.8, 0);
  const seritX = new THREE.BoxGeometry(2.36, 2.1, 0.4).translate(0, 1.05, 0);
  const seritZ = new THREE.BoxGeometry(0.4, 2.1, 2.36).translate(0, 1.05, 0);
  const fiyonk = new THREE.BoxGeometry(1, 0.45, 0.6).translate(0, 2.3, 0);
  const kurdele = duz(0xffffff);

  function isaretOlustur(renk) {
    const govde = duz(renk);
    const kapak = duz(new THREE.Color(renk).offsetHSL(0, 0, 0.1));
    const isaret = new THREE.Group();
    for (const [geo, malzeme] of [[kutuGeo, govde], [kapakGeo, kapak], [seritX, kurdele], [seritZ, kurdele], [fiyonk, kurdele]]) {
      const parca = new THREE.Mesh(geo, malzeme);
      parca.renderOrder = 11;
      isaret.add(parca);
    }
    isaret.visible = false;
    grup.add(isaret);
    return isaret;
  }
  const secili = isaretOlustur(SECILI);
  const vurgu = isaretOlustur(VURGU);

  // Bina seçildiyse işaret çatıya konur, binanın içinde kaybolmasın
  function yerlestir(isaret, yer) {
    isaret.visible = !!yer;
    if (!yer) return;
    const { x, z } = enlemBoylamdanBloga(yer.enlem, yer.boylam);
    const y = binaIzgarasi.yukseklik[Math.floor(z) * binaIzgarasi.genislik + Math.floor(x)] || 0;
    isaret.position.set(x, y, z);
  }

  return {
    grup,
    isaretle: (yer) => yerlestir(secili, yer),
    vurgula: (yer) => yerlestir(vurgu, yer),
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
      for (const isaret of [secili, vurgu]) {
        if (!isaret.visible) continue;
        const olcek = Math.max(EN_AZ_OLCEK, kamera.position.distanceTo(isaret.position) / OLCEK_UZAKLIGI);
        isaret.scale.setScalar(olcek * (1.1 + 0.08 * Math.sin(saniye * 4)));
      }
    }
  };
}
