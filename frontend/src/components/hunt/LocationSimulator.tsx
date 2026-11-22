import type { Fix, Hunt } from '../../types/hunt'
import { Button } from '../common/Button'

interface Props {
  hunt: Hunt
  onSimulate: (fix: Fix) => void
}

/** Development builds only, for testing a hunt from a desk. Production builds don't contain it. */
export function LocationSimulator({ hunt, onSimulate }: Props) {
  const { latitude, longitude } = hunt.location
  return (
    <details className="rounded-control border border-dashed border-edge p-3 text-caption">
      <summary className="min-h-6 cursor-pointer font-bold">Test mode: simulate GPS</summary>
      <p className="my-2">For development only.</p>
      <div className="space-y-2">
        <Button variant="secondary" onClick={() => onSimulate({ latitude: latitude - 0.003, longitude, accuracy: 10 })}>
          Stand 300 m away
        </Button>
        <Button variant="secondary" onClick={() => onSimulate({ latitude, longitude, accuracy: 10 })}>
          Walk to the building
        </Button>
      </div>
    </details>
  )
}
