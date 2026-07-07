import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import PageHeader from '../../components/ui/PageHeader'
import Spinner from '../../components/ui/Spinner'

function StatCard({ label, value, accent }) {
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
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    let active = true
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()

    async function load() {
      const [pas, opps, weekMatches, facs] = await Promise.all([
        supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'pa'),
        supabase
          .from('opportunities')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true),
        supabase
          .from('matches')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', weekAgo),
        supabase
          .from('facilities')
          .select('id', { count: 'exact', head: true }),
      ])
      if (!active) return
      setStats({
        pas: pas.count ?? 0,
        opps: opps.count ?? 0,
        weekMatches: weekMatches.count ?? 0,
        facs: facs.count ?? 0,
      })
    }
    load()
    return () => {
      active = false
    }
  }, [])

  return (
    <div>
      <PageHeader
        title="Admin overview"
        subtitle="A snapshot of the Season One platform."
      />

      {!stats ? (
        <div className="flex justify-center py-20">
          <Spinner size={28} className="text-blue" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total PAs" value={stats.pas} accent />
            <StatCard label="Active opportunities" value={stats.opps} />
            <StatCard label="New matches this week" value={stats.weekMatches} />
            <StatCard label="Facilities submitted" value={stats.facs} />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Link
              to="/admin/opportunities"
              className="card card-pad transition hover:border-blue-border hover:shadow-float"
            >
              <h3 className="text-base">Manage opportunities →</h3>
              <p className="mt-1 text-sm text-text-muted">
                Post new roles, edit details, and activate or deactivate
                listings. New posts auto-match qualifying PAs.
              </p>
            </Link>
            <Link
              to="/admin/facilities"
              className="card card-pad transition hover:border-blue-border hover:shadow-float"
            >
              <h3 className="text-base">Manage facilities →</h3>
              <p className="mt-1 text-sm text-text-muted">
                Review facility submissions and move them through your pipeline.
              </p>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
