// minecraft.html: haritayı bütün sayfaya açar. Kurulumun kendisi harita.js'te.
import { haritaBaslat } from './harita.js';

const yukleniyor = document.getElementById('yukleniyor');

// Sayfada yükleme yazısı ve atıf zaten var (minecraft.html), harita kendininkini eklemesin
const harita = haritaBaslat(document.body, { yuklemeEkrani: false, atif: false });
harita.on('hazir', () => { yukleniyor.hidden = true; });
harita.on('hata', ({ mesaj }) => { yukleniyor.textContent = mesaj; });
