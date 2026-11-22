import { PHOTO_MAX_EDGE } from '../../../shared/huntRules'

/**
 * Shrinks on the phone: quick on weak indoor signal, turns iPhone HEIC into JPEG where the browser
 * can read it, and drops EXIF before anything leaves the device.
 */
export async function preparePhoto(file: File) {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')!
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const preview = canvas.toDataURL('image/jpeg', 0.8)
    return { preview, base64: preview.slice(preview.indexOf(',') + 1) }
  } finally {
    URL.revokeObjectURL(url)
  }
}
