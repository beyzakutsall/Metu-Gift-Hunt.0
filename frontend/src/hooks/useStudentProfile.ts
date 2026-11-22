import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { studentService } from '../services/studentService'
import { AuthError } from '../types/auth'
import type { StudentProfile } from '../types/student'

export function useStudentProfile() {
  const { setUser } = useAuth()
  const [profile, setProfile] = useState<StudentProfile>()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const latest = useRef(0)

  const refresh = useCallback(async () => {
    const id = ++latest.current
    setLoading(true)
    try {
      const next = await studentService.getProfile()
      if (id !== latest.current) return // a newer request owns the result
      setProfile(next)
      setError('')
    } catch (caught) {
      if (id !== latest.current) return
      if (caught instanceof AuthError && caught.code === 'UNAUTHENTICATED') setUser(null)
      else setError(caught instanceof AuthError ? caught.message : 'We couldn’t load your booklet.')
    } finally {
      if (id === latest.current) setLoading(false)
    }
  }, [setUser])

  useEffect(() => {
    void refresh()
    const onVisible = () => document.visibilityState === 'visible' && void refresh()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      latest.current++
    }
  }, [refresh])

  useEffect(() => {
    if (!profile) return
    // At least 30 seconds, so a wrong device clock can't cause a request loop.
    const wait = Math.max(30_000, Date.parse(profile.resetsAt) - Date.now() + 1000)
    const timer = setTimeout(() => void refresh(), wait)
    return () => clearTimeout(timer)
  }, [profile, refresh])

  return { profile, error, loading, refresh }
}
