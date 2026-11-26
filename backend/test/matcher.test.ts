import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MATCH_MIN_INLIERS, SCENE_MIN_KEYPOINTS } from '../../shared/huntRules.js'
import { deserialize, extractFeatures, matchScene, serialize } from '../src/matcher/index.js'
import { createMatchQueue } from '../src/matcher/queue.js'
import { finderPhoto, hiderPhotos, placePhoto, plainPhoto } from './images.js'

const scene = await Promise.all((await hiderPhotos(7)).map(extractFeatures))

test('the same place matches, moved, tilted and in other light', async () => {
  for (const view of [await finderPhoto(7), await placePhoto(7, { left: 40, top: 160, angle: -10, brightness: 0.6 })]) {
    assert.ok((await matchScene(scene, await extractFeatures(view))) >= MATCH_MIN_INLIERS * 3)
  }
})

test('other places stay far below the threshold', async () => {
  for (const seed of [8, 9, 10]) {
    assert.ok((await matchScene(scene, await extractFeatures(await finderPhoto(seed)))) < MATCH_MIN_INLIERS / 2, `place ${seed}`)
  }
})

test('a plain wall has nothing to recognise', async () => {
  const plain = await extractFeatures(await plainPhoto())
  assert.ok(plain.count < SCENE_MIN_KEYPOINTS)
  assert.equal(await matchScene(scene, plain), 0)
  assert.ok(scene.every((photo) => photo.count >= SCENE_MIN_KEYPOINTS))
})

test('stored features match exactly like fresh ones', async () => {
  const stored = scene.map((photo) => deserialize(serialize(photo)))
  const frame = await extractFeatures(await finderPhoto(7))
  assert.equal(await matchScene(stored, frame), await matchScene(scene, frame))
})

test('the match queue runs a few at a time and turns the rest away politely', async () => {
  const run = createMatchQueue(1, 1)
  let release!: () => void
  const first = run(() => new Promise<void>((resolve) => (release = resolve)))
  const second = run(async () => 'second')
  await assert.rejects(run(async () => 'third'), { code: 'BUSY' })
  release()
  await first
  assert.equal(await second, 'second')
})
