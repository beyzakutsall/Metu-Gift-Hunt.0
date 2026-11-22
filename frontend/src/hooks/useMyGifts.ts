import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/authState'
import { giftService } from '../services/giftService'
import { AuthError } from '../types/auth'
import type { Gift } from '../types/gift'

export function useMyGifts() {
  const { setUser } = useAuth()
  const [gifts, setGifts] = useState<Gift[]>([])
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      setGifts(await giftService.listMine())
      setError('')
    } catch (caught) {
      if (caught instanceof AuthError && caught.code === 'UNAUTHENTICATED') setUser(null)
      else setError('We couldn’t load the gifts you’ve hidden.')
    }
  }, [setUser])

  useEffect(() => void refresh(), [refresh])

  const add = useCallback((gift: Gift) => setGifts((previous) => [gift, ...previous.filter((g) => g.id !== gift.id)]), [])
  const replace = useCallback((gift: Gift) => setGifts((previous) => previous.map((g) => (g.id === gift.id ? gift : g))), [])
  return { gifts, error, add, replace, refresh }
}
