import { Outlet } from 'react-router'
import { Brand } from './Brand'
import { CampusIllustration } from './CampusIllustration'

export function AuthLayout() {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-2">
      <aside aria-label="About Campus Quest" className="bg-mint">
        {/* desktop */}
        <div className="sticky top-0 hidden min-h-dvh flex-col justify-between gap-6 p-8 lg:flex xl:px-14 xl:py-10">
          <Brand />
          <CampusIllustration className="mx-auto max-h-[42dvh] w-full max-w-xl" />
          <div>
            <p className="font-display text-hero font-bold">
              Explore your campus.
              <br />
              Discover surprises.
              <br />
              <span className="text-forest">Build your collection.</span>
            </p>
            <p className="mt-4 max-w-md text-ink-soft xl:text-lg">
              A campus adventure for METU students. Find hidden gifts, fill your book and leave a little something for
              the next explorer.
            </p>
          </div>
        </div>

        {/* mobile */}
        <div className="px-gutter pt-4 pb-10 lg:hidden">
          <div className="mx-auto max-w-md">
            <Brand />
            <div className="mt-2 flex items-center gap-2">
              <p className="flex-1 font-display text-lg leading-snug font-bold">
                Explore your campus. Discover surprises. <span className="text-forest">Build your collection.</span>
              </p>
              <CampusIllustration className="w-24 shrink-0 min-[375px]:w-32" />
            </div>
          </div>
        </div>
      </aside>

      <main className="relative -mt-6 flex justify-center rounded-t-card bg-paper px-gutter py-6 lg:mt-0 lg:min-h-dvh lg:items-center lg:rounded-none lg:p-8">
        <div className="w-full max-w-md rounded-card border border-line bg-surface p-5 shadow-card sm:p-card">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
