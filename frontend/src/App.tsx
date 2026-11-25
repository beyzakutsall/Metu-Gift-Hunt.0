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
import { VerifyEmail } from './pages/VerifyEmail'
import { Terms } from './pages/Terms'
import { SearchPage } from './pages/SearchPage'
import { StudentPage } from './pages/StudentPage'

function GuestOnly() {
  const { user } = useAuth()
  if (user) return <Navigate to={user.verified ? '/student' : '/verify-email'} replace />
  return <Outlet />
}

function UnverifiedOnly() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.verified) return <Navigate to="/student" replace />
  return <Outlet />
}

function SignedInOnly() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!user.verified) return <Navigate to="/verify-email" replace />
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
        <span className="sr-only">Loading METU Gift Hunt</span>
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
        <Route element={<UnverifiedOnly />}>
          <Route path="verify-email" element={<VerifyEmail />} />
        </Route>
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="terms" element={<Terms />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Route>
    </Routes>
  )
}
