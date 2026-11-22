import { LoaderCircle, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import type { useGiftScene } from '../../hooks/useGiftScene'
import { collectionAsset } from '../../services/collectionAssets'
import type { FoundItem } from '../../types/student'

const control = 'grid size-11 place-items-center rounded-full border border-edge bg-surface transition hover:bg-mint'
const STEP = 0.25
const TURNS: Record<string, [number, number]> = {
  ArrowLeft: [-STEP, 0],
  ArrowRight: [STEP, 0],
  ArrowUp: [0, STEP],
  ArrowDown: [0, -STEP],
}

export function GiftStage({ item, gift }: { item: FoundItem; gift: ReturnType<typeof useGiftScene> }) {
  const { host, scene, status, opened } = gift
  const flat = status === 'failed'
  const explorable = opened && status === 'ready'

  function onKeyDown(event: KeyboardEvent) {
    if (!explorable) return
    const turn = TURNS[event.key]
    if (turn) scene.current?.turn(...turn)
    else if (event.key === '+' || event.key === '=') scene.current?.zoom(0.8)
    else if (event.key === '-') scene.current?.zoom(1.25)
    else return
    event.preventDefault()
  }

  return (
    <div className="gift-stage relative min-h-0 overflow-hidden bg-linear-to-b from-butter to-mint">
      <div
        ref={host}
        data-state={status}
        {...(explorable
          ? { role: 'application', tabIndex: 0, 'aria-label': `${item.name} in 3D. Arrow keys turn it, plus and minus zoom.`, onKeyDown }
          : {})}
        className="absolute inset-0 cursor-grab active:cursor-grabbing focus-visible:-outline-offset-4"
      />

      {flat &&
        (opened ? (
          <>
            <img src={collectionAsset(item.id, 'preview')} alt={item.name} className="absolute inset-0 size-full object-contain p-6" />
            <p role="status" className="absolute inset-x-0 bottom-2 text-center text-caption">
              3D couldn’t load, so here’s a picture.
            </p>
          </>
        ) : (
          <span aria-hidden className="absolute inset-0 grid place-items-center text-8xl">🎁</span>
        ))}

      {status === 'loading' && opened && (
        <p role="status" className="absolute inset-0 flex items-center justify-center gap-2 text-caption">
          <LoaderCircle className="size-5 animate-spin" aria-hidden />
          Loading 3D…
        </p>
      )}

      {explorable && (
        <>
          <p className="pointer-events-none absolute top-3 left-3 rounded-full bg-surface/90 px-3 py-1.5 text-xs font-bold">
            Drag to turn<span className="max-sm:hidden"> · pinch or scroll to zoom</span>
          </p>
          <div className="absolute right-3 bottom-3 flex gap-2">
            <button type="button" aria-label="Zoom in" onClick={() => scene.current?.zoom(0.8)} className={control}>
              <ZoomIn className="size-5" aria-hidden />
            </button>
            <button type="button" aria-label="Zoom out" onClick={() => scene.current?.zoom(1.25)} className={control}>
              <ZoomOut className="size-5" aria-hidden />
            </button>
            <button type="button" aria-label="Reset view" onClick={() => scene.current?.reset()} className={control}>
              <RotateCcw className="size-5" aria-hidden />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
