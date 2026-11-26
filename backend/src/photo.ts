import sharp from 'sharp'
import { PHOTO_MAX_BYTES, PHOTO_MAX_EDGE } from '../../shared/huntRules.js'
import { invalid } from './input.js'

// Checked before decoding, so SVG and other complex parsers never see an upload.
const isJpeg = (bytes: Buffer) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
const isPng = (bytes: Buffer) => bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))

interface Options {
  maxEdge?: number
  maxBytes?: number
  /** The request field to blame in an error. */
  field?: string
}

/** Re-encodes the upload: anything hidden in the file, and EXIF (including home GPS), is dropped. */
export async function processPhoto(base64: unknown, { maxEdge = PHOTO_MAX_EDGE, maxBytes = PHOTO_MAX_BYTES, field = 'photo' }: Options = {}) {
  if (typeof base64 !== 'string' || !base64) throw invalid('Take or choose a photo.', field)
  const bytes = Buffer.from(base64, 'base64')
  if (bytes.length > maxBytes) throw invalid('That photo is too large.', field)
  if (!isJpeg(bytes) && !isPng(bytes)) throw invalid('Upload a JPEG or PNG photo.', field)
  try {
    return await sharp(bytes, { limitInputPixels: 30_000_000, failOn: 'error' })
      .rotate()
      .resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 78 })
      .timeout({ seconds: 10 })
      .toBuffer()
  } catch {
    throw invalid('That photo couldn’t be read. Try another one.', field)
  }
}
