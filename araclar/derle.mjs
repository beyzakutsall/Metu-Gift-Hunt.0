// Derleme: dunya-uret.mjs'i (varsa) çalıştırır, statik dosyaları dist/'e kopyalar.
import { cp, rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const kok = fileURLToPath(new URL('..', import.meta.url));
const dist = join(kok, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const uretici = join(kok, 'araclar', 'dunya-uret.mjs');
if (existsSync(uretici)) {
  const sonuc = spawnSync(process.execPath, [uretici], { stdio: 'inherit', cwd: kok });
  if (sonuc.status !== 0) {
    console.error('dunya-uret.mjs başarısız oldu.');
    process.exit(1);
  }
} else {
  console.log('dunya-uret.mjs henüz yok; dünya üretimi atlandı.');
}

for (const klasor of ['harita', 'ortak', 'modeller']) {
  const kaynak = join(kok, klasor);
  if (existsSync(kaynak)) await cp(kaynak, join(dist, klasor), { recursive: true });
}

console.log('Derleme bitti: dist/');
