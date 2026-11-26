import sharp from 'sharp'
import { MATCH_EDGE } from '../../../shared/huntRules.js'
import { openCv } from './opencv.js'

// "Is this the same place?", not "what object is this?": ORB points, matched across the two images,
// then a RANSAC homography keeps only matches that agree on one geometry. Their count is the score.
// No training data: any spot with enough texture (a door number, a poster, tiles) can be recognised.

const ORB_POINTS = 1000
const RATIO = 0.75 // Lowe's test: the best match must clearly beat the second best
const RANSAC_PX = 5
const DESCRIPTOR_BYTES = 32
const VERSION = 1

export interface Features {
  points: Float32Array // x, y pairs
  descriptors: Uint8Array // 32 bytes per point
  count: number
}

/** Same size and greyscale for every image, so scores compare across phones. */
async function grey(jpeg: Buffer) {
  const { data, info } = await sharp(jpeg)
    .rotate()
    .resize({ width: MATCH_EDGE, height: MATCH_EDGE, fit: 'inside', withoutEnlargement: true })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height }
}

export async function extractFeatures(jpeg: Buffer): Promise<Features> {
  const { cv } = await openCv()
  const image = await grey(jpeg)
  const mat = cv.matFromArray(image.height, image.width, cv.CV_8UC1, image.data)
  const orb = new cv.ORB(ORB_POINTS)
  const keypoints = new cv.KeyPointVector()
  const descriptors = new cv.Mat()
  const noMask = new cv.Mat()
  try {
    orb.detectAndCompute(mat, noMask, keypoints, descriptors)
    const count = descriptors.rows
    const points = new Float32Array(count * 2)
    for (let i = 0; i < count; i++) {
      const { pt } = keypoints.get(i)
      points[i * 2] = pt.x
      points[i * 2 + 1] = pt.y
    }
    return { points, descriptors: new Uint8Array(count ? descriptors.data : []).slice(), count }
  } finally {
    for (const object of [mat, orb, keypoints, descriptors, noMask]) object.delete()
  }
}

/** Stored in the database instead of the photo itself. */
export function serialize({ points, descriptors, count }: Features) {
  const buffer = Buffer.alloc(5 + count * 8 + count * DESCRIPTOR_BYTES)
  buffer.writeUInt8(VERSION, 0)
  buffer.writeUInt32LE(count, 1)
  Buffer.from(points.buffer, points.byteOffset, count * 8).copy(buffer, 5)
  Buffer.from(descriptors).copy(buffer, 5 + count * 8)
  return buffer
}

export function deserialize(buffer: Buffer): Features {
  if (buffer.readUInt8(0) !== VERSION) throw new Error('Unknown feature format')
  const count = buffer.readUInt32LE(1)
  const points = new Float32Array(count * 2)
  Buffer.from(points.buffer).set(buffer.subarray(5, 5 + count * 8))
  const descriptors = new Uint8Array(buffer.subarray(5 + count * 8, 5 + count * 8 + count * DESCRIPTOR_BYTES))
  return { points, descriptors, count }
}

/** Geometrically consistent matches between two images. Around 0-10 for different places. */
export async function inliers(a: Features, b: Features) {
  if (a.count < 8 || b.count < 8) return 0
  const { cv } = await openCv()
  const da = cv.matFromArray(a.count, DESCRIPTOR_BYTES, cv.CV_8UC1, a.descriptors)
  const db = cv.matFromArray(b.count, DESCRIPTOR_BYTES, cv.CV_8UC1, b.descriptors)
  const matcher = new cv.BFMatcher(cv.NORM_HAMMING, false)
  const matches = new cv.DMatchVectorVector()
  const owned: any[] = [da, db, matcher, matches]
  try {
    matcher.knnMatch(da, db, matches, 2)
    const from: number[] = []
    const to: number[] = []
    for (let i = 0; i < matches.size(); i++) {
      const pair = matches.get(i)
      if (pair.size() === 2) {
        const [best, second] = [pair.get(0), pair.get(1)]
        if (best.distance < RATIO * second.distance) {
          from.push(a.points[best.queryIdx * 2]!, a.points[best.queryIdx * 2 + 1]!)
          to.push(b.points[best.trainIdx * 2]!, b.points[best.trainIdx * 2 + 1]!)
        }
      }
      pair.delete()
    }
    const good = from.length / 2
    if (good < 8) return 0
    const src = cv.matFromArray(good, 1, cv.CV_32FC2, from)
    const dst = cv.matFromArray(good, 1, cv.CV_32FC2, to)
    const mask = new cv.Mat()
    owned.push(src, dst, mask)
    const homography = cv.findHomography(src, dst, cv.RANSAC, RANSAC_PX, mask)
    owned.push(homography)
    if (homography.empty()) return 0
    return cv.countNonZero(mask) as number
  } finally {
    for (const object of owned) object.delete()
  }
}

/** The best score of a frame against any of the hider's photos. */
export async function matchScene(scene: Features[], frame: Features) {
  let best = 0
  for (const photo of scene) best = Math.max(best, await inliers(photo, frame))
  return best
}
