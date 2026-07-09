import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useMatches } from '../../hooks/useMatches'
import { compMidpointAnnual } from '../../lib/format'
import { POSITION_TYPES, SPECIALTIES } from '../../lib/constants'
import OpportunityCard from '../../components/OpportunityCard'
import PageHeader from '../../components/ui/PageHeader'
import Select from '../../components/ui/Select'
import Input from '../../components/ui/Input'
import Field from '../../components/ui/Field'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'

const COMP_RANGES = [
  { value: '', label: 'Any compensation' },
  { value: '0-120', label: 'Under $120k' },
  { value: '120-160', label: '$120k – $160k' },
  { value: '160-', label: 'Over $160k' },
]

function inRange(mid, range) {
  if (!range) return true
  if (mid == null) return false
  const [lo, hi] = range.split('-')
  const L = lo ? Number(lo) * 1000 : 0
  const H = hi ? Number(hi) * 1000 : Infinity
  return mid >= L && mid < H
}

export default function Opportunities({ initialPositionType = '', heading }) {
  const { matches, loading, updateStatus, refresh } = useMatches()
  const [positionType, setPositionType] = useState(initialPositionType)
  const [specialty, setSpecialty] = useState('')
  const [location, setLocation] = useState('')
  const [compRange, setCompRange] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      const o = m.opportunity
      if (positionType && o.position_type !== positionType) return false
      if (specialty && o.specialty !== specialty) return false
      if (
        location &&
        !(o.location || '').toLowerCase().includes(location.toLowerCase())
      )
        return false
      if (compRange) {
        const mid = compMidpointAnnual(o.compensation, o.compensation_type)
        if (!inRange(mid, compRange)) return false
      }
      return true
    })
  }, [matches, positionType, specialty, location, compRange])

  const handleStatus = async (match, status) => {
    setBusyId(match.id)
    try {
      await updateStatus(match.id, status)
      toast.success(
        status === 'interested' ? "Marked as interested" : 'Marked as not for me'
      )
    } catch (e) {
      toast.error('Could not update — please try again')
    } finally {
      setBusyId(null)
    }
  }

  const clearFilters = () => {
    setPositionType(initialPositionType)
    setSpecialty('')
    setLocation('')
    setCompRange('')
  }

  return (
    <div>
      <PageHeader
        title={heading || 'Opportunities'}
        subtitle="Roles matched to your specialty and preferences."
      />

      {/* Filters */}
      <div className="card card-pad mb-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Position type" htmlFor="f-type">
            <Select
              id="f-type"
              value={positionType}
              onChange={(e) => setPositionType(e.target.value)}
            >
              <option value="">All types</option>
              {POSITION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Specialty" htmlFor="f-spec">
            <Select
              id="f-spec"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
            >
              <option value="">All specialties</option>
              {SPECIALTIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Location" htmlFor="f-loc">
            <Input
              id="f-loc"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City or state"
            />
          </Field>
          <Field label="Compensation" htmlFor="f-comp">
            <Select
              id="f-comp"
              value={compRange}
              onChange={(e) => setCompRange(e.target.value)}
            >
              {COMP_RANGES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm text-text-muted">
            {filtered.length} result{filtered.length === 1 ? '' : 's'}
          </p>
          <button onClick={clearFilters} className="link text-sm">
            Reset filters
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size={28} className="text-blue" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No matching opportunities"
          message="Try widening your filters, or check back soon — new roles are added regularly."
          action={
            <Button variant="secondary" onClick={refresh}>
              Refresh
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
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
    </div>
  )
}
