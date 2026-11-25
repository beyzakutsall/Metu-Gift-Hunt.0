import { useEffect, useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router'

export function PageHeading({ title, children }: { title: string; children?: ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null)
  const { key } = useLocation()

  useEffect(() => {
    document.title = `${title} · METU Gift Hunt`
  }, [title])

  useEffect(() => {
    // After client-side navigation, not on first load.
    if (key !== 'default') heading.current?.focus()
  }, [key])

  return (
    <div className="mb-5">
      <h1 ref={heading} tabIndex={-1} className="text-title">
        {title}
      </h1>
      {children && <p className="mt-1.5 text-ink-soft">{children}</p>}
    </div>
  )
}
