# METU Gift Hunt

ODTÜ öğrencileri için yılbaşı temalı bir kampüs keşif oyunu. Öğrenciler kampüse dijital hediyeler saklar,
başkalarının sakladıklarını ipuçlarıyla bulur ve koleksiyon kitapçıklarını doldurur.

- Sadece `@metu.edu.tr` adresleriyle kayıt olunur. Adres, e-postayla gelen 6 haneli kodla doğrulanır.
- Günde 2 arama ve 3 saklama hakkı vardır, haklar gece yarısı (İstanbul saatiyle) yenilenir.
- Arama: GPS binaya yaklaştığını doğrulayınca ipucu ve bilmece açılır, bilmeceyi çözen hediyeyi alır.
  Kamerayla yer doğrulama planlanıyor (bkz. [CLAUDE.md](CLAUDE.md)).

Bu, öğrencilerin geliştirdiği bir proje; ODTÜ'nün resmî bir hizmeti değildir.

## Belgeler

- [SETUP.md](SETUP.md): kurulum, komutlar ve yayına alma
- [CLAUDE.md](CLAUDE.md): ürün kararları, güvenlik kuralları ve yol haritası (Claude Code bu dosyayı okur)
- [3d-harita/README.md](3d-harita/README.md): kampüs haritası
- [docs/HARITA-MOTORU.md](docs/HARITA-MOTORU.md): harita motorunun ilk tasarım belgesi
- [docs/ilk-istem.md](docs/ilk-istem.md): projenin başlangıç istemi (arşiv)

## Hızlı başlangıç

```bash
npm install
npm run db:setup
npm run dev
```

Sunucusuz deneme için `npm run dev:mock` (giriş: `explorer@metu.edu.tr` / `campusquest`).
