# Harita motoru: küçük kararlar

Ajanın HARITA-MOTORU.md'de yazmayan konularda aldığı kararlar; her satırda nedeni.

## Aşama 1

- Kütüphane koordinatı (39.89576, 32.78321) Beyza'dan geldi (OSM way/208600863'ün ağırlık merkezi); 2. aşamada `dizin.json` gelince oradan okunabilir.
- Test betiği `node --test "testler/*.test.mjs"` (Beyza'nın kararı). Glob desteği Node 21'de geldi; Node 20'de bu komut dosya bulamaz.
- `engines` `"node": ">=22"` (Beyza'nın kararı): test betiğindeki glob Node 20'de çalışmadığı için; 22 Vercel'in desteklediği bir LTS sürümü.
- Kök adres (`/`) `vercel.json`'da `/harita/deneme.html?hediye=ornek` adresine geçici yönlendirme (Beyza'nın kararı): telefonda önizleme bağlantısı doğrudan açılsın diye.
- Hediye seçimi raycast yerine ekran izdüşümüyle: dokunulan noktaya 32 px'ten yakın en yakın kutu. 50 cm'lik kutu telefonda parmakla vurulamayacak kadar küçük kalıyor; yine yalnızca kutulara bakılıyor. Ekran uzaklıkları 4 px içindeyse eşit sayılır ve kameraya yakın kutu seçilir (Beyza'nın kararı; tam eşitlik piksel ölçüsünde neredeyse hiç olmadığından 4 px pay).
- Takip kamerası karakterin yönüyle kendiliğinden dönmez; yalnızca sürüklemeyle ya da `pusulaYonu` ile döner. Hareket kameraya göre olduğundan otomatik dönüş sola-sağa yürürken kamerayı sürekli döndürürdü. Takibe geçerken kamera karakterin arkasına alınır.
- Deneme sayfasında `alinabilir`, karakterin konumuna değil son gelen (gerçek ya da sahte) GPS konumuna göre hesaplanır; konum yoksa başlangıç noktası (Kütüphane) kullanılır. Bölüm 5.2: oyun kuralları `harita.oyuncu()` ile işlemez.
- Deneme sayfası `?konum=` verilmemişse "Serbest" modda, verilmişse "GPS" modunda açılır; konum yokken karakter klavyeyle gezebilsin diye.
- Motor varsayılan olarak GPS modunda başlar (`serbestGezinti(false)`).
- `haritaBaslat` başarısız olursa (WebGL yok) Türkçe mesajlı bir `Error` fırlatır; o anda henüz `on('hata')` bağlanamadığı için mesaj bu yolla gelir. Deneme sayfası modülleri dinamik `import` ile yükler, böylece CDN'e ulaşılamazsa da Türkçe hata gösterir; 20 saniyede `hazir` gelmezse zaman aşımı mesajı verir.
- Taslak zeminde parça sınırları (64 m) ince çizgilerle çizildi: düz yeşilde hareket algısı olsun diye.
- Işık sütununun yarıçapı 1,2 m: kuşbakışında uzaktan görünsün diye.
- `araclar/derle.mjs`, `dunya-uret.mjs` henüz yoksa dünya üretimini atlar; `harita/`, `ortak/`, `modeller/` klasörlerini `dist/`'e kopyalar.
