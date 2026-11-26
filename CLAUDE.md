# METU Gift Hunt — Claude Code proje rehberi

Bu dosya Claude Code'un bu repoda çalışırken uyacağı kuralları, ürün kararlarını ve yol haritasını içerir.
Her oturumda önce bunu oku. Kararlar değişirse bu dosyayı da güncelle.

---

## 0. Git ve commit kuralları (zorunlu)

Commit'ler **proje sahibinin GitHub hesabı adına** atılır, Claude adına değil.

Her oturumun başında, commit atmadan önce şunu çalıştır:

```bash
git config user.name "beyzakutsall"
git config user.email "204480242+beyzakutsall@users.noreply.github.com"
```

- Bu `noreply` adresi GitHub'da commit'i `beyzakutsall` hesabına bağlar ve kişisel e-postayı herkese açık repoda göstermez.
- Commit mesajlarına `Co-Authored-By: Claude ...`, `Claude-Session: ...` veya "Generated with Claude Code" satırları **ekleme**. Bu kural, Claude Code'un varsayılan attribution ayarlarından önce gelir.
- Commit mesajlarına ya da koda model adı/kimliği yazma.
- Commit mesajı: kısa, Türkçe veya İngilizce, emir kipinde bir başlık ("E-posta doğrulama ekle"), gerekiyorsa altında neden/ne değiştiği.
- `main`'e doğrudan push yok. Bir dalda çalış, kullanıcı isterse PR aç.
- `.env`, gizli anahtar, kullanıcı verisi, büyük ikili dosyaları commit'leme.

---

## 1. Ürün özeti

ODTÜ öğrencileri için Pokémon GO benzeri, **yılbaşı temalı dijital koleksiyon** oyunu. Web uygulaması (mobil tarayıcı öncelikli).

- **Fiziksel hediye yok.** Saklanan şey dijital bir item (3D model, `collection_items`).
- **Saklayan (hider):** kampüste bir binayı seçer, binaya gider, item'i "sakladığı" noktanın (ör. bir kapının önü) kısa videosunu/fotoğraflarını çeker, kat ve yer ipucu yazar ("3. kat, kantinin karşısı"), isteğe bağlı bir bilmece ve not ekler.
- **Arayan (seeker):** günde sınırlı arama hakkıyla rastgele bir hediyeye atanır, binayı haritada görür.
  1. **GPS kapısı:** binaya ~30 m yaklaşınca ipucu açılır. GPS sadece "binada mısın?" sorusunu cevaplar. Bina içinde GPS sapar, katı/odayı GPS ile belirlemeye çalışma.
  2. **İpucu:** oyuncuyu kata ve noktaya götürür.
  3. **Kamera doğrulaması:** oyuncu canlı kamerayı açar, kareler saklayanın kayıtlarıyla sunucuda eşleştirilir. Eşleşirse item açılır ve koleksiyona eklenir.
  4. **Yedek yol:** kamera puanı sınırda kalırsa bilmece cevabı veya moderatör onayı. Oyuncu yanlış retle takılı kalmamalı.
- Günlük limitler: `shared/gameRules.ts` (`search: 2`, `hide: 3`, gece yarısı Europe/Istanbul'da sıfırlanır).

### Kamera eşleme tasarımı (karar verildi)

- Yaklaşım **nesne tanıma değil, yer tanıma**: "aynı yer mi?" Eğitim verisi/ince ayar gerekmez.
- Yöntem: **yerel özellik eşleme + geometrik doğrulama** (OpenCV ORB/AKAZE + RANSAC; ileride SuperPoint+LightGlue). DINOv2/CLIP benzerliği tek başına kullanılmaz (koridorlar birbirine benzer), en fazla ön eleme.
- Saklarken: tarayıcı videodan 6–8 kare çıkarır (canvas), sadece kareleri yükler, sunucuda video işleme yok. İlk sürüm (MVP): **3 farklı açıdan 3 fotoğraf**, video sonra.
- Sahne kalite kontrolü: yeterli ayırt edici ayrıntı yoksa kayıt reddedilir ("Kapı numarasını / tabelayı da kadraja al"). Kat bilgisi zorunlu alan.
- Bulurken: sadece canlı kamera (galeri yok), ~1 kare/sn, **art arda 2–3 karede** eşik geçilmeli + GPS gevşek kontrolü (binanın civarı).
- En büyük risk: **farklı katlardaki birbirinin aynı kapılar.** Ayırt edici ayrıntı zorunluluğu + aynı binada benzer kayıt varsa daha yüksek eşik.
- **Güvenlik kuralı:** saklayanın kareleri/videosu **asla** arayana gönderilmez (ekrandaki kareye kamera tutarak hile yapılır). Arayana sadece metin ipucu ve bilmece gider.
- Gizlilik: kayıtlar yayına girmeden moderasyondan geçer, kadrajda insan olmamalı, ham kareler özellikler çıkarıldıktan sonra silinir.
- Mimari: mevcut Node API'nin yanında küçük bir **Python + OpenCV servisi** (`matcher/`). Node, kareleri `photo.ts` ile doğrulayıp/yeniden kodlayıp iç ağdan bu servise gönderir. Servis dışarıya açılmaz.
- Eşikler sahada kalibre edilir (aynı binanın iki katında aynı tip kapılarla test). Kalibre edilmemiş eşikle lansman yapma.

---

## 2. Teknoloji ve yapı

npm workspaces monorepo, Node ≥ 22.12.

```
frontend/   React 19 + TypeScript + Vite + Tailwind 4 + React Router 7 + three.js (3D item görüntüleme)
backend/    Express 5 + PostgreSQL (pg) + sharp + nodemailer, tsx ile çalışır
  src/        route (…Routes.ts) + servis (…Service.ts) çiftleri, app.ts hepsini bağlar
  migrations/ sıralı SQL dosyaları (001_…sql), açılışta otomatik uygulanır
  test/       node:test, her test geçici bir veritabanı açar
shared/     frontend ve backend'in ortak kuralları (doğrulama, oyun limitleri, yarıçaplar)
3d-harita/  kampüs 3D haritası (vanilla JS, Türkçe isimler), uygulama iframe ile minecraft.html'i kullanır
            backend/src/campus.ts haritanın kendi verisini ve kuralını (yerlesim.js) kullanır
            deneme.html: haritayı sahte GPS ile tek başına deneme sayfası (geliştirme aracı)
docs/       tasarım belgeleri ve arşiv
3d-coin-models/  item modeli adayları, koddan referans yok (bkz. Bölüm 5)
.github/workflows/pages.yml  mock modunu GitHub Pages'e yayınlar, sadece elle çalıştırılır
```

### Komutlar

```bash
npm install
npm run db:setup      # yerel PostgreSQL veritabanını oluşturur
npm run dev           # API (4000) + web (5173)
npm run dev:mock      # sunucusuz deneme modu (5174)
npm run typecheck
npm test              # backend testleri, çalışan bir PostgreSQL gerekir (TEST_DATABASE_ADMIN_URL)
npm run build
```

Bir değişikliği bitmiş saymadan önce `npm run typecheck` ve `npm test` çalıştır. Postgres yoksa bunu açıkça söyle.

Claude Code bulut ortamında Postgres kurulu ama kapalı gelir. Testleri şöyle çalıştır (TCP parola ister, soket istemez):

```bash
service postgresql start
su postgres -c "psql -c 'CREATE ROLE root SUPERUSER LOGIN'"   # sadece ilk seferde
TEST_DATABASE_ADMIN_URL='postgresql://root@localhost/postgres?host=/var/run/postgresql' npm test
```

Testler yavaş (~2 dk, scrypt yüzünden). Testler çalışırken yeni migration dosyası ekleme, yarıda kalan test dosyaları yeni şemayı alıp bozulur.

E-posta doğrulama: kayıt hesabı açar ama `requireUser` doğrulanmamış hesabı 403 `EMAIL_NOT_VERIFIED` ile durdurur. Sadece auth rotaları `requireSession` kullanır. Testlerde `createUser()` kayıt + doğrulama yapar, sadece kayıt için `register()` kullan. Mock modda kod `123456`.

---

## 3. Kod kuralları ve güvenlik değişmezleri

Mevcut kod bu kurallara uyuyor, bozma:

- **Tüm doğrulama sunucuda.** İstemciden gelen her alan `input.ts` / `shared/*Rules.ts` ile okunur. Ortak kurallar `shared/` içinde, frontend ve backend aynı fonksiyonu kullanır.
- **SQL her zaman parametreli** (`$1`). String birleştirmeyle sorgu yok.
- **Limit ve sayaçlar transaction + kilit altında** (`pg_advisory_xact_lock`, `FOR UPDATE`). Yarış durumu açma.
- **Hata = `AppError(status, CODE, kullanıcıya gösterilecek mesaj)`.** 500'lerde sadece stack loglanır, istek gövdesi loglanmaz.
- **Gizli bilgi JSON'a çıkmaz:** hunt görünümü (`huntService.ts` `view()`) hediyenin tam noktasını, cevapları, item'i, saklayanın kayıtlarını içermez. Yeni alan eklerken bunu koru.
- **Yüklenen görüntüler** `photo.ts` ile sihirli baytları kontrol edilip `sharp` ile yeniden kodlanır (EXIF/GPS silinir). Yeni yükleme türleri de bu yoldan geçer.
- Oturum: rastgele token, DB'de sadece SHA-256 hash'i, httpOnly + SameSite çerez, prod'da `__Host-` önekli ve `secure`. CSRF: `app.ts` origin + JSON zorunluluğu.
- Büyük gövdeli rotalar (fotoğraf) global JSON parser'dan **önce** bağlanır ve **önce kimlik doğrulanır**, sonra büyük gövde okunur.
- Rate limiter bellek içi (`rateLimit.ts`): **tek API süreci** varsayar. Birden fazla süreç çalıştırılacaksa önce paylaşılan depoya taşı.
- `LocationSimulator` sadece `import.meta.env.DEV` ile gösterilir. Prod derlemesine sahte konum aracı sızmamalı.
- Yeni DB değişikliği = yeni migration dosyası (`00N_aciklama.sql`). Uygulanmış migration'ı düzenleme.
- Kullanıcıya görünen metinler kısa ve nazik. Yorumlar "neden"i anlatır.
- Gizli anahtarlar sadece `backend/.env` (gitignore'da). Yeni değişken eklersen `.env.example` ve `config.ts` (prod zorunluluk kontrolü) güncelle.

---

## 4. Bilinen güvenlik açıkları (öncelik sırasıyla)

| # | Risk | Sorun | Yapılacak |
|---|---|---|---|
| S1 ✅ | Kritik | (Yapıldı: 6 haneli kod, `006_email_verification.sql`.) Kayıtta e-posta doğrulanmıyor: başkasının @metu.edu.tr adresi alınabilir, sınırsız yan hesap açılabilir (limitler ve "kendi hediyeni bulamazsın" kuralı delinir) | `users.email_verified_at`, 6 haneli kod / tek kullanımlık link (reset token altyapısını kullan), doğrulanmamış hesap hide/hunt uçlarını çağıramaz, IP başına kayıt limiti |
| S2 | Kritik | Konum tamamen istemci beyanı (`readFix`), DevTools/mock location ile sahtelenebilir | Kesin kanıt kamera eşlemesi. Ek olarak sunucuda makul olma kontrolleri: ardışık check-in'ler arası hız sınırı (> ~15 m/sn ret), varış ile çözüm arası asgari süre, şüpheli accuracy değerleri |
| S3 | Yüksek | Bulma kanıtı şu an "binaya yakınlık + bilmece + herhangi bir fotoğraf" | Kamera eşlemesi (Bölüm 1), bilmece yedek yol olur |
| S4 | Yüksek | Moderasyon yok: not/ipucu/bilmece serbest metin, kayıt görüntüleri ve bulma fotoğrafları başkasına gidiyor | `users.role`, `users.banned_at`, `reports` tablosu, "Şikâyet et" düğmesi, basit admin sayfası, metinde URL/telefon/e-posta reddi + küfür listesi, görüntüler yayından önce onay |
| S5 ✅ | Orta | (Yapıldı: e-posta başına 30/saat.) Giriş limiti sadece IP+e-posta çiftine bağlı, IP değiştirerek tek hesaba brute-force | E-posta başına ek limit (ör. 30/saat) |
| S6 | Orta | Bellek içi rate limiter yeniden başlatmada sıfırlanır | Lansmanda tek süreç. Sonra Postgres/Redis |
| S7 | Orta | Prod proxy ayarı yanlışsa `req.ip` herkes için aynı olur | Caddy/nginx arkasında `TRUST_PROXY=1` |
| S8 | Düşük | Origin başlığı olmayan POST'lar origin kontrolünden geçiyor | Prod'da Origin'siz POST'u reddet |
| S9 | Düşük | KVKK: hesap silme, aydınlatma metni, saklama süresi yok | Hesap silme ucu, görüntüler 30 gün sonra otomatik silinsin, `Terms.tsx` içine aydınlatma metni |
| S10 ✅ | Düşük | GitHub Pages'teki mock site gerçek uygulamayla karıştırılabilir | (Yapıldı: workflow sadece elle çalışıyor.) |

Repoda sızmış gizli anahtar bulunmadı. GitHub secret scanning açık tutulmalı.

---

## 5. Repo temizliği (yapılacak)

- `3d-coin-models/` (162 MB, koddan referans yok, `(1)` kopyaları var, Ferrari modelleri marka/lisans riski): kullanılacak yılbaşı temalı modelleri sıkıştırıp (meshopt, model başına ≤ 1–2 MB) `backend/assets/collection/` altına taşı, `CREDITS.md`'yi güncelle, gerisini sil. Ferrari modellerini kullanma.
- ✅ Kök `veri/` ve `modeller/` (birebir kopyalar) silindi.
- `3d-harita/deneme.html` geliştirme aracı olarak kalıyor (sahte GPS ile harita denemesi).
- ✅ İsim: her yerde "METU Gift Hunt", paketler `metu-gift-hunt`. Yerel veritabanı adı `campus_quest`, iç kilit anahtarları ve çerez adı (`cq_session`) mevcut kurulumlar bozulmasın diye bilerek eski.
- ✅ README yeniden yazıldı, eski başlangıç istemi `docs/ilk-istem.md`, harita tasarımı `docs/HARITA-MOTORU.md`. `docs/HARITA-MOTORU.md` ilk tasarım belgesi, içindeki `veri/` ve `harita/` yolları güncel kod yapısını yansıtmıyor; güncel yapı için `3d-harita/README.md`.
- Vercel yapılandırması repoda yok, eklemeye gerek yok.

---

## 6a. Ücretsiz yayın planı (karar verildi)

Bütçe yok, her şey ücretsiz katmanlarda çalışacak:

| İhtiyaç | Servis | Ücretsiz sınır / dikkat |
|---|---|---|
| Uygulama (API + frontend) | **Render** free web service | 15 dk boşta kalınca uyur, ilk istek ~1 dk sürer. Free planda **SMTP portları (25/465/587) kapalı**, e-posta HTTP API ile gönderilmeli. Adres: `https://<isim>.onrender.com` |
| PostgreSQL | **Neon** free | Proje başına 1 GB, 100 CU-saat/ay, boşta 5 dk sonra uyur. Bağlantı adresinde `sslmode=require` olmalı |
| E-posta | **Brevo** free, **HTTP API** (`https://api.brevo.com/v3/smtp/email`, `api-key` başlığı) | Günde 300 e-posta (lansman günü kayıt patlamasında sınır olabilir). İyi teslimat için kendi alan adıyla DKIM doğrulaması gerekir, gmail adresinden göndermek spam'e düşer |
| Alan adı | GitHub Student Developer Pack, **Namecheap .me** (1 yıl ücretsiz) | Öğrenci onayı birkaç gün sürebilir. O zamana kadar `onrender.com` alt alanı kullanılır |

Bu plan için gereken kod değişiklikleri:
- `server.ts`: `127.0.0.1` yerine `HOST` ortam değişkeni (Render'da `0.0.0.0`), port `PORT`'tan.
- Prod'da Express `frontend/dist` ve `3d-harita/` dosyalarını aynı origin'den sunsun (çerez ve origin kontrolü buna bağlı). SPA yönlendirmesi için bilinmeyen GET'lerde `index.html`. `/api` dışındaki sayfalarda helmet CSP'si haritanın kullandığı CDN'leri ve iframe'i engellemesin, bunu tarayıcıda test et.
- `mailer.ts`: `BREVO_API_KEY` varsa Brevo HTTP API ile gönder, yoksa SMTP, o da yoksa konsol. `config.ts` prod kontrolü: `SMTP_URL` veya `BREVO_API_KEY`'den biri zorunlu.
- Repoya `render.yaml` (Blueprint): build `npm ci && npm run build`, start `npm start -w backend`, `NODE_ENV=production`, `TRUST_PROXY=1`, `HOST=0.0.0.0`, sağlık kontrolü `/api/health`. Gizli değerler (`DATABASE_URL`, `BREVO_API_KEY`) `sync: false`, panelden girilir.
- `SETUP.md`'ye yayın adımları.

Yerelde prod denemesi: `APP_URL` `localhost` ise `http://` ve e-postasız (konsola yazan) çalışmaya izin verilir, başka her adreste https ve e-posta zorunlu. CSP `backend/src/frontend.ts` içinde: yeni bir CDN eklenirse oraya da eklenmeli.

Kurulumda yaşanan tuzaklar (sorun çıkarsa önce bunlara bak):
- `DATABASE_URL` tam olarak `postgresql://` ile başlamalı (Neon'da "Connection string" seç, psql komutu değil, tırnaksız). Geçersiz değerde pg sunucu adı olarak `base` kullanır: logda `getaddrinfo ENOTFOUND base`.
- `MAIL_FROM` adresi Brevo'da doğrulanan göndericiyle **harfi harfine** aynı olmalı: `METU Gift Hunt <metu.gift.hunt@gmail.com>` (noktalı). Gmail noktaları yok sayar ama Brevo saymaz, farklıysa Brevo "sender is not valid" diye reddeder.
- E-posta hatası kullanıcıya gösterilmez (bilerek). Kod gelmezse Brevo → Transactional → Logs ve Render logundaki `Email delivery failed` satırına bak.

Hesap açma (Render, Neon, Brevo, Student Pack) proje sahibinin işi. Claude Code gizli anahtarları asla repoya yazmaz, sadece hangi değişkenin nereye girileceğini söyler.

## 6. Lansman gereksinimleri (ODTÜ geneli)

- **Altyapı:** tek VPS (2 vCPU / 4 GB) veya Render/Railway, yönetilen PostgreSQL + günlük otomatik yedek, Caddy ile HTTPS, frontend `dist/` ve `/api` **aynı origin**. Prod ortam: `NODE_ENV=production`, `APP_URL=https://…`, `TRUST_PROXY=1`, `DATABASE_URL`, `SMTP_URL`, `MAIL_FROM`.
- **E-posta:** SPF/DKIM ayarlı SMTP (Brevo/Postmark/SES). Gerçek bir metu.edu.tr kutusuna teslimatı test et.
- **İzleme:** `/api/health` için uptime izleme, Sentry, log saklama.
- **Eşleme servisi:** iç ağda, CPU yeterli. İstek başına zaman aşımı ve kuyruk sınırı olsun.
- **Moderasyon:** en az 2 moderatör, şikâyetlere 24 saat içinde müdahale. Kurallar: kadrajda insan/yüz yok, kişisel veri yok, yasak alanlar (laboratuvar, ofis, yangın çıkışı) ipucu olarak kullanılamaz.
- **Performans:** 3D modeller küçük ve uzun önbellekli. Kampüs Wi-Fi NAT'ı yüzünden IP limitleri geniş kalsın. k6 ile ~200 eşzamanlı kullanıcı yük testi.
- **Cihaz testi:** iOS Safari + Android Chrome'da konum ve kamera izin akışları, zayıf sinyal, bina içi.

---

## 7. Yol haritası

Durumu güncel tut: `[ ]` yapılmadı, `[x]` bitti.

**Gün 1: Kimlik ve temizlik**
- [x] S1 e-posta doğrulama (migration, uçlar, `requireUser` kontrolü, testler, `/verify-email` sayfası)
- [x] İsim birliği (METU Gift Hunt), kopya klasörler, README/docs, Pages yayınını elle çalışır yap
- [x] Ferrari modelleri ve `(1)` kopyaları silindi (`3d-coin-models/` kalanlar item adayı)
- [x] Ücretsiz yayın kod değişiklikleri (Bölüm 6a): `HOST`, `frontend.ts` ile aynı origin + CSP, Brevo, `render.yaml`, SETUP.md
- [x] Render/Neon/Brevo hesap ve panel kurulumu: uygulama `metu-gift-hunt.onrender.com` adresinde yayında, kayıt + kod doğrulama prod'da çalıştı
- [ ] Prod sunucu, DB, SMTP, alan adı

**Gün 2: Dijital item ve kamera eşleme MVP**
- [ ] Saklama akışı: bina + kat + ipucu + 3 fotoğraf (sahne kalite kontrolüyle). Fiziksel not/hediye kavramını kaldır
- [ ] `matcher/` Python + OpenCV servisi: özellik çıkarma, eşleme, RANSAC puanı
- [ ] Bulma akışı: GPS kapısı (~30 m) → ipucu → canlı kamera → art arda kare eşleşmesi → item. Bilmece yedek yol
- [ ] S2 makul olma kontrolleri
- [x] S5 e-posta başına giriş limiti

**Gün 3: Moderasyon ve KVKK**
- [ ] S4 roller, ban, şikâyet, admin sayfası, metin filtreleri, görüntü onayı
- [ ] S9 hesap silme, saklama süresi, aydınlatma metni

**Gün 4: Saha kalibrasyonu ve işletim**
- [ ] Aynı binanın farklı katlarındaki benzer kapılarla eşik kalibrasyonu
- [ ] 10–20 kişilik kapalı beta (iOS/Android), Sentry, yedekleme, yük testi, model boyutları

**Gün 5: Lansman**
- [ ] Beta hataları, kod dondurma, yedekten geri dönüş provası
- [ ] Kademeli duyuru, moderatör nöbet çizelgesi

**Lansman sonrası:** video kayıt (fotoğraf yerine), paylaşılan rate limiter, saklayan güven puanı, push bildirimleri, SuperPoint+LightGlue ile daha güçlü eşleme.
