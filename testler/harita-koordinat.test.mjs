import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SINIR, BLOK_METRE, enlemBoylamdanDunyaya, dunyadanEnlemBoylama, mesafeMetre,
} from '../ortak/koordinat.js';

const PARCA_HUCRE = 128;
const KUTUPHANE = { enlem: 39.89576, boylam: 32.78321 };

test('kuzeybatı köşesi orijin', () => {
  const { x, z } = enlemBoylamdanDunyaya(SINIR.kuzey, SINIR.bati);
  assert.equal(x, 0);
  assert.equal(z, 0);
});

test('x doğuya, z güneye artar', () => {
  const merkez = enlemBoylamdanDunyaya(KUTUPHANE.enlem, KUTUPHANE.boylam);
  const dogu = enlemBoylamdanDunyaya(KUTUPHANE.enlem, KUTUPHANE.boylam + 0.001);
  const guney = enlemBoylamdanDunyaya(KUTUPHANE.enlem - 0.001, KUTUPHANE.boylam);
  assert.ok(dogu.x > merkez.x);
  assert.ok(guney.z > merkez.z);
});

test('gidiş-dönüş aynı noktayı verir', () => {
  for (const nokta of [KUTUPHANE, { enlem: SINIR.guney, boylam: SINIR.dogu }, { enlem: 39.8912, boylam: 32.7655 }]) {
    const { x, z } = enlemBoylamdanDunyaya(nokta.enlem, nokta.boylam);
    const geri = dunyadanEnlemBoylama(x, z);
    assert.ok(Math.abs(geri.enlem - nokta.enlem) < 1e-9);
    assert.ok(Math.abs(geri.boylam - nokta.boylam) < 1e-9);
  }
});

test('kampüs yaklaşık 6833 × 5087 hücre, 54 × 40 parça', () => {
  const kose = enlemBoylamdanDunyaya(SINIR.guney, SINIR.dogu);
  assert.ok(Math.abs(kose.x - 6833) < 2, `genişlik ${kose.x}`);
  assert.ok(Math.abs(kose.z - 5087) < 2, `derinlik ${kose.z}`);
  assert.equal(Math.ceil(kose.x / PARCA_HUCRE), 54);
  assert.equal(Math.ceil(kose.z / PARCA_HUCRE), 40);
});

test('mesafeMetre: 1 derece enlem ≈ 111,2 km', () => {
  const d = mesafeMetre({ enlem: 39, boylam: 32 }, { enlem: 40, boylam: 32 });
  assert.ok(Math.abs(d - 111195) < 10, `${d}`);
  assert.equal(mesafeMetre(KUTUPHANE, KUTUPHANE), 0);
});

test('dünya uzaklığı haversine ile %1 içinde uyuşur', () => {
  // Dönüşüm 110574 m/derece, haversine küre kullanır; aradaki küçük fark normal.
  const hedefler = [
    { enlem: SINIR.guney, boylam: SINIR.dogu },
    { enlem: SINIR.kuzey, boylam: SINIR.bati },
    { enlem: KUTUPHANE.enlem + 0.0005, boylam: KUTUPHANE.boylam + 0.0007 },
  ];
  const a = enlemBoylamdanDunyaya(KUTUPHANE.enlem, KUTUPHANE.boylam);
  for (const h of hedefler) {
    const b = enlemBoylamdanDunyaya(h.enlem, h.boylam);
    const dunya = Math.hypot(b.x - a.x, b.z - a.z) * BLOK_METRE;
    const kure = mesafeMetre(KUTUPHANE, h);
    assert.ok(Math.abs(dunya - kure) / kure < 0.01, `dünya ${dunya}, küre ${kure}`);
  }
});
