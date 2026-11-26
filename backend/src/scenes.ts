import { FRAME_MAX_BYTES, MATCH_EDGE, SCENE_MIN_KEYPOINTS, SCENE_PHOTOS } from '../../shared/huntRules.js'
import { invalid } from './input.js'
import { extractFeatures, serialize } from './matcher/index.js'
import type { MatchQueue } from './matcher/queue.js'
import { processPhoto } from './photo.js'

const asPhoto = (base64: unknown, field: string) => processPhoto(base64, { maxEdge: MATCH_EDGE, maxBytes: FRAME_MAX_BYTES, field })

/** The hider's photos of the spot: cleaned like every upload, and each must have enough to recognise. */
export async function readScene(body: any, queue: MatchQueue) {
  const photos: unknown = body?.photos
  if (!Array.isArray(photos) || photos.length !== SCENE_PHOTOS) {
    throw invalid(`Take ${SCENE_PHOTOS} photos of the spot.`, 'photos')
  }
  const scene = []
  for (const [index, base64] of photos.entries()) {
    const jpeg = await asPhoto(base64, 'photos')
    const features = await queue(() => extractFeatures(jpeg))
    if (features.count < SCENE_MIN_KEYPOINTS) {
      throw invalid(`Photo ${index + 1} doesn’t show enough detail. Include a door number, a sign or a poster, and try again.`, 'photos')
    }
    scene.push({ jpeg, features: serialize(features) })
  }
  return scene
}

/** One camera frame from a finder. */
export async function readFrame(base64: unknown, queue: MatchQueue) {
  const jpeg = await asPhoto(base64, 'frame')
  return { jpeg, features: await queue(() => extractFeatures(jpeg)) }
}
