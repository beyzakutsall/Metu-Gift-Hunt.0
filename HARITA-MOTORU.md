# ODTÜ Hediye Avı: Harita Motoru

Bu dosya harita motorunun tek ve tam tanımıdır. Kodlama ajanına yalnızca şu yazılır: "HARITA-MOTORU.md'yi oku ve uygula."

Repo: https://github.com/beyzakutsall/Metu-Gift-Hunt.0
Sahibi: Beyza

---

## 1. Ne yapıyoruz

ODTÜ kampüsü, telefonda açılan bir blok dünyası olarak çizilir. Ölçek 1 metre = 2 blok (bir blok 50 cm). Oyuncu karakteriyle kampüste yürür; karakter telefonun GPS konumunu izler ya da joystick ve klavyeyle serbestçe gezer. Haritada kapalı hediye kutuları durur; oyuncu gerçekten bir kutunun yanına yürüdüğünde kutu öne çıkar.

Motorun işi yalnızca dünyayı çizmek, kamerayı ve karakteri yönetmek, hediye kutularını göstermek. Giriş, sunucu, hediye kuralları ve ekranlar motorun dışındadır; onlar motorla yalnızca `harita/api.js` üzerinden konuşur (Bölüm 5).

Ana fikir: Kampüs derleme sırasında (bilgisayarda ve Vercel'de) 64 × 64 metrelik parça dosyalarına çevrilir. Telefon yalnızca çevresindeki parçaları indirir ve bir Web Worker'da geometriye çevirir. Uzağı tek bir kaba "genel bakış" katmanı kapatır. Böylece açılış hızlı, bellek sabit kalır.

---

## 2. Ajan için çalışma kuralları

1. Her aşamaya başlamadan önce o aşamanın planını kısaca (en fazla 15 satır: dosyalar, adımlar, nasıl denenecek) yaz ve onayımı bekle.
2. Yalnızca Bölüm 4'teki dosyalara dokun. Başka bir dosyada değişiklik gerekiyorsa dur ve söyle.
3. Bölüm 5'teki fonksiyon imzalarını ve `SINIR`, `BLOK_METRE` sabitlerini değiştirme. Değişmesi gerekiyorsa dur ve söyle.
4. Bu dosyada olmayan bir karar gerekirse en basit seçeneği yap ve `docs/harita-kararlar.md`'ye nedeniyle bir satır yaz.
5. **Git:** Commit ve push'u ben yaparım; sen yapma. `git status` ve `git diff` gibi okuma komutlarını çalıştırabilirsin. Başlamadan `git status` ile hangi branch'te olduğuna bak; `main`'deysen dur ve sor. Her çalışan adımın sonunda bana şunu ver:
   - commit edilecek dosyaların tam listesi, her biri ayrı satırda (tek tek `git add` için),
   - Türkçe, tek satırlık commit mesajı.
   Her commit tek bir iş yapar. Veri dosyaları (`veri/`) her zaman ayrı commit. `git add .`, merge, force push ve geçmişi yeniden yazma önerme.
6. İnternetten paket, model ya da veri indirmeden önce kaynağını ve lisansını söyle.
7. Her aşamanın sonunda o aşamanın "bitti" ölçütünü dene. Denemediğin her şeyi "denenmedi" diye açıkça yaz.
8. Sayfa bir hata aldığında asla "yükleniyor"da kalmaz: `harita.on('hata')` olayıyla Türkçe bir mesaj verir.
9. Her harici kütüphane sabit sürümle yüklenir; aynı three.js sürümü her yerde.
10. Yerel sunucu yalnızca repo klasöründen ve `127.0.0.1`'e bağlı çalışır: `python -m http.server 8000 --bind 127.0.0.1`. Telefon testi yerel ağdan değil, Vercel önizleme adresinden yapılır (konum yalnızca HTTPS'te çalışır).

---

## 3. Teknik temel

- **Derleme aracı yok.** Tarayıcı kodu düz ES modülleri; kütüphaneler sayfadaki import map'ten, sürümü sabitlenmiş CDN adresinden gelir. Tip denetimi yerine JSDoc açıklamaları.
- **three.js:** tek bir sabit sürüm, örneğin `0.180.0` (`https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js` ve `.../examples/jsm/` altından `OrbitControls`). Ajan kullanmadan önce adresin açıldığını kontrol eder.
- **Node 20 ve üstü** yalnızca veri betikleri, derleme adımı ve testler için. Tarayıcıya giden kodda npm paketi yok.
- **Testler:** `node --test testler/`. Saf fonksiyonlar (koordinat dönüşümü, zemin taraması, parça dosyası okuma/yazma, greedy meshing) test edilir.
- **Yayın:** Vercel. Derleme komutu `npm run derle`, çıktı klasörü `dist`. Her PR'a otomatik önizleme adresi gelir; telefon testleri orada yapılır.

---

## 4. Dosyalar

Repoda henüz yoksa motor şu dosyaları kurar. `package.json` ve `vercel.json` başka bir iş için zaten varsa, yalnızca gereken satırlar eklenir ve bana söylenir.

| Dosya | Ne |
| --- | --- |
| `ortak/koordinat.js` | enlem-boylam ↔ dünya dönüşümü; motorun dışındakiler de kullanır |
| `harita/api.js` | motorun tek kapısı (Bölüm 5) |
| `harita/parcalar.js` | parça yükleme, bellekten atma, sahneye ekleme |
| `harita/isci.js` | Web Worker: parça dizilerinden geometri üretir |
| `harita/parca-bicimi.js` | parça dosyası okuyucu ve yazıcı; Node betiği ve Worker ortak kullanır |
| `harita/malzeme.js` | ışıksız shader, doku dizisi, pencere düzeni |
| `harita/genel.js` | genel bakış katmanı |
| `harita/nesneler.js` | ağaç, lamba, bank vb. `InstancedMesh`'ler |
| `harita/tabelalar.js` | bina tabelaları ve uzaktan görünen ad etiketleri |
| `harita/hediyeler.js` | hediye kutuları ve ışık sütunları |
| `harita/kamera.js` | kuşbakışı ve takip kamerası |
| `harita/oyuncu.js` | karakter, hareket, çarpışma, GPS'e yürüme |
| `harita/vox.js` | kütüphanesiz `.vox` okuyucu |
| `harita/hata-ayikla.js` | `?hata-ayikla=1` paneli |
| `harita/deneme.html` | motoru tek başına açan deneme sayfası (Bölüm 11) |
| `araclar/veri-indir.mjs` | OSM verisini ve kampüs sınırını indirir |
| `araclar/dunya-uret.mjs` | parça dosyalarını, genel bakışı ve dizini üretir |
| `araclar/derle.mjs` | `dunya-uret.mjs`'i çalıştırır, statik dosyaları `dist/`'e kopyalar |
| `veri/osm.json`, `veri/kampus-siniri.json` | ham veri (commit'lenir) |
| `veri/bina-adlari.json` | kısa bina adları ve `onemli` bayrakları (hazır gelir, elle düzenlenir; Bölüm 8.6) |
| `veri/ham/osm-yedek.json` | Overpass'a ulaşılamazsa kullanılacak OSM kopyası (commit'lenmez; Bölüm 7.1) |
| `veri/arazi.bin` | yükselti ızgarası (isteğe bağlı, Bölüm 7.3) |
| `modeller/yilbasi-agaci.vox` | yılbaşı ağacı modeli (hazır gelir; Bölüm 5.3) |
| `modeller/katalog.json`, diğer `modeller/*.vox` | modeller (isteğe bağlı; yoksa kodla üretilmiş yer tutucular) |
| `testler/harita-*.test.mjs` | testler |
| `docs/harita-kararlar.md` | ajanın aldığı küçük kararlar |
| `CREDITS.md` | veri ve model kredileri |
| `.gitignore` | `node_modules/`, `dist/`, `veri/ham/`, `.env`, `.claude/` |

---

## 5. Sözleşmeler

Motorun dışındaki her şey (arayüz, konum modülü, sunucu istemcisi) motorla yalnızca bu imzalarla konuşur. İlk aşamada bu dosyalar sahte ama çalışan bir taslak olarak yazılır; gerçek kod gelince içi değişir, imza değişmez.

### 5.1 Koordinat sistemi (`ortak/koordinat.js`)

- Dünya birimi blok, 1 blok = 50 cm: `BLOK_METRE = 0.5`. Kodda uzunluklar metre olarak yazılır ve `BLOK_METRE`'ye bölünür; ölçek değişirse tek sabit değişir.
- Kampüs sınırı: `SINIR = { bati: 32.760, guney: 39.880, dogu: 32.800, kuzey: 39.903 }` (yaklaşık 3,4 × 2,5 km).
- Orijin sınırın kuzeybatı köşesi. x doğuya, z güneye, y yukarı artar (three.js'te kuzey = −z).
- Dönüşüm: `lat0 = (guney + kuzey) / 2`; `x = (boylam − bati) × 111320 × cos(lat0) / BLOK_METRE`; `z = (kuzey − enlem) × 110574 / BLOK_METRE`.
- Dışa açılanlar: `SINIR`, `BLOK_METRE`, `enlemBoylamdanDunyaya(enlem, boylam) → {x, z}`, `dunyadanEnlemBoylama(x, z) → {enlem, boylam}`, `mesafeMetre(a, b)` (haversine; a ve b `{enlem, boylam}`).
- Motorun dışı her zaman `{enlem, boylam}` konuşur. Blok koordinatını yalnızca motor bilir.
- Bu formülle kampüs yaklaşık 6833 × 5087 hücre; parçalar 128 × 128 hücre olduğundan 54 × 40 parça. Sayılar kodda sabit yazılmaz, `SINIR`'dan hesaplanır.

### 5.2 Harita API'si (`harita/api.js`)

```js
// const harita = await haritaBaslat(kapsayici, { baslangic: {enlem, boylam}, mod: 'kus' | 'takip' })
harita.kameraModu(mod)                        // 'kus' (kuşbakışı) | 'takip' (karakterin arkası)
harita.gpsKonumu({ enlem, boylam, dogruluk }) // dışarıdan gelen, yumuşatılmış konum; karakter oraya yürür
harita.hareketGirdisi({ ileri, yan })         // -1..1; ekrandaki joystick buraya bağlanır. Klavyeyi motor kendisi dinler
harita.serbestGezinti(acik)                   // true: karakter GPS'i bırakıp girdiyle gezer
harita.oyuncu()                               // → { enlem, boylam, yon } (yon: derece, 0 = kuzey). Yalnızca görüntü içindir
harita.pusulaYonu(derece | null)              // isteğe bağlı: takip kamerası bu yöne döner; null = serbest
harita.hediyeleriGoster([{ id, enlem, boylam, alinabilir }])
                                              // tüm listeyi değiştirir; alinabilir: true olan kutu parlar ve zıplar
harita.hediyeVurgula(id | null)
harita.on('hazir' | 'hediye-tiklandi' | 'oyuncu-hareket' | 'hata', cb)
// 'hediye-tiklandi' → { id }
// 'oyuncu-hareket'  → { enlem, boylam } (en fazla saniyede 2 kez)
// 'hata'            → { mesaj } (kullanıcıya gösterilebilir Türkçe cümle)
```

Önemli: oyunun kuralları (hediyeyi almak, bırakmak) cihazın gerçek GPS konumuyla işler, `harita.oyuncu()` ile değil. Serbest gezintide karakter bir kutunun yanına gidebilir ama bu hiçbir şey kazandırmaz. Motor bu yüzden hiçbir oyun kararı vermez; yalnızca gösterir.

### 5.3 Model kataloğu (`modeller/katalog.json`, isteğe bağlı)

```json
{ "avatar":        { "dosya": "avatar.vox",        "voksel_metre": 0.125,  "taban": "alt-orta" },
  "hediye-kutusu": { "dosya": "hediye-kutusu.vox", "voksel_metre": 0.0625, "taban": "alt-orta" },
  "yilbasi-agaci": { "dosya": "yilbasi-agaci.vox", "voksel_metre": 0.125,  "taban": "alt-orta", "isik_rengi": [255, 230, 80] } }
```

- Katalog ya da dosya yoksa motor kodla üretilmiş yer tutucu çizer: avatar için 1,75 m boyunda bloklu bir figür, hediye kutusu için 50 cm'lik kırmızı kutu ve beyaz kurdele, yılbaşı ağacı için koni.
- `.vox` okuyucu kütüphanesiz yazılır: `VOX ` başlığı, sürüm, ardından iç içe `MAIN`, `SIZE`, `XYZI`, `RGBA` parçaları. MagicaVoxel'de z yukarıdır; motor y-yukarıya çevirir. Vokseller greedy meshing ile birleştirilir.
- Model, `SIZE` tuvaline göre değil dolu voksellerin sınır kutusuna göre yerleştirilir: `taban: "alt-orta"` = dolu voksellerin en alt katının ortası orijine gelir. Tuvaldeki boşluk yok sayılır.
- **Hazır gelen `modeller/yilbasi-agaci.vox`:** 108 × 28 × 56'lık bir tuvalde, dolu kısmı yaklaşık 31 × 28 × 43 voksel; kahverengi gövde, iki tonlu yeşil yapraklar, tepede sarı yıldız (255, 255, 0), bir yanda kırmızı süsler. 0,125 m vokselle yaklaşık 5,4 m boyunda bir ağaç olur. Greedy meshing sonrası yaklaşık 630 üçgen (sınır 1.500). Dosyada şu an `isik_rengi` renginde voksel yok, yani yanıp sönen ışık yok; yıldızın rengi farklı olduğu için yıldız yanıp sönmez. Işık eklemek istenirse MagicaVoxel'de tam (255, 230, 80) rengiyle boyanır.
- Tekrarlanan modellerin üçgen sınırı: hediye kutusu 300, yılbaşı ağacı 1.500, avatar 2.000.

---

## 6. Görsel hedef ve referans

### 6.1 Hedef görüntü

Stilize, düşük poligonlu, blok hissi veren bir kampüs:

- Düz renkli, açık bej ve gri brüt beton hacimler; koyu yatay pencere şeritleri.
- 2-3 yeşil tonlu, küp kümesi tepeli ağaçlar; çimde piksel gürültülü doku (keskin, bulanık değil).
- Açık gri yollar ve yaya yolları, kırmızı koşu pisti, mavi su.
- Sıcak, açık bir gökyüzü; uzak kampüs sise karışır.
- Takip modunda karakterin arkasından, yere yakın bir bakış; kuşbakışında bütün kampüs okunur.
- Önemli binaların adı uzaktan, kameraya dönük yüzen etiketler olarak görünür; yakında tabelalar okunur.

### 6.2 Referans site: metu-campus-explorer.vercel.app

Bağımsız bir ODTÜ kampüs projesi (başka bir kişiye ait; kod MIT, kampüs verisi ODbL, kanopi verisi CC BY 4.0). Görsel dili hedefimize çok yakın, performansı ise telefon bütçemizin çok üstünde. Masaüstü Chrome'da (tuval 1942 × 1360, piksel oranı 1,5) tek ölçümde:

| Ölçü | Referans (masaüstü) | Bizim sınır (orta Android) |
| --- | --- | --- |
| Kare hızı | kuşbakışı 23, yürüme 29 fps | 30 fps |
| Çizim çağrısı / kare | 588-688 | 150'den az |
| Üçgen / kare | 2,8-3,4 milyon; kuşbakışında %80'i instanced çizimler (ağaçlar, figürler) | 1 milyondan az |
| Gölge | gerçek zamanlı gölge haritası, her karede ek çizim geçişi | yok |
| Malzeme | MeshStandardMaterial, ton eşleme | ışıksız shader, yüz yönüne göre sabit ton |
| JS belleği | yaklaşık 315 MB | 250 MB'tan az |
| Yükleme | tek 1,5 MB'lık paket, veri koda gömülü, dünya ana thread'de kuruluyor | parça dosyaları, Worker, greedy meshing |
| Piksel oranı | `min(devicePixelRatio, 1.5)` | aynı, düşük fps'te 1,0 |

**Alacaklarımız:** görsel dil (6.1); kampüs sınırı için OSM relation 6899696; arazi için Tilezen SRTM karesi (7.3); "gölge yok, piksel oranı sınırlı" kuralları (8.8).

**Almayacaklarımız:** kodu, modelleri, karakterleri, stadyum ve tribün modelini, ring otobüsünü, helikopteri, seslerini ve verisini. Yakın kopya da yapılmaz. ODTÜ sanal tur görüntüleri kullanılmaz (izin yok). Minecraft dokuları, karakterleri ve adı kullanılmaz.

---

## 7. Veri

### 7.1 OSM verisi (`araclar/veri-indir.mjs`)

`veri/osm.json` zaten varsa betik onu yeniden indirmez (`--yeniden` ile zorlanır). Yoksa Overpass API'den bu sorguyla alır:

```
[out:json][timeout:180][bbox:39.880,32.760,39.903,32.800];
(
  way["building"]; relation["building"];
  way["highway"]; way["landuse"]; relation["landuse"];
  way["natural"~"^(wood|scrub|water|grassland)$"]; relation["natural"~"^(wood|water)$"];
  way["leisure"~"^(park|pitch|garden|stadium|track|playground)$"];
  way["amenity"="parking"]; way["waterway"]; way["barrier"~"^(fence|wall)$"];
  node["amenity"~"^(bench|waste_basket|cafe|fast_food|restaurant|drinking_water|bicycle_parking)$"];
  node["highway"="street_lamp"]; node["tourism"="artwork"]; node["historic"];
  node["entrance"]; node["natural"="tree"]; node["leisure"="picnic_table"];
);
out body geom;
```

`out body geom;` şart: çok parçalı alanların (relation) dış ve iç halkalarının koordinatları ancak böyle gelir. `out tags geom;` yurt ve hastane gibi çok parçalı binaları eksik getirir.

Overpass'a ulaşılamazsa ve `veri/ham/osm-yedek.json` varsa betik onu `veri/osm.json` olarak kullanır ve bunu ekrana yazar. Bu yedek 20 Kasım 2026 tarihli ve daha dar bir sorgudan geliyor: `grassland`, `playground`, `barrier` ve `natural=tree` öğeleri yok. Yedekle çalışıldıysa bana söyle; bağlantı gelince asıl sorguyla yeniden indirilir.

### 7.2 Kampüs sınırı

Ayrı ve bbox'sız bir sorguyla (bbox geometriyi kırpmasın diye) alınır ve `veri/kampus-siniri.json`'a yazılır:

```
[out:json][timeout:60];
relation(6899696);
out body geom;
```

Betik sonunda sınırın enlem-boylam kutusunu ve `SINIR`'ın dışında kalan alanı (yaklaşık m²) yazdırır. Kaba hesaba göre kampüsün kuzey ucu `SINIR`'ın kuzey kenarını (39,903) aşıyor olabilir. Aşıyorsa dur ve söyle; `SINIR` değişikliği benim kararım.

### 7.3 Arazi (isteğe bağlı, en son)

- Kaynak: Tilezen/Mapzen arazi kareleri, AWS açık veri: `https://s3.amazonaws.com/elevation-tiles-prod/skadi/N39/N39E032.hgt.gz` (SRTM tabanlı).
- `.hgt` ham, big-endian `Int16` bir kare ızgaradır; kenar uzunluğu dosya boyutundan çıkar (3601 ya da 1201). Kütüphane gerekmez.
- Kampüse kırpılır, yaklaşık 30 m aralıklı bir ızgaraya indirilir, yumuşatılır, en alçak nokta 0 olacak şekilde kaydırılır ve `veri/arazi.bin`'e yazılır (birkaç KB). Ham indirme `veri/ham/`'a gider, commit'lenmez.
- Tilezen'in atıf metni birebir `CREDITS.md`'ye ve harita köşesindeki kredi satırına yazılır.
- 45 dakikada çalışmazsa arazi yok sayılır, harita düz kalır. Motorun geri kalanı araziye bağlı olmamalı.

---

## 8. Dünya üretimi (`araclar/dunya-uret.mjs`)

Derlemede çalışır. Girdi: `veri/osm.json`; varsa `veri/kampus-siniri.json` ve `veri/arazi.bin`. Çıktı: `dist/veri/<sürüm>/` altında parça dosyaları, `genel.bin` ve `dizin.json`. `<sürüm>`, girdi dosyalarının ve betiğin içeriğinden üretilen kısa bir özettir; veri değişince adres değişir ve önbellek kendiliğinden tazelenir.

Aşağıdaki uzunluklar metredir; blok sayısı = metre / `BLOK_METRE`.

### 8.1 Zemin taraması

Her alan, hücre merkezlerinden geçen yatay çizgilerle tek-çift kuralıyla doldurulur (delikli alanlar kendiliğinden doğru çıkar). Sıra: orman ve çayır → park, saha, pist → otopark → su → yollar. Sonra gelen üste yazılır.

Zemin türleri: `CIM, ORMAN, TOPRAK, ASFALT, TAS` (yaya yolu), `OTOPARK, SU, SAHA, PIST`.

### 8.2 Yollar

Çizgi olarak gelen yollar genişliğe göre kalınlaştırılarak taranır (metre): primary/secondary 9, tertiary 7, residential/service/unclassified 5, track 6 (toprak), footway/pedestrian/steps 3, path 2 (yüzeyi toprak ise `TOPRAK`), cycleway 2, waterway 3 (`SU`).

### 8.3 Arazi

Varsa her hücrenin yükseltisi ızgaradan iki doğrusal ara değerle alınır ve en yakın bloka yuvarlanır. Yoksa her yer 0. Binanın tabanı ayak izi içindeki en alçak noktadır; ayak izinin altı bu seviyeye düzlenir.

### 8.4 Binalar

- `building=roof` ve `building=construction` atlanır.
- Kat sayısı sırasıyla: `height` (metre / 3), `building:levels`, yoksa türe göre tahmin: apartments 5, residential 4, dormitory 4, hospital 4, office 4, university 3, school 3, public 3, commercial 2, detached/house 2, greenhouse 1, diğer 2.
- Her kat 3 m = 6 blok; en fazla 30 kat (180 blok, yükseklik `Uint8`'e sığar).
- Malzeme: ev ve müstakil tuğla; apartman ve yurt sıva; ofis ve ticari cam; geri kalanı (ODTÜ binalarının çoğu) brüt beton.
- Bina stili: pencere düzeni (`serit`, `kare`, `yok`) ve renk tonu. Beton için varsayılan `serit`. Ton, bina kimliğinden sabit tohumla küçük bir sapma alır; böylece yan yana binalar birebir aynı görünmez.

### 8.5 Nesneler

- OSM'den: bank, çöp kutusu, heykel, giriş, piknik masası, ağaç, bisiklet parkı.
- Lambalar (OSM'de kampüste yok): yaya yolları boyunca 25 m'de bir, yolun 2 m yanına, iki yana sırayla.
- Orman: 12 m'lik ızgarada rastgele kaydırılmış sade çamlar, yaklaşık %60 doluluk.
- Yılbaşı ağaçları: yaya yollarının kenarına, birbirinden en az 40 m uzakta, yaklaşık 150 tane.
- Hiçbir nesne bina, yol ya da başka bir nesnenin içine girmez.
- Bütün rastgelelik sabit tohumlu; aynı girdi her derlemede aynı dünyayı üretir.

### 8.6 Adı olan yerler (`dizin.json`)

Adı olan her bina için: ad, ağırlık merkezi `{enlem, boylam}`, varsa giriş noktası, alan (m²) ve `onemli` bayrağı. Ayrıca sürüm, parça sayısı ve kredi satırı.

Ad ve `onemli` şu sırayla belirlenir:

1. `veri/bina-adlari.json`: `binalar` nesnesi, anahtar OSM öğesi (`"way/208600863"`, `"relation/6296521"`), değer `{ "ad": "Kütüphane", "onemli": true }`. Bu dosya kısa adların ve uzaktan görünecek binaların asıl kaynağıdır; OSM'de adı olmayan bir binaya da ad verebilir.
2. Dosyada yoksa OSM'deki `short_name`, o da yoksa `name` (28 karakterden uzunsa kelime sınırından kısaltılır).
3. Dosyada `onemli` verilmemiş binalarda `onemli`, alanı en büyük 15 binaya verilir.

Dosyadaki bir anahtar OSM verisinde bulunamazsa derleme durmaz, uyarı yazar.

### 8.7 Kampüs maskesi (isteğe bağlı)

`veri/kampus-siniri.json` varsa sınır dışındaki hücrelere `stil` alanında bir bit konur. Çizimde orada bina ve ağaç atlanır, zemin bir ton koyu çizilir; kampüs çevresinden ayrılır.

### 8.8 Dosya biçimleri

**Parça dosyası** `parca-<i>-<j>.bin` (little-endian, gzip ile sıkıştırılmış):

| Alan | Tür | Not |
| --- | --- | --- |
| başlık | 4 bayt | `MGHP` |
| sürüm, i, j | `Uint16` × 3 | |
| zemin | `Uint8[130 × 130]` | 128 hücre + her yanda 1 komşu hücre (sınırda yarık olmasın) |
| arazi | `Int16[130 × 130]` | yüzey yüksekliği, blok |
| bina | `Uint8[130 × 130]` | tabandan yükseklik, blok, 0 = yok |
| stil | `Uint8[130 × 130]` | malzeme + bina stili + maske biti |
| nesne sayısı | `Uint32` | |
| nesneler | her biri `tur Uint8, x Float32, z Float32, yon Uint8` | x, z parça içinde blok |

**`genel.bin`:** kampüsün 8 × 8 metrelik kaba hali (yaklaşık 428 × 318 hücre), aynı alanlar, nesnesiz.

Okuyucu ve yazıcı aynı modülde (`harita/parca-bicimi.js`) durur; hem Node betiği hem Worker onu kullanır. Yaz-oku-karşılaştır testi zorunlu.

---

## 9. Çizim (tarayıcı)

### 9.1 Parça yöneticisi (`harita/parcalar.js`)

- Kameranın baktığı noktaya kuşbakışında 320 m'den, takip modunda 200 m'den yakın parçalar yüklenir; 450 m (takipte 300 m) ötesi bellekten atılır ve geometrisi `dispose` edilir.
- Önce en yakın parça. Aynı anda en fazla 4 indirme.
- Parçalar `fetch` ile gelir, `DecompressionStream('gzip')` ile açılır.
- Geometri `harita/isci.js` Worker'ında üretilir; diziler kopyalanmadan (transferable) aktarılır.
- Bir karede en fazla 2 parça sahneye eklenir (takılma olmasın).

### 9.2 Yüzeyler (`harita/isci.js`)

- Üst yüzler, aynı yükseklik ve türdeki komşularla dikdörtgenlere birleştirilir (greedy meshing).
- Yan yüzler yalnızca komşu hücre daha alçaksa çizilir. Aynı kural arazi basamakları ve binalar için.
- Her parça tek bir `BufferGeometry` (zemin + binalar), her köşede konum, normal yönü indeksi, doku katmanı ve stil.

### 9.3 Malzeme (`harita/malzeme.js`)

- Tek bir ışıksız `ShaderMaterial`. Yüz yönüne göre sabit ton: üst 1,0, doğu-batı 0,82, kuzey-güney 0,68, alt 0,55. Zemine yakın duvarlar hafif koyu (basit bir ortam kararması).
- Gölge haritası yok; hiçbir mesh'te `castShadow` ya da `receiveShadow` açılmaz.
- Dokular: her yüzey türü için 16 × 16 piksellik doku, canvas ile sabit tohumlu üretilir, tek bir `DataArrayTexture`'a konur. Yakında `NearestFilter` (keskin piksel), uzakta mipmap.
- Pencereler: duvar shader'ında katta 6 sıra blok; alttaki 2 sıra döşeme, üstteki 4 sıra pencere; 6 sütunluk aralıkta 4 sütun pencere, 2 sütun ayak. Pencere dokusunda 1 piksellik açık çerçeve. Stil `serit` ise pencereler kat boyunca birleşir, `kare` ise ayrı durur, `yok` ise çizilmez.
- Sis: doğrusal, 600 ile 2600 m arası, gökyüzü rengine karışır. Gökyüzü sıcak, açık bir ton.

### 9.4 Genel bakış katmanı (`harita/genel.js`)

`genel.bin`'den tek bir kaba mesh. Shader'ı, kameranın baktığı noktaya yükleme yarıçapından yakın pikselleri atar (`discard`); yakını parçalar, uzağı bu katman çizer ve ikisi üst üste binmez. Ormanlar bu katmanda koyu yeşil yükseltilmiş bloklar olarak görünür; uzakta tek tek ağaç çizilmez.

### 9.5 Nesneler (`harita/nesneler.js`)

Her parçada her nesne türü için bir `InstancedMesh`. Sade çam 50 üçgen (küp kümesi tepe + gövde). Lamba, bank, çöp kutusu kodla üretilmiş basit kutular. Yılbaşı ağacı `modeller/yilbasi-agaci.vox`'tan (Bölüm 5.3); dosya yoksa koni. Katalogdaki `isik_rengi` voksellerinin yanıp sönmesi isteğe bağlı.

### 9.6 Tabelalar ve ad etiketleri (`harita/tabelalar.js`)

- Adı olan her binanın girişine, giriş yoksa en yakın yaya yoluna bakan cephesine bir tabela: direk (1,6 m) + ahşap pano (yaklaşık 2,4 × 1 m). Yazı canvas'a kalın ve keskin (yumuşatmasız) çizilir; 16 karakterden uzunsa iki satıra bölünür. Tabelalar parçayla birlikte yüklenir ve atılır.
- Kamera 140 m'den uzaktayken yalnızca `onemli` binaların adı, kameraya dönük yüzen bir etiket olarak görünür; yakınlaştıkça etiket solar, tabela okunur olur.
- Harita köşesinde kredi satırı: "© OpenStreetMap katkıcıları" (ve arazi kullanılıyorsa Tilezen atfı).

### 9.7 Hediye kutuları (`harita/hediyeler.js`)

- Katalogdaki `hediye-kutusu` (yoksa kırmızı kutu, beyaz kurdele), yerden 1 m yukarıda, yavaşça döner.
- Üstünde uzaktan görünen yarı saydam bir ışık sütunu (yaklaşık 20 m).
- Bütün kutular aynı görünür; içerik motorun bilgisi dışındadır.
- `alinabilir: true` olanın sütunu daha parlak, kutu hafifçe zıplar.
- Listeden çıkan kutu küçülerek kaybolur; yeni gelen büyüyerek belirir.
- Bütün kutular tek bir `InstancedMesh`; tıklama için raycast yalnızca kutulara yapılır. Tıklanınca `hediye-tiklandi`.

### 9.8 Renderer

- `antialias: false` (blok kenarları zaten keskin; telefonda pahalı).
- `setPixelRatio(Math.min(devicePixelRatio, 1.5))`. Kare hızı 3 saniye boyunca 24'ün altında kalırsa piksel oranı 1,0'a iner ve bir daha yükselmez.
- `powerPreference: 'high-performance'`.
- Sekme gizlenince (`visibilitychange`) çizim durur.

---

## 10. Kamera ve karakter

### 10.1 Kamera (`harita/kamera.js`)

- **Kuşbakışı (`kus`):** OrbitControls. Hedef kampüs sınırı dışına çıkamaz; eğim 20°-75°, uzaklık 40-1800 m.
- **Takip (`takip`):** Kamera karakterin 9 m arkasında, 5 m yukarısında, yumuşak geçişle izler. Sürükleyince karakterin etrafında döner; iki parmakla ya da tekerlekle 4-20 m arası yakınlaşır. `pusulaYonu` verilirse kamera o yöne döner.
- Modlar arası geçiş yaklaşık 1 saniyelik yumuşak bir uçuşla.

### 10.2 Karakter (`harita/oyuncu.js`)

- **Hareket:** Yürüme 1,4 m/s, Shift ile koşma 4 m/s. WASD ve ok tuşları; joystick `hareketGirdisi` ile gelir. Yön kameraya göredir, karakter gittiği yöne döner.
- **Zemin ve çarpışma:** Karakter zeminin üstünde durur, en fazla 1 blok (50 cm) basamak çıkar. Bina hücresine giremez; çarparsa duvar boyunca kayar. Çarpışma parça dizileri üzerinden yapılır, fizik motoru yok.
- **GPS modu:** Karakter `gpsKonumu` ile gelen noktaya en fazla 6 m/s ile yürür; 50 m'den büyük sıçramada ışınlanır. `serbestGezinti(true)` iken GPS dinlenmez.
- **Avatar:** Katalogdaki `avatar`; yoksa 1,75 m (3,5 blok) boyunda bloklu bir figür. Yürürken hafif inip kalkma, dururken nefes alma hareketi.
- `oyuncu-hareket` olayı en fazla saniyede 2 kez çıkar.

---

## 11. Deneme sayfası (`harita/deneme.html`)

Motoru başka hiçbir modül olmadan açar:

- Tam ekran harita, sağ üstte "Kuşbakışı / Takip" ve "GPS / Serbest" düğmeleri, takip modunda sol altta basit bir ekran joystick'i.
- `?hediye=ornek` ile Kütüphane çevresine 5 örnek hediye kutusu koyar; en yakını 30 m içindeyse `alinabilir: true` yapar.
- `?konum=gercek` ile `navigator.geolocation.watchPosition` (yüksek doğruluk) doğrudan `harita.gpsKonumu`'na bağlanır; doğruluğu 100 m'den kötü okumalar atılır.
- `?konum=sahte` ile Kütüphane önünden başlayıp yavaşça yürüyen sahte bir konum.
- `?hata-ayikla=1` ile panel açılır.
- `hediye-tiklandi` olayında ekranda kısa bir yazı ("Hediye 3 tıklandı").

---

## 12. Performans bütçesi

| Ölçü | Sınır |
| --- | --- |
| İlk görüntü (4G, orta Android) | 5 sn'den kısa |
| İlk açılışta indirilen veri | 5 MB'tan az (sıkıştırılmış) |
| Kare hızı (orta Android, takip modu) | 30 fps |
| Çizim çağrısı | 150'den az |
| Ekrandaki üçgen | 1 milyondan az |
| Tekrarlanan bir modelin üçgeni | 300'den az (yılbaşı ağacı 1.500) |
| JS belleği | 250 MB'tan az |

`?hata-ayikla=1` paneli: fps, `renderer.info` çizim çağrısı ve üçgen, yüklü parça sayısı, bekleyen indirme, piksel oranı, JS belleği (varsa). Her PR açıklamasına Devrim Stadyumu kuşbakışından bir ekran görüntüsü ve bu sayılar eklenir.

---

## 13. Aşamalar

Sıra önemli: her aşamanın sonunda çalışan bir harita vardır. Bir aşama bitmeden sonrakine geçilmez.

1. **Sözleşme taslakları.** `ortak/koordinat.js` (gerçek, testli), `harita/api.js` taslağı: yeşil bir düzlem, üstünde kutular, kuşbakışı kamera, bütün olaylar çalışıyor. `harita/deneme.html`, `package.json`, `vercel.json`, `.gitignore`.
   *Bitti:* deneme sayfası Vercel önizlemesinde telefonda açılıyor; `?hediye=ornek` ile kutular görünüyor, tıklama olayı geliyor; koordinat testleri geçiyor.
2. **Veri ve dünya üretimi.** `veri-indir.mjs` (OSM + kampüs sınırı, `SINIR` karşılaştırması), `parca-bicimi.js`, `dunya-uret.mjs` (arazisiz): zemin, yollar, binalar, nesneler, dizin, genel bakış.
   *Bitti:* parça sayısı 54 × 40; Kütüphane'nin ağırlık merkezindeki hücre bina; yaz-oku testi geçiyor; `docs/harita-kararlar.md`'de sınır karşılaştırması yazılı.
3. **Parçaları çizmek.** Worker, greedy meshing, ışıksız shader, doku dizisi, pencereler, sis. Önce kamera çevresindeki parçalar bir kez yüklenir (atma yok).
   *Bitti:* Kütüphane, Çarşı, MM ve Kafeterya doğru yerde; telefonda 5 saniyede ilk görüntü.
4. **Dinamik yükleme ve uzak görüntü.** Parçaların yarıçapa göre yüklenip atılması, kare başına ekleme sınırı, genel bakış katmanı, renderer ayarları, hata ayıklama paneli.
   *Bitti:* kampüsün bir ucundan öbür ucuna gezince bellek sürekli artmıyor; Bölüm 12 bütçesi orta bir Android'de tutuyor.
5. **Karakter ve takip kamerası.** Takip kamerası, hareket, çarpışma, GPS'e yürüme, serbest gezinti, avatar yer tutucusu.
   *Bitti:* WASD ve joystick ile yürünüyor, binalardan geçilmiyor; masaüstünde geliştirici araçları → Sensors ile verilen konuma karakter yürüyor; telefonda `?konum=gercek` ile elde tutup 50 m yürüyünce karakter izliyor.
6. **Hediye kutuları ve tabelalar.** `hediyeler.js` (ışık sütunu, `alinabilir` vurgusu, giriş-çıkış animasyonu), `tabelalar.js` (tabela ve uzak etiket), kredi satırı.
   *Bitti:* `hediyeleriGoster` ile verilen kutular doğru konumda; `alinabilir` olan öne çıkıyor; "Elektrik-Elektronik Mühendisliği A Blok" gibi uzun bir ad tabelada iki satıra sığıyor ve 10 m'den okunuyor.
7. **İsteğe bağlı, bu sırayla:** `.vox` okuyucu ve katalog, kampüs maskesi, `pusulaYonu`, yılbaşı ağacı ışıkları, arazi.

**Zaman daralırsa** şunlar bu sırayla kesilir: 7. aşamanın tamamı; genel bakış katmanı (uzak kampüs sise bırakılır); dinamik atma (yalnızca başlangıçta yükleme); yılbaşı ağaçları ve lambalar. Karakter, takip kamerası, hediye kutuları ve tabelalar kesilmez.

**Yedek yol:** 3. aşamada parça yükleme bir saat içinde çalışmazsa, `dunya-uret.mjs`'in ürettiği bütün parçalar açılışta bir kez yüklenip birleştirilir (yükleme yarıçapı sonsuz). Telefonda ağır kalırsa `BLOK_METRE` geçici olarak 1'e alınır ve bana söylenir. `harita/api.js` aynı kaldığı için dışarıdaki hiçbir şey etkilenmez.

---

## 14. Kabul ölçütleri

- [ ] Vercel önizleme adresinde bir iPhone ve bir Android telefonda harita 5 saniyede açılıyor, konsolda hata yok.
- [ ] Bölüm 12'deki bütçe `?hata-ayikla=1` ile orta bir Android'de tutuyor; sayılar PR'da.
- [ ] Gölge geçişi yok; hiçbir mesh'te `castShadow` açık değil.
- [ ] Kütüphane, Çarşı, MM ve Kafeterya doğru yerde ve tabelaları okunuyor.
- [ ] Takip modunda karakter WASD ve joystick ile yürüyor, binalardan geçemiyor.
- [ ] Konum taklidiyle (geliştirici araçları → Sensors) karakter verilen konuma yürüyor.
- [ ] Telefonu elde tutup 50 m yürüyünce karakter zıplamadan izliyor.
- [ ] `hediyeleriGoster` ile verilen kutular doğru konumda; `alinabilir` olan öne çıkıyor; tıklanınca doğru id ile olay geliyor.
- [ ] Kampüsün bir ucundan öbür ucuna gezince bellek sürekli artmıyor.
- [ ] Ağ kesilince ya da bir parça bozuk gelince ekranda Türkçe hata var, sayfa "yükleniyor"da kalmıyor.
- [ ] Aynı girdiyle iki derleme aynı parça dosyalarını üretiyor.
- [ ] Kampüs sınırı ile `SINIR` karşılaştırması `docs/harita-kararlar.md`'de yazılı.

---

## 15. Lisans ve krediler

- OSM verisi ODbL: harita köşesinde "© OpenStreetMap katkıcıları" ve `CREDITS.md`'de kaynak.
- Arazi kullanılırsa Tilezen'in atıf metni birebir.
- Dışarıdan model gerekirse yalnızca CC0 ya da CC BY; kaynağı, yazarı ve lisansı `CREDITS.md`'ye, CC BY olanlar harita köşesine de. Yükleyen ile asıl yazar farklıysa ikisi de yazılır.
- Minecraft dokuları, karakterleri, logoları ve adı kullanılmaz; başka markaların karakterleri ve yakın kopyaları da.
- Referans sitenin kodu, modelleri ve verisi kopyalanmaz.
