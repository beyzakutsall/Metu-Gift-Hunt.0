// Used by both the browser and the API.
import type { YerDurumu } from '../3d-harita/js/yerlesim.js'

export const NOTE_MAX = 200
export const CLUE_MAX = 200
export const RIDDLE_MAX = 200
export const ANSWER_MAX = 80
export const ANSWERS_MAX = 5
export const NEW_GIFT_MESSAGE = 'New collection item has been hidden'

/** Why a spot can't be used. `null` means it can. */
export const PLACE_PROBLEMS: Record<YerDurumu, string | null> = {
  uygun: null,
  'sinir-disi': 'That’s outside the METU campus. Pick a spot inside the yellow boundary.',
  yasak: 'That area is restricted (dorms, schools, Teknokent or sensitive sites). Pick a public spot.',
  bina: 'That building isn’t open for hunts. Pick a faculty or public building from the list.',
  yol: 'That’s on a road with cars. Pick a safer spot, like a path or the grass.',
  su: 'That’s in the water. Pick a spot on dry land.',
  uzak: 'That’s too far from a campus building. Pick a spot inside or right next to one.',
}

/** Six decimals is about 10 cm. Browser and server must check the same rounded point. */
export const roundCoordinate = (value: number) => Math.round(value * 1e6) / 1e6

/** Trimmed, with normalised line breaks and without control characters (PostgreSQL rejects NUL). */
export const cleanText = (value: string) =>
  value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '')
    .trim()

export function noteError(value: string): string | undefined {
  const note = cleanText(value)
  if (!note) return 'Write a note for whoever finds your gift.'
  if (note.length > NOTE_MAX) return `Keep the note under ${NOTE_MAX} characters.`
}

export function clueError(value: string): string | undefined {
  const clue = cleanText(value)
  if (clue.length < 3) return 'Give a clue, like “On the third floor”.'
  if (clue.length > CLUE_MAX) return `Keep the clue under ${CLUE_MAX} characters.`
}

export function riddleError(value: string): string | undefined {
  const riddle = cleanText(value)
  if (riddle.length < 5) return 'Ask a question the finder can answer there.'
  if (riddle.length > RIDDLE_MAX) return `Keep the riddle under ${RIDDLE_MAX} characters.`
}

/** "Cahit Arf; Arf Hall" means either is accepted. */
export const splitAnswers = (value: string) =>
  cleanText(value)
    .split(/[;\n]/)
    .map((part) => part.trim())
    .filter(Boolean)

export function answersError(value: string): string | undefined {
  const answers = splitAnswers(value)
  if (!answers.some((answer) => /[\p{L}\p{N}]/u.test(answer))) return 'Write the correct answer.'
  if (answers.some((answer) => !/[\p{L}\p{N}]/u.test(answer))) return 'Every answer needs a letter or number.'
  if (answers.length > ANSWERS_MAX) return `Give at most ${ANSWERS_MAX} accepted answers.`
  if (answers.some((answer) => answer.length > ANSWER_MAX)) return `Keep each answer under ${ANSWER_MAX} characters.`
}

export function guessError(value: string): string | undefined {
  const guess = value.trim()
  if (!guess) return 'Type your answer to the riddle.'
  if (guess.length > ANSWER_MAX) return `Keep the answer under ${ANSWER_MAX} characters.`
}
