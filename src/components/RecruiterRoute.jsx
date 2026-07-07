import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingScreen from './LoadingScreen'

// Gate for all /recruiters routes. Admins get in too, mirroring Search.js's
// original "admin accounts get unlimited access" behavior.
export default function RecruiterRoute({ children }) {
  const { user, loading, profile, profileLoading, isAdmin } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (profileLoading && !profile) return <LoadingScreen />
  if (profile?.role !== 'recruiter' && !isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
