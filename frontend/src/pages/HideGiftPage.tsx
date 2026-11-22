import { useCallback, useEffect, useState } from 'react'
import { PLACE_PROBLEMS, roundCoordinate } from '../../../shared/giftRules'
import { Alert } from '../components/common/Alert'
import { Button } from '../components/common/Button'
import { PageHeading } from '../components/common/PageHeading'
import { HideGiftForm } from '../components/map/HideGiftForm'
import { MapPageLayout } from '../components/map/MapPageLayout'
import { MyGiftsList } from '../components/map/MyGiftsList'
import { ResetCountdown } from '../components/student/ResetCountdown'
import { useMyGifts } from '../hooks/useMyGifts'
import { useStudentProfile } from '../hooks/useStudentProfile'
import type { Gift } from '../types/gift'
import type { CampusMapApi, MapPoint } from '../types/map'

const pointOf = (gift: Gift) => ({ enlem: gift.latitude, boylam: gift.longitude })

export function HideGiftPage() {
  const { profile, error: profileError, loading, refresh } = useStudentProfile()
  const { gifts, error: giftsError, add, replace, refresh: refreshGifts } = useMyGifts()
  const [map, setMap] = useState<CampusMapApi | null>(null)
  const [place, setPlace] = useState<MapPoint | null>(null)
  const [placeError, setPlaceError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [justHidden, setJustHidden] = useState(false)

  const left = profile ? Math.max(0, profile.hides.limit - profile.hides.today) : undefined

  const choose = useCallback((point: MapPoint, problem: string | null) => {
    setJustHidden(false)
    setSelectedId(null)
    setPlaceError(problem ?? '')
    setPlace(problem ? null : { enlem: roundCoordinate(point.enlem), boylam: roundCoordinate(point.boylam) })
  }, [])

  useEffect(() => {
    if (!map) return
    const stopPlace = map.on('yer-secildi', (point) => {
      if (left) choose(point, PLACE_PROBLEMS[point.durum])
    })
    const stopGift = map.on('hediye-tiklandi', ({ id }) => {
      setSelectedId(id)
      document.querySelector(`[data-gift="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'nearest' })
    })
    return () => {
      stopPlace()
      stopGift()
    }
  }, [map, left, choose])

  useEffect(() => map?.hediyeleriGoster(gifts.map((gift) => ({ id: gift.id, ...pointOf(gift) }))), [map, gifts])
  useEffect(() => map?.yerIsaretle(place), [map, place])
  useEffect(() => map?.hediyeVurgula(selectedId), [map, selectedId])

  function pickBuilding(point: MapPoint) {
    if (!map) return
    map.odakla(point)
    choose(point, PLACE_PROBLEMS[map.yerDurumu(point.enlem, point.boylam)])
  }

  function showGift(gift: Gift) {
    setSelectedId(gift.id)
    map?.odakla(pointOf(gift))
  }

  function handleHidden(gift: Gift) {
    add(gift)
    setPlace(null)
    setPlaceError('')
    setSelectedId(gift.id)
    setJustHidden(true)
    void refresh()
  }

  const loadError = profileError || giftsError

  return (
    <MapPageLayout
      onMap={setMap}
      overlay={
        map && (
          // Repeats the panel's status, which is below the fold on a phone. The panel announces it.
          <p
            aria-hidden
            className={`pointer-events-none absolute top-2 left-2 max-w-[calc(100%-1rem)] rounded-control px-3 py-2 text-xs font-bold ${
              placeError ? 'bg-danger text-white' : place ? 'bg-sun text-ink' : 'bg-ink text-white'
            }`}
          >
            {placeError ||
              (place ? (
                'Place selected. Now add the clue and riddle.'
              ) : left === 0 ? (
                'Your hidden gifts'
              ) : (
                <>
                  Tap to choose a place
                  <span className="max-sm:hidden"> · drag to rotate · scroll or pinch to zoom · right-drag or two fingers to move</span>
                </>
              ))}
          </p>
        )
      }
    >
      <PageHeading title="Hide a gift">A surprise sticker goes inside. You set the place, the clue and the riddle.</PageHeading>

      {profile && (
        <p className="rounded-control bg-butter px-3 py-2 text-caption font-bold">
          {left} of {profile.hides.limit} gifts left to hide today
        </p>
      )}
      {justHidden && <Alert tone="success">Gift hidden! Every student has been notified.</Alert>}
      {loadError && (
        <div className="space-y-2">
          <Alert tone="error">{loadError}</Alert>
          <Button
            variant="secondary"
            loading={loading}
            onClick={() => {
              void refresh()
              void refreshGifts()
            }}
          >
            Try again
          </Button>
        </div>
      )}

      {profile &&
        (left ? (
          <HideGiftForm
            map={map}
            place={place}
            placeError={placeError}
            onPick={pickBuilding}
            onPlaceError={setPlaceError}
            onHidden={handleHidden}
            onLimit={() => {
              setPlace(null)
              void refresh()
            }}
          />
        ) : (
          <div className="space-y-2 rounded-control bg-paper p-3">
            <p className="text-caption font-bold">You’ve hidden all of today’s gifts.</p>
            <ResetCountdown resetsAt={profile.resetsAt} />
          </div>
        ))}

      <MyGiftsList gifts={gifts} selectedId={selectedId} onSelect={showGift} onChanged={replace} />
    </MapPageLayout>
  )
}
