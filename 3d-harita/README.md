# 3D Blok Harita

ODTÜ kampüsünün blok haritası. [metu-gift-hunt](https://github.com/beyzakutsall/metu-gift-hunt) reposundaki haritadan (`main`, commit `9c06f11`) kopyalandı. Bu repoda haritaya GPS ile yürüyen oyuncu işareti, hediye kutuları ve başka bir sayfaya gömülebilmesi için `js/harita.js` eklendi.

## Çalıştırmak

Sayfalar `data/` klasörünü okuduğu için çift tıklayarak (`file://`) açılmaz; bu klasörden yerel bir sunucu gerekir:

```
cd 3d-harita
python -m http.server 8000
```

- http://localhost:8000/minecraft.html: yalnızca harita (kuşbakışı).
- http://localhost:8000/deneme.html?konum=sahte&hediye=ornek: GPS ve hediyelerle deneme.
  - `?konum=sahte`: Kütüphane'den başlayıp daire çizerek yürüyen sahte konum (bilgisayarda denemek için).
  - `?hediye=ornek`: Kütüphane çevresine 5 hediye; konuma 30 m'den yakın olan zıplar ("alınabilir").
  - Parametresiz açıp "Konumumu kullan"a basınca telefonun gerçek konumu kullanılır.

Telefonda gerçek konumla denemek için sayfa HTTPS'ten açılmalı (konum yalnızca HTTPS'te ve localhost'ta çalışır). Bilgisayarda Chrome'da Geliştirici araçları → Sensors → Location ile konum taklit edilebilir.

Harita verisi © OpenStreetMap katkıcıları, ODbL lisansıyla. `data/campus.json` dosyasını yenilemek için: `powershell -ExecutionPolicy Bypass -File 3d-harita\tools\veri-indir.ps1` (uygulamaya kopyaladıysanız `frontend/public/3d-harita/` altındakini de yenileyin).

## Uygulamaya gömmek

Uygulama haritayı yalnızca `js/harita.js` üzerinden kullanır; dışarısı her zaman `{enlem, boylam}` konuşur. `js/konum.js` telefonun GPS'ini okur; haritadan bağımsızdır, istenirse kendi kodunuzla değiştirilebilir. TypeScript tanımları yanlarındaki `.d.ts` dosyalarında.

### Fonksiyonlar

| | |
| --- | --- |
| `haritaBaslat(kapsayici, secenekler)` | Haritayı verilen öğenin içine kurar ve hemen döner; kurulum arkada sürer. Öğenin CSS ile genişliği ve yüksekliği olmalı. |
| `harita.hazir` | Kurulum bitince çözülen söz; hata olursa Türkçe mesajlı `Error`. |
| `harita.on('hazir' \| 'hata' \| 'hediye-tiklandi', cb)` | Olay dinler, dinlemeyi bırakan bir fonksiyon döner. `hata` → `{ mesaj }`, `hediye-tiklandi` → `{ id }`. |
| `harita.gpsKonumu({ enlem, boylam, dogruluk })` | Oyuncu işareti oraya yürür (50 m'den büyük sıçramada ışınlanır). `dogruluk` metre, yerdeki mavi halka. `null` işareti gizler. |
| `harita.hediyeleriGoster([{ id, enlem, boylam, alinabilir }])` | Kutuları bu listeyle değiştirir. Yeni gelen büyüyerek belirir, çıkan küçülerek kaybolur; `alinabilir: true` olan zıplar ve ışığı parlar. |
| `harita.ekranKonumu({ enlem, boylam })` | Noktanın kapsayıcı içindeki ekran yeri (`{x, y}` CSS px) ya da `null`; ör. kutunun üstüne baloncuk koymak için. |
| `harita.oyuncuyaOdaklan()` / `harita.takipEt(true)` | Kamerayı oyuncuya uçurur / oyuncuyu izletir (izlerken kaydırma kapalı). |
| `harita.yokEt()` | Çizimi durdurur, belleği ve WebGL bağlamını bırakır. **Sayfadan çıkarken mutlaka çağrılmalı**; yoksa her girişte yeni bir WebGL bağlamı açılır ve tarayıcı 16 kadar bağlamdan sonra haritayı siyah bırakır. |

`secenekler`: `veriAdresi` (`data/` ve `modeller/` klasörlerinin adresi), `baslangic` (`{enlem, boylam}`), `yuklemeEkrani` (varsayılan `true`), `atif` (varsayılan `true`), `ilkKonumdaOdaklan` (varsayılan `true`). Kurulum bitmeden çağrılan `gpsKonumu` ve `hediyeleriGoster` saklanır, harita hazır olunca uygulanır.

Atıf satırı (OSM ve ağaç modeli) lisans gereği zorunlu. `atif: false` verilirse sayfada başka bir yerde gösterilmeli.

### React (Vite) projesine bağlamak

1. three.js'i haritayla aynı sürümde kurun: `npm i three@0.170.0 -w frontend`
2. `3d-harita/data` ve `3d-harita/modeller` klasörlerini `frontend/public/3d-harita/` altına kopyalayın ve `veriAdresi: '/3d-harita/'` verin.
3. Bileşen örneği (bu repoda `npm run build` ile derlenip tarayıcıda denendi):

```tsx
import { useEffect, useRef, useState } from 'react'
import { haritaBaslat, type Harita, type HaritaHediyesi } from '../../../../3d-harita/js/harita.js'
import { konumuIzle } from '../../../../3d-harita/js/konum.js'

type Props = {
  hediyeler: HaritaHediyesi[]
  onHediyeTiklandi: (id: string | number) => void
}

export function KampusHaritasi({ hediyeler, onHediyeTiklandi }: Props) {
  const kutu = useRef<HTMLDivElement>(null)
  const harita = useRef<Harita | null>(null)
  const tiklamaRef = useRef(onHediyeTiklandi)
  tiklamaRef.current = onHediyeTiklandi
  const [konumAcik, setKonumAcik] = useState(false)
  const [mesaj, setMesaj] = useState('')

  // Haritayı bir kez kur, sayfadan çıkınca kapat
  useEffect(() => {
    const h = haritaBaslat(kutu.current!, { veriAdresi: '/3d-harita/' })
    harita.current = h
    h.on('hata', ({ mesaj }) => setMesaj(mesaj))
    h.on('hediye-tiklandi', ({ id }) => tiklamaRef.current(id))
    return () => { h.yokEt(); harita.current = null }
  }, [])

  // Hediye listesi değişince haritaya ver
  useEffect(() => { harita.current?.hediyeleriGoster(hediyeler) }, [hediyeler])

  // Konum yalnızca kullanıcı düğmeye basınca açılır; kapatınca ya da sayfadan çıkınca durur
  useEffect(() => {
    if (!konumAcik) return
    return konumuIzle({
      konum: (k) => { setMesaj(''); harita.current?.gpsKonumu(k) },
      hata: ({ mesaj }) => setMesaj(mesaj),
      zayif: () => setMesaj('Konum sinyali zayıf…'),
    })
  }, [konumAcik])

  return (
    <div className="relative h-full w-full">
      <div ref={kutu} className="absolute inset-0" />
      <button className="absolute top-3 left-3 rounded bg-white px-3 py-2 shadow" onClick={() => setKonumAcik((a) => !a)}>
        {konumAcik ? 'Konumu kapat' : 'Konumumu kullan'}
      </button>
      {mesaj && <p className="absolute bottom-8 left-3 rounded bg-white/90 px-2 py-1 text-sm">{mesaj}</p>}
    </div>
  )
}
```

React'ın geliştirme modundaki StrictMode bileşeni iki kez kurup kapatır; `yokEt` bu yüzden harita yüklenirken de güvenle çağrılabilir.

three.js uygulamanın ana dosyasına girer ve onu yaklaşık 600 KB büyütür. Harita sayfasını `React.lazy(() => import('./pages/HaritaSayfasi'))` ile ayrı yüklerseniz giriş ve kayıt sayfaları hızlı kalır.

### GPS ve oyun kuralları

- Konum iznini sayfa açılır açılmaz değil, bir düğmeye basınca isteyin. Kullanıcı neden sorulduğunu bilir; reddedilirse harita konumsuz da çalışır.
- Telefonun GPS'i 5-20 m oynar, binaların dibinde daha fazla. `konumuIzle` doğruluğu 100 m'den kötü okumaları atar; harita da oyuncuyu yumuşakça yürütür.
- Hediye almak gibi oyun kararları sunucuda, telefonun gönderdiği gerçek konumla verilmeli. Haritadaki oyuncu işareti yalnızca görüntüdür; `alinabilir` bilgisini de uygulama hesaplar ve haritaya verir (`mesafeMetre` bunun için var).
- Sayfadan çıkınca konum izlemesini durdurun (`konumuIzle`'nin döndürdüğü fonksiyon); açık kalırsa pil biter.

### Bilinen sınırlar

- Harita açılışta bütün kampüsü tek seferde kurar (2,4 MB veri). Bilgisayarda bir iki saniye sürüyor; telefonda henüz ölçülmedi.
- 1 blok 3 m olduğundan oyuncu ve kutular gerçek boyutlarından büyük çizilir (oyuncu ≈ 6 m, kutu ≈ 4 m), yoksa kuşbakışında görünmezlerdi. Oyuncunun başındaki mavi nokta ekranda hep aynı boyuttadır ve binaların arkasından da görünür.

## Harita detayı: tabelalar, etiketler, simge nesneler

- **Tabelalar** (`js/tabelalar.js`): Adı olan her binanın önünde ahşap bir tabela durur ve binanın kısa adı piksel yazıyla okunur. Tabela, binanın OSM giriş düğümü varsa onun önüne, yoksa en yakın yürüme yoluna bakan kenarına konur. Binalara, yollara, ağaçlara ve nesnelere girmez. Yakınında aynı adlı tabela olan binalar (ör. Konukevi) tekrar tabela almaz.
- **Yüzen etiketler** (`js/etiketler.js`): Önemli ve büyük binaların adı uzaktan binanın üstünde görünür. Kamera yaklaşınca solup kaybolur; o mesafede tabelalar okunur. Üst üste binen etiketlerden önceliği düşük olan gizlenir.
- **Kısa adlar** (`data/bina-adlari.json`): Tabelada ve etikette yazan ad. Anahtar OSM öğesi (`way/<id>` ya da `relation/<id>`); `"onemli": true` olanlar uzaktan da etiketle görünür. Dosyada olmayan binalarda OSM'deki `short_name`, o da yoksa kısaltılmış `name` kullanılır ("Mühendisliği Bölümü" → "Müh." gibi).
- **Simge nesneler** (`js/nesneler.js`): Bank, çöp kutusu, piknik masası, bisiklet parkı, heykel/anıt ve bina girişleri OSM'den gelir; hepsi koddan üretilen voksel modeller. OSM'de kampüste sokak lambası olmadığı için **lambalar yürüme yollarının kenarına kendiliğinden dizilir** ve cihaz saatine göre 17:00-07:00 arası yanar.
- **Elle eklenenler** (`data/elle-eklenen.json`): OSM'de olmayan nesneler (ör. Bilim Ağacı) buraya `tur`, `enlem`, `boylam` ile eklenir; indirme betiği bu dosyaya dokunmaz. Şu an boş.
- Yerleşim sırası binalar → tabelalar → nesneler → ağaçlar; her adım öncekilerin hücrelerinden kaçınır (`js/doluluk.js`).
- Tarayıcı konsolu tabela, etiket ve tür başına nesne sayılarını yazar.

Kaynaklar ve lisanslar: [`CREDITS.md`](CREDITS.md). Hazır model adayları: [`docs/MODEL-ADAYLARI.md`](docs/MODEL-ADAYLARI.md).

## Modeller

Haritada yürüme yollarının kenarına süslü yılbaşı ağaçları dikilir; ormanlık alanlardaki sade çamlar ise koddan (`js/agaclar.js`) üretilir.

- Ağacın boyu haritada otomatik olarak yaklaşık 10 bloğa ölçeklenir, modelin kendi boyutu önemli değildir. Ağaçlar arasındaki mesafe ve yollara/binalara olan uzaklık modelin genişliğinden hesaplanır; kaç ağaç dikilebildiği tarayıcı konsolunda yazar.
- Asıl model `modeller/yilbasi-agaci.glb`. Dokusundaki **parlak sarı** pikseller ampul sayılır ve yanıp söner; kırmızı süsler ve beyaz kar sabit kalır.
- GLB yüklenemezse `modeller/yilbasi-agaci.vox` kullanılır (MagicaVoxel ile düzenlenebilir). Orada **parlak sarı** renkteki bloklar (örneğin 255, 255, 0) ışık sayılır. Yıldızın sabit kalmasını istersen onu biraz daha koyu bir sarıyla boya.

### Lisans: yilbasi-agaci.glb

"[Minecraft Christmas tree FREE](https://sketchfab.com/3d-models/minecraft-christmas-tree-free-21010e7da7134d3899e6c0d7d008593a)", [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) lisansıyla. Dosyanın kendisi değiştirilmedi; haritada yalnızca ölçeklenip tek parça halinde çizilir. Haritanın sağ alt köşesinde de kredisi yazar.

- Sketchfab sayfasında yükleyen: [CombatCraft Game](https://sketchfab.com/combatcraft)
- GLB dosyasının içindeki bilgide (`asset.extras`) yazar: [UnitedPechoraRecords](https://sketchfab.com/KV4GA)

Bu iki isim birbirini tutmadığı için ikisi de kredilendirilir.

