import Badge from './ui/Badge'
import {
  MATCH_STATUS_LABELS,
  MATCH_STATUS_STYLES,
  FACILITY_STATUS_LABELS,
  FACILITY_STATUS_STYLES,
  POSITION_TYPE_STYLES,
} from '../lib/constants'

export function MatchStatusBadge({ status }) {
  return (
    <Badge className={MATCH_STATUS_STYLES[status] || 'bg-gray-100 text-text-muted'}>
      {MATCH_STATUS_LABELS[status] || status}
    </Badge>
  )
}

export function FacilityStatusBadge({ status }) {
  return (
    <Badge
      className={FACILITY_STATUS_STYLES[status] || 'bg-gray-100 text-text-muted'}
    >
      {FACILITY_STATUS_LABELS[status] || status}
    </Badge>
  )
}

export function PositionTag({ type }) {
  if (!type) return null
  return (
    <span
      className={`tag ${
        POSITION_TYPE_STYLES[type] || 'border border-border bg-surface text-text-mid'
      }`}
    >
      {type}
    </span>
  )
}
