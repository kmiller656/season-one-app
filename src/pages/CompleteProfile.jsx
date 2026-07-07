import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Register from './Register'

// Reuses the register wizard (steps 2–3) for an already-authenticated PA
// whose profile is incomplete.
export default function CompleteProfile() {
  const { profileComplete, isAdmin } = useAuth()
  if (isAdmin || profileComplete) {
    return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />
  }
  return <Register completion />
}
