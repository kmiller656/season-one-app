import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import AuthLayout from '../components/layout/AuthLayout'
import Field from '../components/ui/Field'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function Login() {
  const { signIn, resetPassword } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [mode, setMode] = useState('signin') // 'signin' | 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const from = location.state?.from?.pathname

  const handleSignIn = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const data = await signIn(email.trim(), password)
      const { data: prof } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()
      toast.success('Welcome back')
      const home =
        prof?.role === 'admin'
          ? '/admin'
          : prof?.role === 'recruiter'
            ? '/recruiters/search'
            : from || '/dashboard'
      navigate(home, { replace: true })
    } catch (err) {
      toast.error(err.message || 'Sign in failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await resetPassword(email.trim())
      toast.success('Check your email for a reset link')
      setMode('signin')
    } catch (err) {
      toast.error(err.message || 'Could not send reset email')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="card card-pad">
        {mode === 'signin' ? (
          <>
            <h1 className="text-xl">Sign in</h1>
            <p className="mt-1 text-sm text-text-muted">
              Access your Season One opportunities.
            </p>
            <form onSubmit={handleSignIn} className="mt-6 space-y-4">
              <Field label="Email" htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </Field>
              <Field label="Password" htmlFor="password">
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </Field>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setMode('reset')}
                  className="link text-sm"
                >
                  Forgot password?
                </button>
              </div>
              <Button type="submit" block loading={submitting}>
                Sign in
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-text-muted">
              New to Season One?{' '}
              <Link to="/register" className="link">
                Create an account
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl">Reset password</h1>
            <p className="mt-1 text-sm text-text-muted">
              Enter your email and we’ll send a reset link.
            </p>
            <form onSubmit={handleReset} className="mt-6 space-y-4">
              <Field label="Email" htmlFor="reset-email">
                <Input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </Field>
              <Button type="submit" block loading={submitting}>
                Send reset link
              </Button>
            </form>
            <p className="mt-6 text-center text-sm">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="link"
              >
                Back to sign in
              </button>
            </p>
          </>
        )}
      </div>
    </AuthLayout>
  )
}
