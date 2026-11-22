import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { CampusMapApi } from '../../types/map'
import { StudentHeader } from '../student/StudentHeader'
import { CampusMap } from './CampusMap'

interface Props {
  onMap: (map: CampusMapApi | null) => void
  overlay: ReactNode
  children: ReactNode
}

/** Map beside the panel on wide screens, above it on phones. */
export function MapPageLayout({ onMap, overlay, children }: Props) {
  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <StudentHeader />
      <main className="flex flex-1 flex-col lg:min-h-0 lg:flex-row">
        <div className="relative h-[52dvh] min-h-60 shrink-0 lg:h-auto lg:min-h-0 lg:min-w-0 lg:flex-1">
          <CampusMap onReady={onMap} />
          {overlay}
        </div>
        <div className="space-y-field bg-surface p-gutter sm:p-6 lg:w-96 lg:shrink-0 lg:overflow-y-auto lg:border-l lg:border-line">
          <Link to="/student" className="text-link inline-flex min-h-11 items-center gap-1.5 text-caption">
            <ArrowLeft className="size-4" aria-hidden />
            Back to my booklet
          </Link>
          {children}
        </div>
      </main>
    </div>
  )
}
