// Used by both the browser and the API.
import type { YerDurumu } from '../3d-harita/js/yerlesim.js'

export const NOTE_MAX = 200
export const NEW_GIFT_MESSAGE = 'New collection item has been hidden'

/** Why a spot can't be used. `null` means it can. */
export const PLACE_PROBLEMS: Record<YerDurumu, string | null> = {
  uygun: null,
  'sinir-disi': 'That’s outside the METU campus. Pick a spot inside the yellow boundary.',
  yasak: 'That area is restricted. Pick a public spot on campus.',
  bina: 'That’s inside a building. Pick a spot outside it, for example by the entrance.',
  yol: 'That’s on a road with cars. Pick a safer spot, like a path or the grass.',
  su: 'That’s in the water. Pick a spot on dry land.',
}

/** Six decimals is about 10 cm. Browser and server must check the same rounded point. */
export const roundCoordinate = (value: number) => Math.round(value * 1e6) / 1e6

/** Trimmed, with normalised line breaks and without control characters (PostgreSQL rejects NUL). */
export const cleanNote = (value: string) =>
  value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '')
    .trim()

export function noteError(value: string): string | undefined {
  const note = cleanNote(value)
  if (!note) return 'Write a note for whoever finds your gift.'
  if (note.length > NOTE_MAX) return `Keep the note under ${NOTE_MAX} characters.`
}
