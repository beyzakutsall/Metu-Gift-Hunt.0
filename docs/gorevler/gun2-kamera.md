# Görev: Gün 2, kamera ile yer doğrulama (MVP)

> **Durum: yapıldı.** Kalan: sahada fotoğraflarla kalibrasyon ve Render'da hız ölçümü (CLAUDE.md yol haritası).

Önce `CLAUDE.md`'yi oku. Bu görev onun Bölüm 1 ("Kamera eşleme tasarımı") ve Bölüm 3'teki (güvenlik değişmezleri) kurallarına uyar.
Bu dosya ile CLAUDE.md çelişirse **mimari konusunda bu dosya geçerli** (aşağıdaki "Mimari kararı").

## Çalışma şekli (önemli)

- **Commit atma, push'lama.** Proje sahibi önce kendi fotoğraflarıyla deneyecek. Çalışmazsa değişiklikler `git restore` / `git clean` ile atılıp baştan yapılabilir.
  Proje sahibi "commit'le" derse CLAUDE.md Bölüm 0'daki kurallarla commit at.
- Bilgisayar Windows. Eski PowerShell (5.1) `&&` desteklemez, komutları ayrı ayrı çalıştır.
- Yerelde PostgreSQL yoksa bunu baştan söyle ve iki seçenek sun: (a) PostgreSQL'in Windows kurucusu,
  (b) Neon'da `dev` adlı bir **branch** açıp onun bağlantı adresini `backend/.env` içinde `DATABASE_URL` olarak kullanmak
  (prod veritabanına asla bağlanma). Eşleme test aracı (aşağıda 1. adım) veritabanı olmadan da çalışmalı.
- Telefon kamerası sadece HTTPS'te (veya bilgisayarın kendi `localhost`'unda) açılır. Telefondan gerçek deneme Render'a yayından sonra yapılır.
  Bu yüzden eşleme mantığı test aracıyla bilgisayarda denenebilir olmalı.
- İş bitince typecheck + testleri çalıştır, sonra proje sahibine neyin nasıl deneneceğini Türkçe ve adım adım anlat.

## Mimari kararı: Python servisi yok, eşleme Node içinde (OpenCV WASM)

CLAUDE.md ayrı bir Python + OpenCV servisi diyordu. Ücretsiz Render planında özel (iç ağ) servis yok, ikinci bir
açık servis de 750 saatlik ücretsiz kotayı bölüşür ve ayrıca güvenlik yüzeyi açar. Bu yüzden:

- Eşleme mevcut Node API'nin içinde, **OpenCV'nin WebAssembly derlemesiyle** yapılır (ör. `@techstark/opencv-js`;
  ORB, BFMatcher/knnMatch ve `findHomography` + RANSAC içeren, bakımı süren bir paket seç; sürümü sabitle).
- Görüntüler sunucuya gelmeden önce tarayıcıda en uzun kenarı **640 px** olacak şekilde küçültülür. Sunucu yine de `photo.ts` yolundan
  geçirir (sihirli bayt kontrolü, sharp ile yeniden kodlama, EXIF silme) ve 640 px'e indirir. Render free'de bellek 512 MB, buna dikkat et.
- OpenCV WASM bir kez yüklenir (uygulama açılışında, tembel), her istek `Mat` nesnelerini mutlaka `delete()` eder (bellek sızıntısı olmasın).
- Bu kararı CLAUDE.md Bölüm 1'deki "Mimari" maddesine ve yol haritasına işle.

## 1. Eşleme modülü ve test aracı (önce bu)

- `backend/src/matcher/`: saf fonksiyonlar, veritabanından bağımsız.
  - `extractFeatures(jpeg)`: gri tonlama, ORB (ör. 1000 nokta) → anahtar noktalar + tanımlayıcılar, veritabanında saklanabilir bir `Buffer`'a seri hale getirilir.
  - `sceneQuality(features)`: yeterli ayırt edici nokta yoksa (eşik sabit) reddedilir.
  - `matchScene(stored[], frameFeatures)`: kayıtlı her fotoğrafa karşı knnMatch + Lowe oran testi (0.75) + homografi RANSAC → **inlier sayısı**. En iyi skor döner.
- Eşikler tek yerde: `shared/huntRules.ts` içinde `MATCH_MIN_INLIERS`, `MATCH_STREAK` (art arda kaç kare, 2), `SCENE_MIN_KEYPOINTS`, `SCENE_PHOTOS` (3).
  Kalibrasyondan sonra sadece bu sayılar değişecek.
- **Test aracı:** `npm run match:test -w backend -- <saklayan-klasörü> <aynı-yer-klasörü> <başka-yer-klasörü>`
  - Veritabanı ve sunucu gerektirmez. Klasörlerdeki JPEG/PNG'leri okur, 640 px'e indirir.
  - Her fotoğraf için skor tablosu yazdırır: "aynı yer" fotoğraflarının skorları yüksek, "başka yer" fotoğraflarının skorları düşük olmalı.
  - En sonda iki grubu ayıran önerilen `MATCH_MIN_INLIERS` değerini ve ayrım iyi mi kötü mü olduğunu Türkçe tek cümleyle söyler.
  - Ayrıca "saklayan" fotoğraflarının sahne kalitesi geçti mi kaldı mı, onu da yazar.
- Birim testler: sharp ile üretilmiş dokulu sentetik bir görüntü; ondan kırpılmış/döndürülmüş/parlaklığı değiştirilmiş kopya **eşleşmeli**,
  başka rastgele bir doku **eşleşmemeli**, düz tek renk görüntü sahne kalitesinden **kalmalı**.

## 2. Saklama akışı

- Yeni migration (`007_...sql`):
  - `gifts.floor` (kısa metin, yeni hediyelerde zorunlu; eski kayıtlar NULL kalabilir).
  - `gift_scenes (gift_id, idx, features bytea, jpeg bytea, created_at)`: `jpeg` sadece moderasyon ve hata ayıklama için,
    **arayana asla gönderilmez**. Saklama süresi 30 gün (temizleme işine ekle, `deleteExpired` benzeri).
- Saklama formuna: **kat** alanı (zorunlu) ve **3 fotoğraf** (canlı kamera; telefonda `getUserMedia` ile `facingMode: 'environment'`).
  Her fotoğraf çekildiğinde önizleme ve "tekrar çek" seçeneği.
- Sunucu: 3 fotoğrafın her biri `photo.ts` yolundan geçer, `sceneQuality`'den kalan olursa hangi fotoğraf olduğunu söyleyen nazik bir hata:
  "Bu fotoğrafta yeterli ayrıntı yok. Kapı numarasını ya da bir tabelayı da kadraja al."
- Saklayan gerçekten orada olmalı: saklama isteği bir konum okuması da taşır ve seçilen binaya varış yarıçapında (`arrivalRadius`) olmalı.
- Büyük gövdeli rota kuralı (CLAUDE.md Bölüm 3): önce oturum kontrolü, sonra büyük gövde okunur.
- Mevcut not, ipucu ve bilmece alanları kalır. Bilmece artık yedek yol için kullanılıyor.
- Eski (fotoğrafsız) hediyeler aramaya **girmez** (aday sorgusuna "sahnesi olan" şartı ekle), testler buna göre güncellenir.

## 3. Bulma akışı

- Varıştan sonra (mevcut GPS kapısı, ipucu açılır) "Kamerayı aç" ekranı: canlı kamera, ~1 kare/sn, 640 px JPEG.
- `POST /api/hunts/:id/frame` `{ frame, fix }`:
  - Oturum + doğrulanmış kullanıcı, hunt sahibi ve canlı olmalı, varmış olmalı, konum gevşek kontrolü (`solveRadius`).
  - Kare eşleşirse `hunts.match_streak` +1, eşleşmezse 0. `MATCH_STREAK`'e ulaşınca hediye bulunur:
    mevcut `solve` içindeki ödül mantığını (koleksiyon item'i, gift found, find_photos, transaction + `FOR UPDATE`) ortak bir fonksiyona çıkar ve ikisi de onu kullansın.
  - Yanıt sadece kaba ilerleme: `{ matched: boolean, streak, needed }` ya da bulunduysa ödül. **Skor, inlier sayısı, sahne bilgisi dönmez**
    (eşik tahmin edilip hile yapılmasın). Saklayanın fotoğrafları hiçbir yanıtta yer almaz.
  - Hız sınırı: kullanıcı başına ör. 10 dakikada 300 kare. Kare deneme hakkı yemez.
- **Yedek yol (bilmece):** kamera ekranında en az ~30 saniye / 20 kare denendikten sonra "Kamera tanımadı mı? Bilmeceyi çöz" seçeneği açılır.
  Sunucu bunu da zorlar (`hunts.frames_tried` gibi bir sayaç). Mevcut 5 yanlış cevap sınırı aynen geçerli.
- Eski "fotoğraf yükle + cevap" çözüm akışı bu yeni akışla değişir. Bulunan karenin son eşleşen hali `find_photos`'a yazılır (saklayan görür).

## 4. S2: konum hilesine karşı makul olma kontrolleri

- Konumlar veritabanına **yazılmaz** (mevcut test `positions are never stored` bunu korur). Son konum hunt başına **bellekte** tutulur
  (tek süreç varsayımı, rate limiter gibi; süresi dolanlar temizlenir).
- Ardışık iki okuma arasında hız > 15 m/sn ise (GPS doğruluk payı düşülerek) okuma reddedilir: "Konumun çok hızlı değişti, birkaç saniye bekle."
- Varış ile bulma arasında en az 20 saniye.
- `accuracy` tam 0 veya gerçek dışı küçükse (< 1 m) şüpheli say ve reddet.
- Bu kontroller testlerle gelsin, ve hiçbiri deneme hakkı yemesin.

## 5. Bitiş

- `npm run typecheck`, `npm test` (veritabanı varsa), `npm run build`.
- Mock mod (`npm run dev:mock`) da yeni akışları göstersin (sahte eşleşme: 3 kareden sonra bulundu), arayüz Postgres olmadan denenebilsin.
- CLAUDE.md: mimari kararı, yeni sabitler, yeni tablo ve yol haritası işaretleri.
- Proje sahibine Türkçe özet: neler değişti, test aracıyla fotoğrafların nasıl deneneceği (klasör yapısı örneğiyle), sonuç kötüyse hangi sayının değiştirileceği.
