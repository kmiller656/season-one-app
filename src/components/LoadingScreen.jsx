import Spinner from './ui/Spinner'

export default function LoadingScreen({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-3 text-text-muted">
        <Spinner size={32} className="text-blue" />
        <p className="text-sm font-medium">{label}</p>
      </div>
    </div>
  )
}
