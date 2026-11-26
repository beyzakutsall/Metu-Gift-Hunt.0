import { AppError } from './errors.js'

const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i

export const invalid = (message: string, field?: string) => new AppError(400, 'VALIDATION', message, { field })
export const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value)

export function readId(value: unknown) {
  if (!isUuid(value)) throw new AppError(404, 'NOT_FOUND', 'Not found.')
  return value
}

export function readText(body: any, field: string, validate: (value: string) => string | undefined) {
  const raw: unknown = body?.[field]
  const value = typeof raw === 'string' ? raw : ''
  const message = validate(value)
  if (message) throw invalid(message, field)
  return value
}

export function readPoint(body: any, field: string) {
  const { latitude, longitude } = body ?? {}
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw invalid(field === 'place' ? 'Pick a place on the map.' : 'Turn on your location first.', field)
  }
  return { latitude: latitude as number, longitude: longitude as number }
}

export interface Fix {
  latitude: number
  longitude: number
  accuracy: number
}

export function readFix(body: any): Fix {
  const point = readPoint(body, 'location')
  const { accuracy } = body ?? {}
  if (!Number.isFinite(accuracy) || accuracy < 0) throw invalid('Your location reading is incomplete.', 'location')
  return { ...point, accuracy }
}
