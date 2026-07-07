import Logo from './ui/Logo'

// Rendered when the Supabase env vars are missing, so the app fails
// gracefully with instructions instead of a blank white screen.
export default function ConfigError() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy p-6">
      <div className="card card-pad w-full max-w-lg">
        <Logo />
        <h1 className="mt-5 text-xl">Supabase isn’t configured yet</h1>
        <p className="mt-2 text-sm text-text-mid">
          The app can’t reach a backend because these environment variables are
          missing:
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          <li>
            <code className="rounded bg-surface px-1.5 py-0.5 text-blue-dark">
              VITE_SUPABASE_URL
            </code>
          </li>
          <li>
            <code className="rounded bg-surface px-1.5 py-0.5 text-blue-dark">
              VITE_SUPABASE_ANON_KEY
            </code>
          </li>
        </ul>
        <p className="mt-4 text-sm text-text-muted">
          Add them to your <code>.env</code> file (see <code>.env.example</code>)
          and restart the dev server. You’ll find both values in your Supabase
          project under <strong>Settings → API</strong>.
        </p>
      </div>
    </div>
  )
}
