import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/ui/PageHeader'
import Field from '../../components/ui/Field'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Textarea from '../../components/ui/Textarea'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import PlacesAutocomplete from '../../components/PlacesAutocomplete'
import {
  CREDENTIALS,
  SPECIALTIES,
  AVAILABILITY_OPTIONS,
} from '../../lib/constants'

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="text-right text-sm font-medium text-navy">
        {value || '—'}
      </span>
    </div>
  )
}

export default function Profile() {
  const { profile, user, updateProfile } = useAuth()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  const [outreachSaving, setOutreachSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        credential: profile.credential || '',
        specialty: profile.specialty || '',
        current_location: profile.current_location || '',
        preferred_location: profile.preferred_location || '',
        availability: profile.availability || '',
        compensation_goal: profile.compensation_goal || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
      })
    }
  }, [profile])

  const handleOutreachToggle = async (e) => {
    const value = e.target.checked
    setOutreachSaving(true)
    try {
      await updateProfile({ open_to_recruiter_outreach: value })
      toast.success(
        value
          ? "You're now visible to recruiters"
          : 'Removed from recruiter search'
      )
    } catch (err) {
      toast.error(err.message || 'Could not update outreach setting')
    } finally {
      setOutreachSaving(false)
    }
  }

  if (!form) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={28} className="text-blue" />
      </div>
    )
  }

  const set = (key) => (eOrVal) => {
    const value = eOrVal?.target ? eOrVal.target.value : eOrVal
    setForm((f) => ({ ...f, [key]: value }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateProfile({ ...form, credential: form.credential || null })
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err.message || 'Could not save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="My Profile"
        subtitle="Keep your details current so we can match you accurately."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="card card-pad">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue/10 text-lg font-bold text-blue">
                {(profile?.full_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-navy">
                  {profile?.full_name || 'Your name'}
                </p>
                <p className="truncate text-sm text-text-muted">
                  {user?.email}
                </p>
              </div>
            </div>
            <hr className="my-4 border-border" />
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Current preferences
            </p>
            <div className="divide-y divide-border">
              <SummaryRow label="Credential" value={profile?.credential} />
              <SummaryRow label="Specialty" value={profile?.specialty} />
              <SummaryRow label="Location" value={profile?.current_location} />
              <SummaryRow label="Preferred" value={profile?.preferred_location} />
              <SummaryRow label="Availability" value={profile?.availability} />
              <SummaryRow label="Comp goal" value={profile?.compensation_goal} />
            </div>
          </div>
        </div>

        {/* Edit form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className="card card-pad space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" htmlFor="p-name">
                <Input
                  id="p-name"
                  value={form.full_name}
                  onChange={set('full_name')}
                />
              </Field>
              <Field label="Email" htmlFor="p-email" hint="Contact support to change your email.">
                <Input
                  id="p-email"
                  value={user?.email || ''}
                  disabled
                  className="bg-surface text-text-muted"
                />
              </Field>
              <Field label="Credential" htmlFor="p-cred">
                <Select
                  id="p-cred"
                  value={form.credential}
                  onChange={set('credential')}
                >
                  <option value="">Select…</option>
                  {CREDENTIALS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Specialty" htmlFor="p-spec">
                <Select
                  id="p-spec"
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
              <Field label="Current location" htmlFor="p-loc">
                <PlacesAutocomplete
                  id="p-loc"
                  value={form.current_location}
                  onChange={set('current_location')}
                />
              </Field>
              <Field label="Preferred location" htmlFor="p-ploc">
                <PlacesAutocomplete
                  id="p-ploc"
                  value={form.preferred_location}
                  onChange={set('preferred_location')}
                  placeholder="Anywhere / City, State"
                />
              </Field>
              <Field label="Availability" htmlFor="p-avail">
                <Select
                  id="p-avail"
                  value={form.availability}
                  onChange={set('availability')}
                >
                  <option value="">Select…</option>
                  {AVAILABILITY_OPTIONS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Compensation goal" htmlFor="p-comp">
                <Input
                  id="p-comp"
                  value={form.compensation_goal}
                  onChange={set('compensation_goal')}
                  placeholder="$150,000 / yr or $115 / hr"
                />
              </Field>
              <Field label="Phone" htmlFor="p-phone">
                <Input
                  id="p-phone"
                  type="tel"
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="(555) 123-4567"
                />
              </Field>
            </div>
            <Field label="Bio" htmlFor="p-bio">
              <Textarea id="p-bio" value={form.bio} onChange={set('bio')} />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" loading={saving}>
                Save changes
              </Button>
            </div>
          </form>

          <div className="card card-pad mt-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-navy">
                  Open to direct recruiter outreach
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  You agreed to this when you created your account — Season
                  One also runs a PA contact database used by outside
                  recruiters and staffing agencies, and your name and basic
                  profile are listed in their search by default. Turn this
                  off any time to be removed.
                </p>
              </div>
              <label className="flex shrink-0 cursor-pointer items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  checked={!!profile?.open_to_recruiter_outreach}
                  onChange={handleOutreachToggle}
                  disabled={outreachSaving}
                  className="h-5 w-5 rounded border-border text-blue focus:ring-blue"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
