import { NavLink, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import Logo from '../ui/Logo'

const I = (props) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  />
)

const icons = {
  dashboard: (
    <I>
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </I>
  ),
  opportunities: (
    <I>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </I>
  ),
  contracts: (
    <I>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M9 13h6M9 17h6" />
    </I>
  ),
  directHire: (
    <I>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="m16 11 2 2 4-4" />
    </I>
  ),
  locum: (
    <I>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </I>
  ),
  profile: (
    <I>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </I>
  ),
  team: (
    <I>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </I>
  ),
  admin: (
    <I>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </I>
  ),
  facilities: (
    <I>
      <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
      <path d="M9 9v.01M9 13v.01M9 17v.01" />
    </I>
  ),
}

const paNav = [
  { to: '/dashboard', label: 'Dashboard', icon: icons.dashboard, end: true },
  { to: '/dashboard/opportunities', label: 'Opportunities', icon: icons.opportunities },
  { to: '/dashboard/contracts', label: 'Contracts', icon: icons.contracts },
  { to: '/dashboard/direct-hire', label: 'Direct Hire', icon: icons.directHire },
  { to: '/dashboard/locum', label: 'Locum Work', icon: icons.locum },
  { to: '/dashboard/profile', label: 'My Profile', icon: icons.profile },
  { to: '/dashboard/team', label: 'My Team', icon: icons.team },
]

const adminNav = [
  { to: '/admin', label: 'Overview', icon: icons.dashboard, end: true },
  { to: '/admin/opportunities', label: 'Opportunities', icon: icons.opportunities },
  { to: '/admin/facilities', label: 'Facilities', icon: icons.facilities },
]

// The recruiter section is its own self-contained shell (see
// /recruiters/*), so these just link out to it rather than rendering
// inside DashboardLayout.
const recruiterAdminNav = [
  { to: '/admin/recruiters', label: 'Recruiter Subscribers', icon: icons.team },
  { to: '/admin/recruiters/metrics', label: 'Recruiter Metrics', icon: icons.dashboard },
]

function navClass({ isActive }) {
  return [
    'flex items-center gap-3 rounded-btn px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-blue text-white'
      : 'text-white/70 hover:bg-white/10 hover:text-white',
  ].join(' ')
}

export default function Sidebar({ onNavigate }) {
  const { profile, user, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Signed out')
      navigate('/login')
    } catch (e) {
      toast.error('Could not sign out')
    }
  }

  const displayName = profile?.full_name || user?.email || 'My account'

  return (
    <div className="flex h-full flex-col bg-navy">
      <div className="px-5 py-5">
        <Logo dark />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {paNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={navClass}
            onClick={onNavigate}
          >
            <span className="text-white/90">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <p className="px-3 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-wider text-white/40">
              Admin
            </p>
            {adminNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={navClass}
                onClick={onNavigate}
              >
                <span className="text-white/90">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
            <p className="px-3 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-wider text-white/40">
              Recruiters
            </p>
            {recruiterAdminNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={navClass}
                onClick={onNavigate}
              >
                <span className="text-white/90">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue/20 text-sm font-bold text-white">
            {(displayName[0] || 'U').toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {displayName}
            </p>
            <p className="truncate text-xs text-white/50">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="mt-1 flex w-full items-center gap-3 rounded-btn px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          Sign out
        </button>
      </div>
    </div>
  )
}
