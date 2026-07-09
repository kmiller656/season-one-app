import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  FACILITY_TYPES,
  POSITION_TYPES,
  SPECIALTIES,
} from '../../lib/constants'
import { formatDate } from '../../lib/format'
import { PositionTag } from '../../components/Tags'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Field from '../../components/ui/Field'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Textarea from '../../components/ui/Textarea'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import PlacesAutocomplete from '../../components/PlacesAutocomplete'

const EMPTY = {
  title: '',
  facility_name: '',
  facility_type: '',
  location: '',
  specialty: '',
  position_type: '',
  compensation: '',
  description: '',
  is_active: true,
}

export default function ManageOpportunities() {
  const { user } = useAuth()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) toast.error('Could not load opportunities')
    else setList(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const set = (key) => (eOrVal) => {
    const value = eOrVal?.target ? eOrVal.target.value : eOrVal
    setForm((f) => ({ ...f, [key]: value }))
  }

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY)
    setModalOpen(true)
  }

  const openEdit = (o) => {
    setEditing(o)
    setForm({
      title: o.title || '',
      facility_name: o.facility_name || '',
      facility_type: o.facility_type || '',
      location: o.location || '',
      specialty: o.specialty || '',
      position_type: o.position_type || '',
      compensation: o.compensation || '',
      description: o.description || '',
      is_active: o.is_active,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!form.specialty) {
      toast.error('Specialty is required (it drives PA matching)')
      return
    }
    setSaving(true)
    const payload = {
      title: form.title.trim(),
      facility_name: form.facility_name.trim() || null,
      facility_type: form.facility_type || null,
      location: form.location.trim() || null,
      specialty: form.specialty,
      position_type: form.position_type || null,
      compensation: form.compensation.trim() || null,
      description: form.description.trim() || null,
      is_active: form.is_active,
    }
    try {
      if (editing) {
        const { error } = await supabase
          .from('opportunities')
          .update(payload)
          .eq('id', editing.id)
        if (error) throw error
        toast.success('Opportunity updated')
      } else {
        const { error } = await supabase
          .from('opportunities')
          .insert({ ...payload, posted_by: user.id })
        if (error) throw error
        toast.success('Opportunity posted — matching PAs notified')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      toast.error(err.message || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (o) => {
    setBusyId(o.id)
    const { error } = await supabase
      .from('opportunities')
      .update({ is_active: !o.is_active })
      .eq('id', o.id)
    if (error) toast.error('Could not update')
    else {
      toast.success(o.is_active ? 'Deactivated' : 'Activated')
      setList((cur) =>
        cur.map((x) => (x.id === o.id ? { ...x, is_active: !o.is_active } : x))
      )
    }
    setBusyId(null)
  }

  return (
    <div>
      <PageHeader title="Opportunities" subtitle="Post and manage open roles.">
        <Button onClick={openCreate}>+ New opportunity</Button>
      </PageHeader>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size={28} className="text-blue" />
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          title="No opportunities yet"
          message="Post your first role to start matching PAs."
          action={<Button onClick={openCreate}>+ New opportunity</Button>}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Specialty</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Compensation</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-border last:border-0 hover:bg-surface"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-navy">{o.title}</p>
                      <p className="text-xs text-text-muted">
                        {o.facility_name}
                        {o.location ? ` · ${o.location}` : ''} ·{' '}
                        {formatDate(o.created_at)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-text-mid">
                      {o.specialty || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <PositionTag type={o.position_type} />
                    </td>
                    <td className="px-4 py-3 text-text-mid">
                      {o.compensation || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`badge ${
                          o.is_active
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-text-muted'
                        }`}
                      >
                        {o.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openEdit(o)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant={o.is_active ? 'danger' : 'primary'}
                          onClick={() => toggleActive(o)}
                          loading={busyId === o.id}
                        >
                          {o.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        size="lg"
        title={editing ? 'Edit opportunity' : 'New opportunity'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editing ? 'Save changes' : 'Post opportunity'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Title" htmlFor="o-title" required>
            <Input
              id="o-title"
              value={form.title}
              onChange={set('title')}
              placeholder="Emergency Medicine PA"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Facility name" htmlFor="o-fac">
              <Input
                id="o-fac"
                value={form.facility_name}
                onChange={set('facility_name')}
              />
            </Field>
            <Field label="Facility type" htmlFor="o-factype">
              <Select
                id="o-factype"
                value={form.facility_type}
                onChange={set('facility_type')}
              >
                <option value="">Select…</option>
                {FACILITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Location" htmlFor="o-loc">
              <PlacesAutocomplete
                id="o-loc"
                value={form.location}
                onChange={set('location')}
              />
            </Field>
            <Field label="Specialty" htmlFor="o-spec" required>
              <Select
                id="o-spec"
                value={form.specialty}
                onChange={set('specialty')}
              >
                <option value="">Select…</option>
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Position type" htmlFor="o-pos">
              <Select
                id="o-pos"
                value={form.position_type}
                onChange={set('position_type')}
              >
                <option value="">Select…</option>
                {POSITION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Compensation"
              htmlFor="o-comp"
              hint="Include the unit — e.g. “/ yr” or “/ hr”."
              className="sm:col-span-2"
            >
              <Input
                id="o-comp"
                value={form.compensation}
                onChange={set('compensation')}
                placeholder="$145,000 - $165,000 / yr"
              />
            </Field>
          </div>
          <Field label="Description" htmlFor="o-desc">
            <Textarea
              id="o-desc"
              rows={5}
              value={form.description}
              onChange={set('description')}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-navy">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm((f) => ({ ...f, is_active: e.target.checked }))
              }
              className="h-4 w-4 rounded border-border accent-blue"
            />
            Active (visible to matching PAs)
          </label>
        </div>
      </Modal>
    </div>
  )
}
