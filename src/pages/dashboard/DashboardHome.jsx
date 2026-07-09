import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useMatches } from '../../hooks/useMatches'
import { timeAgo } from '../../lib/format'
import OpportunityCard from '../../components/OpportunityCard'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

export default function DashboardHome() {
  const { profile } = useAuth()
  const { matches, loading, updateStatus } = useMatches()
  const [dismissed, setDismissed] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const firstName = (profile?.full_name || '').split(' ')[0]
  const newest = matches[0]
  const latest = matches.slice(0, 8)

  const handleStatus = async (match, status) => {
    setBusyId(match.id)
    try {
      await updateStatus(match.id, status)
      toast.success(
        status === 'interested' ? 'Marked as interested' : 'Marked as not for me'
      )
    } catch (e) {
      toast.error('Could not update — please try again')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={28} className="text-blue" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl">
          Welcome back{firstName ? `, ${firstName}` : ''} 👋
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Here’s what’s happening with your opportunities.
        </p>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg">Your matches</h2>
        {matches.length > 0 && (
          <Link to="/dashboard/opportunities" className="link text-sm">
            View all ({matches.length}) →
          </Link>
        )}
      </div>

      {matches.length === 0 ? (
        <EmptyState
          title="No matches yet"
          message="As soon as a role matching your specialty is posted, it’ll show up here."
        />
      ) : (
        <div className="space-y-3">
          {latest.map((m) => (
            <OpportunityCard
              key={m.id}
              match={m}
              expanded={expandedId === m.id}
              onToggle={() =>
                setExpandedId((id) => (id === m.id ? null : m.id))
              }
              onStatus={(status) => handleStatus(m, status)}
              busy={busyId === m.id}
            />
          ))}
        </div>
      )}

      {/* Floating notification */}
      {newest && !dismissed && (
        <div className="fixed bottom-4 right-4 z-40 w-[calc(100%-2rem)] max-w-xs animate-in">
          <div className="card card-pad shadow-float">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="badge bg-blue text-white">New match</span>
                <span className="text-xs text-text-muted">
                  {timeAgo(newest.created_at)}
                </span>
              </div>
              <button
                onClick={() => setDismissed(true)}
                aria-label="Dismiss"
                className="text-text-muted hover:text-navy"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mt-2 font-semibold text-navy">
              {newest.opportunity.title}
            </p>
            <p className="text-sm text-text-muted">
              {newest.opportunity.facility_name} · {newest.opportunity.location}
            </p>
            <button
              onClick={() => {
                setExpandedId(newest.id)
                setDismissed(true)
                document
                  .getElementById(`match-${newest.id}`)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }}
              className="btn-primary btn-sm mt-3 w-full"
            >
              View opportunity
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
