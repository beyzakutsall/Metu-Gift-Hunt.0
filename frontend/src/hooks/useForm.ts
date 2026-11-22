import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AuthError } from '../types/auth'

type Errors<T> = Partial<Record<keyof T, string>>

export function useForm<T extends object>(
  initial: T,
  validate: (values: T) => Errors<T>,
  onSubmit: (values: T) => Promise<void>,
) {
  const [values, setValues] = useState(initial)
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({})
  const [serverErrors, setServerErrors] = useState<Errors<T>>({})
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inFlight = useRef(false) // state alone updates too late to stop a double submit
  const pointerDown = useRef(false)
  const focusNext = useRef('')

  useEffect(() => {
    const down = () => (pointerDown.current = true)
    const up = () => (pointerDown.current = false)
    document.addEventListener('pointerdown', down, true)
    document.addEventListener('pointerup', up, true)
    document.addEventListener('pointercancel', up, true)
    return () => {
      document.removeEventListener('pointerdown', down, true)
      document.removeEventListener('pointerup', up, true)
      document.removeEventListener('pointercancel', up, true)
    }
  }, [])

  useEffect(() => {
    if (!focusNext.current) return
    document.getElementById(focusNext.current)?.focus()
    focusNext.current = ''
  })

  const validation = validate(values)

  function set<K extends keyof T>(name: K, value: T[K]) {
    setValues((previous) => ({ ...previous, [name]: value }))
    setServerErrors((previous) => ({ ...previous, [name]: undefined }))
    setError('')
  }

  function touch(name: keyof T) {
    if (!values[name]) return
    const show = () => setTouched((previous) => ({ ...previous, [name]: true }))
    // An error appearing on mousedown would push the clicked button away before mouseup,
    // swallowing the click. So wait for the pointer to be released.
    if (pointerDown.current) document.addEventListener('pointerup', () => setTimeout(show), { once: true })
    else show()
  }

  function errorFor(name: keyof T): string | undefined {
    return serverErrors[name] ?? (submitted || touched[name] ? validation[name] : undefined)
  }

  function field(name: keyof T & string) {
    return {
      id: name,
      name,
      value: String(values[name]),
      error: errorFor(name),
      readOnly: busy,
      onChange: (event: { target: { value: string } }) => set(name, event.target.value as T[typeof name]),
      onBlur: () => touch(name),
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (inFlight.current) return
    setSubmitted(true)
    setError('')

    const firstInvalid = Object.entries(validation).find(([, message]) => message)?.[0]
    if (firstInvalid) {
      focusNext.current = firstInvalid
      return
    }

    inFlight.current = true
    setBusy(true)
    try {
      await onSubmit(values)
    } catch (caught) {
      if (caught instanceof AuthError && caught.field && caught.field in values) {
        const name = caught.field
        setServerErrors({ [name]: caught.message } as Errors<T>)
        focusNext.current = name
      } else {
        setError(caught instanceof AuthError ? caught.message : 'Something went wrong. Please try again.')
      }
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  return { values, set, field, errorFor, submit, busy, error }
}
