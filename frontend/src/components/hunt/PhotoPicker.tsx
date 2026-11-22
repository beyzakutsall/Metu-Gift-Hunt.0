import { Camera, CircleAlert } from 'lucide-react'
import { useState } from 'react'
import { preparePhoto } from '../../services/preparePhoto'

export interface PreparedPhoto {
  preview: string
  base64: string
}

interface Props {
  photo: PreparedPhoto | null
  error?: string
  disabled: boolean
  onChange: (photo: PreparedPhoto | null, error?: string) => void
}

export function PhotoPicker({ photo, error, disabled, onChange }: Props) {
  const [preparing, setPreparing] = useState(false)

  async function pick(file: File | undefined) {
    if (!file) return
    setPreparing(true)
    try {
      onChange(await preparePhoto(file))
    } catch {
      onChange(null, 'That photo couldn’t be read. Try another one.')
    } finally {
      setPreparing(false)
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-caption font-bold">Photo proof</p>
      {photo && <img src={photo.preview} alt="Your photo, ready to send" className="mb-2 max-h-56 w-full rounded-control object-cover" />}
      <label className="flex min-h-touch cursor-pointer items-center justify-center gap-2 rounded-control border-2 border-dashed border-edge px-3 text-caption font-bold hover:bg-paper has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-forest">
        <Camera className="size-5" aria-hidden />
        {preparing ? 'Preparing…' : photo ? 'Retake photo' : 'Take a photo of the place'}
        <input
          id="photo"
          type="file"
          accept="image/*"
          capture="environment"
          disabled={disabled || preparing}
          aria-invalid={Boolean(error)}
          aria-describedby="photo-message"
          className="sr-only"
          onChange={(event) => {
            void pick(event.target.files?.[0])
            event.target.value = '' // so the same file can be picked again
          }}
        />
      </label>
      <p id="photo-message" className={`mt-1 flex gap-1.5 text-caption ${error ? 'text-danger' : 'text-ink-soft'}`}>
        {error && <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />}
        {error || 'The student who hid the gift will see it. Avoid photographing people’s faces.'}
      </p>
    </div>
  )
}
