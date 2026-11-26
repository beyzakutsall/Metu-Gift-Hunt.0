// Tries the camera matching on your own photos, without the database or the app:
//   npm run match:test -w backend -- <hider-folder> <same-place-folder> <other-place-folder>
// hider: the 3 photos a hider would take. same-place: the spot again, from other angles or another time.
// other-place: a similar-looking spot elsewhere (another floor). Same-place scores should be high, other-place low.
import { readdir, readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { MATCH_MIN_INLIERS, SCENE_MIN_KEYPOINTS } from '../../shared/huntRules.js'
import { extractFeatures, matchScene } from '../src/matcher/index.js'
import { processPhoto } from '../src/photo.js'

const [hiderDir, sameDir, otherDir] = process.argv.slice(2)
if (!hiderDir || !sameDir || !otherDir) {
  console.error('Kullanım: npm run match:test -w backend -- <saklayan-klasörü> <ayni-yer-klasörü> <baska-yer-klasörü>')
  process.exit(1)
}

async function load(dir: string) {
  const names = (await readdir(dir)).filter((name) => ['.jpg', '.jpeg', '.png'].includes(extname(name).toLowerCase())).sort()
  if (!names.length) throw new Error(`${dir} içinde JPEG/PNG fotoğraf yok.`)
  return Promise.all(
    names.map(async (name) => {
      // The same path the app uses: re-encoded, shrunk, EXIF gone.
      const jpeg = await processPhoto((await readFile(join(dir, name))).toString('base64'), { maxBytes: Infinity })
      return { name, features: await extractFeatures(jpeg) }
    }),
  )
}

const hider = await load(hiderDir)
console.log('\nSaklayan fotoğrafları (sahne kalitesi)')
for (const { name, features } of hider) {
  const ok = features.count >= SCENE_MIN_KEYPOINTS
  console.log(`  ${ok ? 'geçti ' : 'KALDI '} ${name}: ${features.count} nokta (en az ${SCENE_MIN_KEYPOINTS})`)
}
const scene = hider.map(({ features }) => features)

async function scores(dir: string, label: string) {
  console.log(`\n${label}`)
  const result: number[] = []
  for (const { name, features } of await load(dir)) {
    const score = await matchScene(scene, features)
    result.push(score)
    console.log(`  ${String(score).padStart(4)}  ${score >= MATCH_MIN_INLIERS ? 'eşleşti   ' : 'eşleşmedi '} ${name}`)
  }
  return result
}

const same = await scores(sameDir, 'Aynı yer (eşleşmeli)')
const other = await scores(otherDir, 'Başka yer (eşleşmemeli)')
const lowestSame = Math.min(...same)
const highestOther = Math.max(...other)

console.log(`\nŞu anki eşik MATCH_MIN_INLIERS = ${MATCH_MIN_INLIERS}`)
console.log(`Aynı yerin en düşük puanı: ${lowestSame}, başka yerin en yüksek puanı: ${highestOther}`)
if (lowestSame > highestOther) {
  // Just above the other places, not the middle: a finder's frames are often worse than these photos,
  // and a wrong place is the mistake that matters.
  const suggested = Math.min(lowestSame, Math.max(15, Math.ceil(highestOther * 1.5) + 5))
  console.log(`Ayrım iyi. Önerilen eşik: ${suggested} (shared/huntRules.ts içindeki MATCH_MIN_INLIERS).`)
  console.log('Başka yerlerin puanının biraz üstü seçildi, aynı yerde zor açılardan çekilen kareler de geçebilsin diye.')
} else {
  console.log('Ayrım kötü: bazı başka-yer fotoğrafları aynı yer kadar yüksek puan aldı. Saklarken kadraja daha ayırt edici bir şey (oda numarası, tabela, afiş) alın ve tekrar deneyin.')
}
