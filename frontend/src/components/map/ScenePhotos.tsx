import { Camera, CircleAlert, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { MATCH_EDGE, SCENE_PHOTOS } from '../../../../shared/huntRules'
import { preparePhoto } from '../../services/preparePhoto'

export interface ScenePhoto {
  preview: string
  base64: string
}

interface Props {
  photos: (ScenePhoto | null)[]
  error?: string
  disabled: boolean
  onChange: (photos: (ScenePhoto | null)[], error?: string) => void
}

const ANGLES = ['Straight on', 'A step to the left', 'A step to the right']

/** The hider's three photos of the spot. Finders' cameras are matched against them, and never see them. */
export function ScenePhotos({ photos, error, disabled, onChange }: Props) {
  const [preparing, setPreparing] = useState<number | null>(null)

  async function pick(index: number, file: File | undefined) {
    if (!file) return
    setPreparing(index)
    try {
      const next = [...photos]
      // The size the server matches at, so a weak signal doesn't carry pixels nobody uses.
      next[index] = await preparePhoto(file, MATCH_EDGE)
      onChange(next)
    } catch {
      onChange(photos, 'That photo couldn’t be read. Try again.')
    } finally {
      setPreparing(null)
    }
  }

  return (
    <fieldset id="photos" tabIndex={-1} aria-describedby="photos-message" className="min-w-0 focus:outline-none">
      <legend className="mb-1.5 text-caption font-bold">Photos of the spot ({SCENE_PHOTOS})</legend>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: SCENE_PHOTOS }, (_, index) => {
          const photo = photos[index]
          return (
            <label
              key={index}
              className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-control border-2 border-dashed border-edge text-center text-xs font-bold hover:bg-paper has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-forest"
            >
              {photo ? (
                <span className="relative size-full">
                  <img src={photo.preview} alt={`Photo ${index + 1}: ${ANGLES[index]}`} className="size-full object-cover" />
                  <span className="absolute right-1 bottom-1 flex items-center gap-1 rounded-full bg-ink/80 px-2 py-0.5 text-white">
                    <RotateCcw className="size-3" aria-hidden />
                    Retake
                  </span>
                </span>
              ) : (
                <>
                  <Camera className="size-5" aria-hidden />
                  {preparing === index ? 'Preparing…' : ANGLES[index]}
                </>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                disabled={disabled || preparing !== null}
                className="sr-only"
                onChange={(event) => {
                  void pick(index, event.target.files?.[0])
                  event.target.value = '' // so the same file can be picked again
                }}
              />
            </label>
          )
        })}
      </div>
      <p id="photos-message" className={`mt-1 flex gap-1.5 text-caption ${error ? 'text-danger' : 'text-ink-soft'}`}>
        {error && <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />}
        {error ||
          'Finders must point their camera at this spot. Include something distinctive, like a door number or a sign. No people in the photos.'}
      </p>
    </fieldset>
  )
}
