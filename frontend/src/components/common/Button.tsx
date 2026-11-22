import { LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router'

const base =
  'inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-control px-5 py-3 font-bold transition duration-200'
const variants = {
  primary: 'bg-coral text-white shadow-button hover:-translate-y-0.5 hover:bg-coral-deep active:translate-y-0.5',
  secondary: 'border border-edge bg-surface text-ink hover:bg-mint/50',
}
type Variant = keyof typeof variants

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
}

export function Button({ variant = 'primary', loading, children, className = '', onClick, ...props }: Props) {
  return (
    <button
      type="button"
      {...props}
      // aria-disabled rather than disabled, so keyboard focus isn't lost while loading.
      aria-disabled={loading || undefined}
      onClick={(event) => (loading ? event.preventDefault() : onClick?.(event))}
      className={`${base} ${variants[variant]} aria-disabled:cursor-wait ${className}`}
    >
      {loading && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

export function ButtonLink({ variant = 'primary', className = '', ...props }: LinkProps & { variant?: Variant }) {
  return <Link {...props} className={`${base} ${variants[variant]} ${className}`} />
}
