import { Link } from 'react-router'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/login" className="inline-flex min-h-11 w-fit items-center gap-3 rounded-control font-display text-2xl font-bold">
      <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="size-10" />
      <span className={compact ? 'max-sm:sr-only' : undefined}>Campus Quest</span>
    </Link>
  )
}
