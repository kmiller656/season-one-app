import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { FACILITY_STATUSES, FACILITY_STATUS_LABELS } from '../../lib/constants'
import { formatDate } from '../../lib/format'
import { FacilityStatusBadge } from '../../components/Tags'
import PageHeader from '../../components/ui/PageHeader'
import Modal from '../../components/ui/Modal'
import Select from '../../components/ui/Select'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

function StatusSelect({ value, onChange, className = '' }) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`!py-1.5 text-xs ${className}`}
    >
      {FACILITY_STATUSES.map((s) => (
        <option key={s} value={s}>
          {FACILITY_STATUS_LABELS[s]}
        </option>
      ))}
    </Select>
  )
}

function DetailRow({ label, value, href }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-2">
      <dt className="text-sm text-text-muted">{label}</dt>
      <dd className="col-span-2 text-sm text-navy">
        {href && value ? (
          <a href={href} className="link">
            {value}
          </a>
        ) : (
          value || '—'
        )}
      </dd>
    </div>
  )
}

export default function ManageFacilities() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState(null)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('facilities')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) toast.error('Could not load facilities')
    else setList(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const updateStatus = async (id, status) => {
    const prev = list
    setList((cur) => cur.map((f) => (f.id === id ? { ...f, status } : f)))
    if (viewing?.id === id) setViewing((v) => ({ ...v, status }))
    const { error } = await supabase
      .from('facilities')
      .update({ status })
      .eq('id', id)
    if (error) {
      setList(prev)
      toast.error('Could not update status')
    } else {
      toast.success('Status updated')
    }
  }

  return (
    <div>
      <PageHeader
        title="Facilities"
        subtitle="Employer submissions and your placement pipeline."
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size={28} className="text-blue" />
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          title="No facility submissions yet"
          message="Submissions from the website contact form will appear here."
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3 font-semibold">Facility</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  <th className="px-4 py-3 font-semibold">Roles needed</th>
                  <th className="px-4 py-3 font-semibold">Submitted</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Details</th>
                </tr>
              </thead>
              <tbody>
                {list.map((f) => (
                  <tr
                    key={f.id}
                    className="border-b border-border last:border-0 hover:bg-surface"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-navy">
                        {f.facility_name || '—'}
                      </p>
                      <p className="text-xs text-text-muted">
                        {f.facility_type}
                        {f.location ? ` · ${f.location}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-text-mid">
                      {f.contact_name || '—'}
                      {f.contact_email && (
                        <span className="block text-xs text-text-muted">
                          {f.contact_email}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-mid">
                      {f.roles_needed || '—'}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {formatDate(f.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusSelect
                        value={f.status}
                        onChange={(s) => updateStatus(f.id, s)}
                        className="w-36"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setViewing(f)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        size="lg"
        title={viewing?.facility_name || 'Facility details'}
        footer={
          <Button variant="secondary" onClick={() => setViewing(null)}>
            Close
          </Button>
        }
      >
        {viewing && (
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <FacilityStatusBadge status={viewing.status} />
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-muted">Update status:</span>
                <StatusSelect
                  value={viewing.status}
                  onChange={(s) => updateStatus(viewing.id, s)}
                  className="w-40"
                />
              </div>
            </div>
            <dl className="divide-y divide-border">
              <DetailRow label="Facility type" value={viewing.facility_type} />
              <DetailRow label="Location" value={viewing.location} />
              <DetailRow label="Contact name" value={viewing.contact_name} />
              <DetailRow label="Contact title" value={viewing.contact_title} />
              <DetailRow
                label="Email"
                value={viewing.contact_email}
                href={viewing.contact_email ? `mailto:${viewing.contact_email}` : null}
              />
              <DetailRow
                label="Phone"
                value={viewing.contact_phone}
                href={viewing.contact_phone ? `tel:${viewing.contact_phone}` : null}
              />
              <DetailRow label="Roles needed" value={viewing.roles_needed} />
              <DetailRow label="Position type" value={viewing.position_type} />
              <DetailRow label="Timeline" value={viewing.timeline} />
              <DetailRow
                label="Compensation"
                value={viewing.compensation_range}
              />
              <DetailRow label="Notes" value={viewing.notes} />
              <DetailRow
                label="Submitted"
                value={formatDate(viewing.created_at)}
              />
            </dl>
          </div>
        )}
      </Modal>
    </div>
  )
}
