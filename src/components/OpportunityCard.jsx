import { formatDate } from '../lib/format'
import { MatchStatusBadge, PositionTag } from './Tags'
import Button from './ui/Button'

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        {label}
      </p>
      <p className="text-sm text-navy">{value || '—'}</p>
    </div>
  )
}

// Clickable, expandable match card — shared by the Dashboard's match list
// and the full Opportunities page so both look and behave identically.
export default function OpportunityCard({
  match,
  expanded,
  onToggle,
  onStatus,
  busy,
}) {
  const o = match.opportunity
  const decided =
    match.status === 'interested' || match.status === 'not_interested'

  return (
    <div className="card" id={`match-${match.id}`}>
      <button
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-4 p-5 text-left"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base">{o.title}</h3>
            <PositionTag type={o.position_type} />
          </div>
          <p className="mt-1 text-sm text-text-mid">
            {o.facility_name}
            {o.location ? ` · ${o.location}` : ''}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="font-semibold text-navy">
              {o.compensation || '—'}
            </span>
            {o.specialty && (
              <span className="text-text-muted">{o.specialty}</span>
            )}
            <span className="text-text-muted">
              Posted {formatDate(o.created_at)}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <MatchStatusBadge status={match.status} />
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-text-muted transition-transform ${
              expanded ? 'rotate-180' : ''
            }`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-5 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Detail label="Facility type" value={o.facility_type} />
            <Detail label="Position type" value={o.position_type} />
            <Detail label="Specialty" value={o.specialty} />
            <Detail label="Compensation" value={o.compensation} />
            <Detail label="Location" value={o.location} />
            <Detail label="Posted" value={formatDate(o.created_at)} />
          </div>

          {o.description && (
            <div className="mt-4">
              <p className="label">Description</p>
              <p className="whitespace-pre-line text-sm text-text-mid">
                {o.description}
              </p>
            </div>
          )}

          {onStatus && (
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                onClick={() => onStatus('interested')}
                loading={busy}
                disabled={match.status === 'interested'}
              >
                {match.status === 'interested' ? 'Interested ✓' : "I'm interested"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => onStatus('not_interested')}
                disabled={busy || match.status === 'not_interested'}
              >
                Not for me
              </Button>
              {decided && (
                <span className="self-center text-xs text-text-muted">
                  Your team has been notified of your interest level.
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
