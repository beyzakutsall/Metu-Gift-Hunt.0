import { Link } from 'react-router'

export function Brand() {
  return (
    <Link to="/login" className="inline-flex min-h-11 w-fit items-center gap-3 rounded-control font-display text-2xl font-bold">
      <img src="/favicon.svg" alt="" className="size-10" />
      Campus Quest
    </Link>
  )
}
