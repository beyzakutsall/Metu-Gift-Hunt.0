import { LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useForm } from '../../hooks/useForm'
import { authService } from '../../services/authService'
import { Brand } from '../auth/Brand'
import { Alert } from '../common/Alert'
import { Button } from '../common/Button'

export function StudentHeader() {
  const { user, setUser } = useAuth()
  const form = useForm({}, () => ({}), async () => {
    await authService.logout()
    setUser(null)
  })

  return (
    <header className="bg-mint">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-gutter py-3 sm:px-8">
        <Brand />
        <div className="flex min-w-0 items-center gap-3">
          <p className="hidden min-w-0 items-center gap-2 text-caption font-bold md:flex">
            <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-lilac font-display uppercase">
              {user?.username[0]}
            </span>
            <span className="truncate">{user?.username}</span>
          </p>
          <form onSubmit={form.submit}>
            <Button type="submit" variant="secondary" loading={form.busy} aria-label="Log out" className="min-w-12 px-3!">
              {!form.busy && <LogOut className="size-5" aria-hidden />}
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </form>
        </div>
      </div>
      {form.error && (
        <div className="mx-auto max-w-6xl px-gutter pb-3 sm:px-8">
          <Alert tone="error">{form.error}</Alert>
        </div>
      )}
    </header>
  )
}
