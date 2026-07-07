export default function EmptyState({ title, message, action }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <h3 className="text-base">{title}</h3>
      {message && (
        <p className="max-w-sm text-sm text-text-muted">{message}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
