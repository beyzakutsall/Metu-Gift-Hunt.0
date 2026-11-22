// Forgiving about how a place is written, strict about which place it is.

const GENERIC = new Set(
  'the hall room auditorium conference salon salonu konferans amfi amfisi oda odasi bina binasi derslik dersligi building'.split(' '),
)

function words(value: string) {
  const all = value
    .toLowerCase()
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
  const specific = all.filter((word) => !GENERIC.has(word))
  return specific.length ? specific : all
}

function withinOneEdit(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  while (i < a.length && a[i] === b[i]) i++
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1)
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1)
}

// "Blok A" against "Blok B", or "Amfi 3" against "Amfi 4", are different places, not typos.
const identifiers = (list: string[]) => list.filter((word) => word.length === 1 || /\p{N}/u.test(word)).join(' ')

export function isCorrectAnswer(guess: string, accepted: string[]) {
  const given = words(guess)
  const typed = given.join('')
  if (!typed) return false
  return accepted.some((answer) => {
    const wanted = words(answer)
    const expected = wanted.join('')
    if (typed === expected) return true
    return expected.length >= 8 && identifiers(given) === identifiers(wanted) && withinOneEdit(typed, expected)
  })
}
