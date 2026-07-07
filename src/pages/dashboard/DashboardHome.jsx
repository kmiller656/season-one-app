import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useMatches } from '../../hooks/useMatches'
import { compMidpointAnnual, formatUSD, timeAgo } from '../../lib/format'
import { MatchStatusBadge, PositionTag } from '../../components/Tags'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

const WEEK = 7 * 86400000

function StatCard({ label, value, sub, accent = false }) {
  return (
    <div className="card card-pad">
      <p className="text-sm font-medium text-text-muted">{label}</p>
      <p
        className={`mt-1 text-3xl font-extrabold tracking-headline ${
          accent ? 'text-blue' : 'text-navy'
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-text-muted">{sub}</p>}
    </div>
  )
}

function CompChart({ data, average }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-text-muted">
          Average compensation
        </p>
        <span className="text-xs text-text-muted">
          {data.length} matched role{data.length === 1 ? '' : 's'}
        </span>
      </div>
      <p className="mt-1 text-3xl font-extrabold tracking-headline text-navy">
        {formatUSD(average)}
        <span className="ml-1 text-sm font-medium text-text-muted">
          / yr est.
        </span>
      </p>
      <div className="mt-4 flex h-24 items-end gap-1.5">
        {data.map((d, i) => (
          <div
            key={i}
            className="group relative flex-1 rounded-t bg-blue/80 transition-all hover:bg-blue"
            style={{ height: `${Math.max((d.value / max) * 100, 6)}%` }}
            title={`${d.label}: ${formatUSD(d.value, { compact: true })}`}
          />
        ))}
      </div>
    </div>
  )
}

export default function DashboardHome() {
  const { profile, user } = useAuth()
  const { matches, loading } = useMatches()
  const [dismissed, setDismissed] = useState(false)

  const firstName = (profile?.full_name || '').split(' ')[0]

  const stats = useMemo(() => {
    const now = Date.now()
    const newThisWeek = matches.filter(
      (m) => m.status === 'new' && now - new Date(m.created_at).getTime() < WEEK
    ).length
    const interested = matches.filter((m) => m.status === 'interested').length

    const withComp = matches
      .map((m) => ({
        label: m.opportunity.facility_name || m.opportunity.title,
        value: compMidpointAnnual(
          m.opportunity.compensation,
          m.opportunity.compensation_type
        ),
      }))
      .filter((x) => x.value)

    const average = withComp.length
      ? Math.round(
          withComp.reduce((a, b) => a + b.value, 0) / withComp.length
        )
      : null

    const chartData = withComp.slice(0, 8).reverse()

    return {
      newThisWeek,
      interested,
      total: matches.length,
      average,
      chartData,
    }
  }, [matches])

  const latest = matches.slice(0, 6)
  const newest = matches[0]

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

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Your opportunities this week"
          value={stats.newThisWeek}
          sub="New matches in the last 7 days"
          accent
        />
        <StatCard
          label="Total matches"
          value={stats.total}
          sub={`${stats.interested} marked interested`}
        />
        <div className="card card-pad sm:col-span-2 lg:col-span-1">
          {stats.chartData.length ? (
            <CompChart data={stats.chartData} average={stats.average} />
          ) : (
            <>
              <p className="text-sm font-medium text-text-muted">
                Average compensation
              </p>
              <p className="mt-1 text-3xl font-extrabold tracking-headline text-navy">
                —
              </p>
              <p className="mt-1 text-xs text-text-muted">
                No compensation data yet.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Latest matches */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg">Latest matches</h2>
          <Link to="/dashboard/opportunities" className="link text-sm">
            View all →
          </Link>
        </div>

        {latest.length === 0 ? (
          <EmptyState
            title="No matches yet"
            message="As soon as a role matching your specialty is posted, it’ll show up here."
          />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Facility</th>
                    <th className="px-4 py-3 font-semibold">Compensation</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {latest.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-border last:border-0 hover:bg-surface"
                    >
                      <td className="px-4 py-3 font-semibold text-navy">
                        {m.opportunity.title}
                      </td>
                      <td className="px-4 py-3 text-text-mid">
                        {m.opportunity.facility_name || '—'}
                        <span className="block text-xs text-text-muted">
                          {m.opportunity.location}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-mid">
                        {m.opportunity.compensation || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <PositionTag type={m.opportunity.position_type} />
                      </td>
                      <td className="px-4 py-3">
                        <MatchStatusBadge status={m.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

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
            <Link
              to="/dashboard/opportunities"
              className="btn-primary btn-sm mt-3 w-full"
            >
              View opportunity
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
