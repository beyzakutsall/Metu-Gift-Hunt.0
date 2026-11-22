// minecraft.html: haritayı bütün sayfaya açar. Kurulumun kendisi harita.js'te.
import { haritaBaslat } from './harita.js';
import { apiKur } from './api.js';

const yukleniyor = document.getElementById('yukleniyor');

// Sayfada yükleme yazısı ve atıf zaten var (minecraft.html), harita kendininkini eklemesin
let api = null;
const harita = haritaBaslat(document.body, {
  yuklemeEkrani: false,
  atif: false,
  // Uygulamanın haritayla konuştuğu kapı (window.kampusHarita)
  eklenti: async (baglam) => {
    const ek = await apiKur(baglam, harita);
    api = ek.api;
    return ek;
  }
});
harita.on('hazir', () => {
  yukleniyor.hidden = true;
  window.kampusHarita = api;
  window.dispatchEvent(new Event('harita-hazir'));
});
harita.on('hata', ({ mesaj }) => {
  yukleniyor.textContent = mesaj;
  window.haritaHatasi = mesaj;
  window.dispatchEvent(new Event('harita-hata'));
});
