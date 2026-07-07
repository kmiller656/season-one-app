import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { MARKETING_SITE } from '../lib/constants'
import LoadingScreen from '../components/LoadingScreen'

// "/" — logged-out visitors go to the marketing site; logged-in users
// go to the appropriate home.
export default function LandingRedirect() {
  const { user, loading, profile, isAdmin } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      window.location.replace(MARKETING_SITE)
    }
  }, [loading, user])

  if (loading) return <LoadingScreen />
  if (user) {
    const home = isAdmin
      ? '/admin'
      : profile?.role === 'recruiter'
        ? '/recruiters/search'
        : '/dashboard'
    return <Navigate to={home} replace />
  }
  return <LoadingScreen label="Redirecting…" />
}
