import { LoaderCircle, MapPinPlus, PackagePlus, Search } from 'lucide-react'
import { useLocation } from 'react-router'
import { Alert } from '../components/common/Alert'
import { Button, ButtonLink } from '../components/common/Button'
import { PageHeading } from '../components/common/PageHeading'
import { AllowanceCard } from '../components/student/AllowanceCard'
import { CollectionBooklet } from '../components/student/CollectionBooklet'
import { CollectionProgress } from '../components/student/CollectionProgress'
import { ResetCountdown } from '../components/student/ResetCountdown'
import { StudentHeader } from '../components/student/StudentHeader'
import { useAuth } from '../context/authState'
import { useStudentProfile } from '../hooks/useStudentProfile'
import type { Reward } from '../types/hunt'

export function StudentPage() {
  const { user } = useAuth()
  const { profile, error, loading, refresh } = useStudentProfile()
  const unlocked: Reward['item'] | undefined = useLocation().state?.unlocked
  const found = profile?.items.filter((item) => item.foundAt !== null).length ?? 0

  return (
    <div className="min-h-dvh">
      <StudentHeader />
      <main>
        <div className="rounded-b-card bg-mint">
          <div className="mx-auto grid max-w-6xl gap-5 px-gutter pt-4 pb-6 sm:px-8 lg:grid-cols-[1.1fr_2fr] lg:items-center lg:gap-10 lg:pb-8">
            <div className="min-w-0 break-words [&_p]:text-ink">
              <PageHeading title={`Hi, ${user?.username}`}>What will you discover today?</PageHeading>
              {profile && <CollectionProgress found={found} total={profile.items.length} />}
            </div>

            {profile && (
              <section aria-label="Today’s gift activity">
                <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                  <AllowanceCard tone="search" icon={Search} title="Gifts searched" verb="search" allowance={profile.searches} />
                  <AllowanceCard tone="hide" icon={PackagePlus} title="Gifts hidden" verb="hide" allowance={profile.hides} />
                </div>
                <div className="mt-3 grid gap-2.5 sm:grid-cols-2 sm:gap-4">
                  <ButtonLink to="/search">
                    <Search className="size-5" aria-hidden />
                    Find a gift
                  </ButtonLink>
                  <ButtonLink to="/hide" variant="secondary">
                    <MapPinPlus className="size-5" aria-hidden />
                    {profile.hides.today < profile.hides.limit ? 'Hide a gift on the map' : 'See your gifts on the map'}
                  </ButtonLink>
                </div>
                <div className="mt-2.5">
                  <ResetCountdown resetsAt={profile.resetsAt} />
                </div>
              </section>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-gutter py-8 sm:px-8">
          {error && (
            <div className="mb-5 space-y-3">
              <Alert tone="error">{error}</Alert>
              <Button variant="secondary" loading={loading} onClick={() => void refresh()} className="sm:w-auto!">
                Try again
              </Button>
            </div>
          )}
          {profile && <CollectionBooklet items={profile.items} highlight={unlocked} />}
          {!profile && !error && (
            <p role="status" className="flex items-center justify-center gap-2 py-16 text-ink-soft">
              <LoaderCircle className="size-5 animate-spin" aria-hidden />
              Opening your booklet…
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
