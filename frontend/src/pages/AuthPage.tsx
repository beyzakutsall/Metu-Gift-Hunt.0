import { Link, Outlet, useLocation } from 'react-router'

const modes = [
  { path: '/login', label: 'Log in' },
  { path: '/register', label: 'Register' },
]

export function AuthPage() {
  const { pathname } = useLocation()
  const registering = pathname.startsWith('/register')

  return (
    <>
      <nav aria-label="Log in or register" className="relative mb-6 grid grid-cols-2 rounded-control bg-mint p-1">
        <span
          aria-hidden
          className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-[0.65rem] bg-surface shadow-pill transition-transform duration-300 ${
            registering ? 'translate-x-full' : ''
          }`}
        />
        {modes.map(({ path, label }) => (
          <Link
            key={path}
            to={path}
            aria-current={pathname === path ? 'page' : undefined}
            className="relative flex min-h-11 items-center justify-center rounded-[0.65rem] text-caption font-bold"
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="overflow-x-clip [overflow-clip-margin:0.5rem]">
        <div key={pathname} className={registering ? 'animate-from-right' : 'animate-from-left'}>
          <Outlet />
        </div>
      </div>
      <p className="mt-4 text-center text-caption text-ink-soft">
        {registering ? 'Already have an account? ' : 'New to the adventure? '}
        <Link to={registering ? '/login' : '/register'} className="text-link inline-block py-2">
          {registering ? 'Log in' : 'Create an account'}
        </Link>
      </p>
    </>
  )
}
