import { LoaderCircle } from 'lucide-react'
import { Navigate, Outlet, Route, Routes } from 'react-router'
import { AuthLayout } from './components/auth/AuthLayout'
import { LoginForm } from './components/auth/LoginForm'
import { RegisterForm } from './components/auth/RegisterForm'
import { NotificationToast } from './components/notifications/NotificationToast'
import { useAuth } from './context/authState'
import { NotificationsProvider } from './context/NotificationsContext'
import { AuthPage } from './pages/AuthPage'
import { ForgotPassword } from './pages/ForgotPassword'
import { HideGiftPage } from './pages/HideGiftPage'
import { ResetPassword } from './pages/ResetPassword'
import { Terms } from './pages/Terms'
import { SearchPage } from './pages/SearchPage'
import { StudentPage } from './pages/StudentPage'

function GuestOnly() {
  return useAuth().user ? <Navigate to="/student" replace /> : <Outlet />
}

function SignedInOnly() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return (
    <NotificationsProvider key={user.id}>
      <NotificationToast />
      <Outlet />
    </NotificationsProvider>
  )
}

export function App() {
  if (useAuth().loading) {
    return (
      <div role="status" className="grid min-h-dvh place-items-center">
        <LoaderCircle className="size-8 animate-spin text-forest" aria-hidden />
        <span className="sr-only">Loading Campus Quest</span>
      </div>
    )
  }

  return (
    <Routes>
      <Route element={<SignedInOnly />}>
        <Route path="student" element={<StudentPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="hide" element={<HideGiftPage />} />
      </Route>
      <Route element={<AuthLayout />}>
        <Route element={<GuestOnly />}>
          <Route element={<AuthPage />}>
            <Route path="login" element={<LoginForm />} />
            <Route path="register" element={<RegisterForm />} />
          </Route>
        </Route>
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="terms" element={<Terms />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Route>
    </Routes>
  )
}
