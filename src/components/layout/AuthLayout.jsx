import Logo from '../ui/Logo'
import { MARKETING_SITE } from '../../lib/constants'

export default function AuthLayout({ children, wide = false }) {
  return (
    <div className="flex min-h-screen flex-col bg-navy">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className={`w-full ${wide ? 'max-w-xl' : 'max-w-md'}`}>
          <div className="mb-6 flex justify-center">
            <a href={MARKETING_SITE} aria-label="Back to seasononehealthcare.com">
              <Logo dark />
            </a>
          </div>
          {children}
          <p className="mt-6 text-center text-sm">
            <a href={MARKETING_SITE} className="text-white/50 hover:text-white/80">
              &larr; Back to seasononehealthcare.com
            </a>
          </p>
        </div>
      </div>
      <footer className="pb-6 text-center text-xs text-white/40">
        © {new Date().getFullYear()} Season One Healthcare
      </footer>
    </div>
  )
}
