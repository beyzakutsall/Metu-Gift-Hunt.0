import sharp from 'sharp'

// Stand-ins for photos of a spot: many shapes and some text, like a door with a sign and a poster.
// The same seed is the same place; a view is the camera standing a little differently.

function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function placeSvg(seed: number) {
  const next = random(seed)
  const colour = () => `hsl(${Math.floor(next() * 360)},${40 + Math.floor(next() * 50)}%,${25 + Math.floor(next() * 50)}%)`
  let shapes = ''
  for (let i = 0; i < 70; i++) {
    const [x, y, w, h] = [next() * 900, next() * 700, 20 + next() * 140, 20 + next() * 140]
    shapes += next() < 0.5
      ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${colour()}" transform="rotate(${next() * 40 - 20} ${x} ${y})"/>`
      : `<circle cx="${x}" cy="${y}" r="${w / 3}" fill="${colour()}" stroke="${colour()}" stroke-width="${2 + next() * 6}"/>`
  }
  for (let i = 0; i < 8; i++) {
    shapes += `<text x="${next() * 800}" y="${40 + next() * 660}" font-size="${24 + next() * 40}" font-family="sans-serif" font-weight="bold" fill="${colour()}">${Math.floor(next() * 900 + 100)}-${String.fromCharCode(65 + Math.floor(next() * 26))}</text>`
  }
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="800"><rect width="1000" height="800" fill="${colour()}"/>${shapes}</svg>`)
}

interface View {
  /** Pixels cut from the left and top of the 1000x800 scene. */
  left?: number
  top?: number
  angle?: number
  brightness?: number
}

export async function placePhoto(seed: number, { left = 100, top = 100, angle = 0, brightness = 1 }: View = {}) {
  const rendered = await sharp(placeSvg(seed)).rotate(angle, { background: '#777' }).png().toBuffer()
  return sharp(rendered)
    .extract({ left, top, width: 800, height: 600 })
    .modulate({ brightness })
    .resize(640, 480)
    .jpeg({ quality: 85 })
    .toBuffer()
}

/** A plain wall: nothing to recognise. */
export const plainPhoto = () => sharp({ create: { width: 640, height: 480, channels: 3, background: '#d8d4cc' } }).jpeg().toBuffer()

/** The three photos a hider takes, from slightly different positions. */
export const hiderPhotos = (seed: number) =>
  Promise.all([placePhoto(seed), placePhoto(seed, { left: 60, top: 90 }), placePhoto(seed, { left: 140, top: 110 })])

/** What a finder's camera sees at the same place: moved, tilted and in other light. */
export const finderPhoto = (seed: number) => placePhoto(seed, { left: 120, top: 70, angle: 6, brightness: 0.8 })
