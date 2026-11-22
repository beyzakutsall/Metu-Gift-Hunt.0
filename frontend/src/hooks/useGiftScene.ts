import { useEffect, useRef, useState } from 'react'
import type { GiftScene } from '../components/discovery/giftScene'
import { collectionAsset } from '../services/collectionAssets'

/** `loading` until the model is ready, `failed` when the still preview has to stand in. */
export type SceneStatus = 'loading' | 'ready' | 'failed'

export function useGiftScene(itemId: number, wrapped: boolean) {
  const host = useRef<HTMLDivElement>(null)
  const scene = useRef<GiftScene>(null)
  const [status, setStatus] = useState<SceneStatus>('loading')
  const [openRequested, setOpenRequested] = useState(false)
  const [opened, setOpened] = useState(!wrapped)

  useEffect(() => {
    let active = true
    function fail() {
      if (!active) return
      scene.current?.dispose()
      scene.current = null
      setStatus('failed')
    }

    async function start() {
      // three.js downloads only when someone looks at a gift.
      const { createGiftScene } = await import('../components/discovery/giftScene')
      if (!active) return
      const created = createGiftScene(host.current!, {
        wrapped,
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        onOpened: () => setOpened(true),
        onLost: fail,
      })
      scene.current = created
      await created.load(collectionAsset(itemId, 'model'))
      if (active && scene.current) setStatus('ready')
    }
    start().catch((error: unknown) => {
      if (!active) return
      console.warn('Showing the still preview instead of 3D:', error)
      fail()
    })

    return () => {
      active = false
      scene.current?.dispose()
      scene.current = null
    }
  }, [itemId, wrapped])

  useEffect(() => {
    if (!openRequested) return
    if (status === 'ready') scene.current?.open()
    if (status === 'failed') setOpened(true)
  }, [openRequested, status])

  return { host, scene, status, opened, opening: openRequested && !opened, open: () => setOpenRequested(true) }
}
