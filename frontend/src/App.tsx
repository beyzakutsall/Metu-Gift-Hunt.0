import { LoaderCircle } from 'lucide-react'
import { Navigate, Outlet, Route, Routes } from 'react-router'
import { AuthLayout } from './components/auth/AuthLayout'
import { LoginForm } from './components/auth/LoginForm'
import { RegisterForm } from './components/auth/RegisterForm'
import { useAuth } from './context/AuthContext'
import { AuthPage } from './pages/AuthPage'
import { ConfirmEmail } from './pages/ConfirmEmail'
import { EmailVerification } from './pages/EmailVerification'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import { Terms } from './pages/Terms'
import { StudentPage } from './pages/StudentPage'

function GuestOnly() {
  return useAuth().user ? <Navigate to="/student" replace /> : <Outlet />
}

function SignedInOnly() {
  return useAuth().user ? <Outlet /> : <Navigate to="/login" replace />
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
      </Route>
      <Route element={<AuthLayout />}>
        <Route element={<GuestOnly />}>
          <Route element={<AuthPage />}>
            <Route path="login" element={<LoginForm />} />
            <Route path="register" element={<RegisterForm />} />
          </Route>
        </Route>
        <Route path="verify-email" element={<EmailVerification />} />
        <Route path="verify-email/confirm" element={<ConfirmEmail />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="terms" element={<Terms />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Route>
    </Routes>
  )
}
