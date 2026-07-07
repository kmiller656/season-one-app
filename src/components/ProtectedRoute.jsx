import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingScreen from './LoadingScreen'

// Gate for all /dashboard routes.
export default function ProtectedRoute({ children }) {
  const { user, loading, profileLoading, profile, profileComplete, isAdmin } =
    useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  // Wait for the profile to resolve before deciding on completeness,
  // otherwise a freshly signed-in user can flash the completion screen.
  if (profileLoading && !profile) return <LoadingScreen />

  // PAs with an unfinished profile are sent to finish step 2.
  if (
    !profileComplete &&
    !isAdmin &&
    location.pathname !== '/complete-profile'
  ) {
    return <Navigate to="/complete-profile" replace />
  }

  return children
}
