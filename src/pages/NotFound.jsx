import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function NotFound() {
  const { user } = useAuth()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
      <p className="text-6xl font-extrabold tracking-headline text-navy">404</p>
      <p className="text-text-muted">We couldn’t find that page.</p>
      <Link to={user ? '/dashboard' : '/login'} className="btn-primary">
        {user ? 'Go to dashboard' : 'Go to login'}
      </Link>
    </div>
  )
}
