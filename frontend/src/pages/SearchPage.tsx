import { useCallback, useEffect, useState } from 'react'
import { Alert } from '../components/common/Alert'
import { Button } from '../components/common/Button'
import { PageHeading } from '../components/common/PageHeading'
import { ActiveHunt } from '../components/hunt/ActiveHunt'
import { RewardCard } from '../components/hunt/RewardCard'
import { StartHunt } from '../components/hunt/StartHunt'
import { MapPageLayout } from '../components/map/MapPageLayout'
import { useCheckIn } from '../hooks/useCheckIn'
import { useGeolocation } from '../hooks/useGeolocation'
import { useHunt } from '../hooks/useHunt'
import { useStudentProfile } from '../hooks/useStudentProfile'
import type { Reward } from '../types/hunt'
import type { CampusMapApi } from '../types/map'

export function SearchPage() {
  const { profile, error: profileError, loading, refresh: refreshProfile } = useStudentProfile()
  const { hunt, available, loaded, error: huntError, update, refresh: refreshHunt } = useHunt()
  const geo = useGeolocation()
  const [map, setMap] = useState<CampusMapApi | null>(null)
  const [reward, setReward] = useState<Reward | null>(null)
  const [endedMessage, setEndedMessage] = useState('')

  const refresh = useCallback(() => {
    void refreshHunt()
    void refreshProfile()
  }, [refreshHunt, refreshProfile])

  const endHunt = useCallback(
    (message: string) => {
      update(null)
      setEndedMessage(message)
      refresh()
    },
    [update, refresh],
  )
  const huntLost = useCallback(() => endHunt('This hunt has ended. Start a new search.'), [endHunt])
  const { result, error: checkInError } = useCheckIn(hunt, geo.fix, update, huntLost)

  // By value: a refreshed but identical hunt shouldn't move the camera.
  const targetKey = hunt?.location.key
  const latitude = hunt?.location.latitude
  const longitude = hunt?.location.longitude
  const arrived = hunt?.arrived
  useEffect(() => {
    if (!map) return
    map.hedefGoster(targetKey ?? null)
    // Again on arrival: by then the camera has usually followed the student somewhere else.
    if (targetKey) map.odakla({ enlem: latitude!, boylam: longitude! })
  }, [map, targetKey, latitude, longitude, arrived])

  useEffect(() => {
    if (!map || !geo.fix) return
    map.gpsKonumu({ enlem: geo.fix.latitude, boylam: geo.fix.longitude, dogruluk: geo.fix.accuracy })
  }, [map, geo.fix])

  const error = profileError || huntError

  function status() {
    if (reward) return { text: 'Gift found!', style: 'bg-sun text-ink' }
    if (!hunt) return { text: 'Campus map', style: 'bg-ink text-white' }
    if (hunt.arrived) return { text: 'You’re here! Read the clue below.', style: 'bg-sun text-ink' }
    const togo = geo.fix && result?.accurate && result.distance ? ` · ${result.distance} m` : ''
    return { text: `Go to ${hunt.location.name}${togo}`, style: 'bg-ink text-white' }
  }
  const { text, style } = status()

  return (
    <MapPageLayout
      onMap={setMap}
      overlay={
        map && (
          <p aria-hidden className={`pointer-events-none absolute top-2 left-2 max-w-[calc(100%-1rem)] rounded-control px-3 py-2 text-xs font-bold ${style}`}>
            {text}
          </p>
        )
      }
    >
      <PageHeading title="Find a gift">Somebody hid a sticker for you to discover.</PageHeading>
      {endedMessage && <Alert tone="error">{endedMessage}</Alert>}
      {error && (
        <div className="space-y-2">
          <Alert tone="error">{error}</Alert>
          <Button variant="secondary" loading={loading} onClick={refresh}>Try again</Button>
        </div>
      )}

      {reward ? (
        <RewardCard
          reward={reward}
          onAgain={() => {
            setReward(null)
            refresh()
          }}
        />
      ) : hunt ? (
        <ActiveHunt
          hunt={hunt}
          map={map}
          geo={geo}
          result={result}
          error={checkInError}
          onChanged={() => void refreshHunt()}
          onEnded={endHunt}
          onSolved={(next) => {
            setEndedMessage('')
            setReward(next)
            update(null)
            void refreshProfile()
          }}
        />
      ) : (
        loaded &&
        profile && (
          <StartHunt
            profile={profile}
            available={available}
            onStale={refresh}
            onStarted={(next) => {
              setEndedMessage('')
              update(next)
              void refreshProfile()
            }}
          />
        )
      )}
      {!error && (!loaded || !profile) && (
        <p role="status" className="text-caption text-ink-soft">Loading…</p>
      )}
    </MapPageLayout>
  )
}
