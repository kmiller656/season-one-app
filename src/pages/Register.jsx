import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import AuthLayout from '../components/layout/AuthLayout'
import Field from '../components/ui/Field'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Textarea from '../components/ui/Textarea'
import Button from '../components/ui/Button'
import PlacesAutocomplete from '../components/PlacesAutocomplete'
import { useAuth } from '../context/AuthContext'
import {
  CREDENTIALS,
  SPECIALTIES,
  AVAILABILITY_OPTIONS,
} from '../lib/constants'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Stepper({ steps, current }) {
  return (
    <ol className="mb-6 flex items-center gap-2">
      {steps.map((s, i) => {
        const done = current > s.n
        const active = current === s.n
        return (
          <li key={s.n} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                active
                  ? 'bg-blue text-white'
                  : done
                    ? 'bg-blue/15 text-blue-dark'
                    : 'bg-surface text-text-muted'
              }`}
            >
              {done ? '✓' : i + 1}
            </span>
            <span
              className={`hidden text-xs font-semibold sm:block ${
                active ? 'text-navy' : 'text-text-muted'
              }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <span className="ml-1 h-px flex-1 bg-border" />
            )}
          </li>
        )
      })}
    </ol>
  )
}

export default function Register({ completion = false }) {
  const { signUp, updateProfile, profile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const firstStep = completion ? 2 : 1
  const [step, setStep] = useState(firstStep)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  const [form, setForm] = useState(() => ({
    // 'pa' | 'recruiter' — locked to 'pa' once already registered (completion
    // flow); the /for-recruiters.html marketing page links here with
    // ?role=recruiter.
    role: !completion && searchParams.get('role') === 'recruiter' ? 'recruiter' : 'pa',
    email: '',
    password: '',
    full_name: completion ? profile?.full_name || '' : '',
    credential: completion ? profile?.credential || '' : '',
    specialty: completion ? profile?.specialty || '' : '',
    current_location: completion ? profile?.current_location || '' : '',
    preferred_location: completion ? profile?.preferred_location || '' : '',
    availability: completion ? profile?.availability || '' : '',
    compensation_goal: completion ? profile?.compensation_goal || '' : '',
    phone: completion ? profile?.phone || '' : '',
    bio: completion ? profile?.bio || '' : '',
    company_name: '',
  }))
  const isRecruiter = form.role === 'recruiter'

  const set = (key) => (eOrVal) => {
    const value = eOrVal?.target ? eOrVal.target.value : eOrVal
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((er) => ({ ...er, [key]: undefined }))
  }

  const steps = completion
    ? [
        { n: 2, label: 'Preferences' },
        { n: 3, label: 'Finish' },
      ]
    : [
        { n: 1, label: 'Account' },
        { n: 2, label: isRecruiter ? 'Company' : 'Preferences' },
        { n: 3, label: 'Finish' },
      ]

  function validateStep(s) {
    const e = {}
    if (s === 1) {
      if (!EMAIL_RE.test(form.email.trim())) e.email = 'Enter a valid email'
      if (form.password.length < 8) e.password = 'At least 8 characters'
      if (!form.full_name.trim()) e.full_name = 'Required'
      if (!isRecruiter && !form.credential) e.credential = 'Select your credential'
    }
    if (s === 2) {
      if (isRecruiter) {
        if (!form.company_name.trim()) e.company_name = 'Required'
      } else {
        if (!form.specialty) e.specialty = 'Select a specialty'
        if (!form.current_location.trim()) e.current_location = 'Required'
        if (!form.availability) e.availability = 'Required'
        if (!form.compensation_goal.trim()) e.compensation_goal = 'Required'
      }
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = () => {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, 3))
  }
  const back = () => setStep((s) => Math.max(s - 1, firstStep))

  const handleFinish = async () => {
    setSubmitting(true)
    try {
      if (completion) {
        await updateProfile({
          full_name: form.full_name,
          credential: form.credential || null,
          specialty: form.specialty,
          current_location: form.current_location,
          preferred_location: form.preferred_location,
          availability: form.availability,
          compensation_goal: form.compensation_goal,
          phone: form.phone,
          bio: form.bio,
        })
        toast.success('Profile saved')
        navigate('/dashboard', { replace: true })
      } else {
        const metadata = isRecruiter
          ? {
              role: 'recruiter',
              full_name: form.full_name,
              company_name: form.company_name,
              phone: form.phone,
              bio: form.bio,
            }
          : {
              role: 'pa',
              full_name: form.full_name,
              credential: form.credential,
              specialty: form.specialty,
              current_location: form.current_location,
              preferred_location: form.preferred_location,
              availability: form.availability,
              compensation_goal: form.compensation_goal,
              phone: form.phone,
              bio: form.bio,
            }
        const data = await signUp({
          email: form.email.trim(),
          password: form.password,
          metadata,
        })
        // Recruiters go straight to plan selection — there's no free tier.
        const home = isRecruiter ? '/recruiters/upgrade' : '/dashboard'
        if (data.session) {
          toast.success('Welcome to Season One!')
          navigate(home, { replace: true })
        } else {
          toast.success('Account created — check your email to confirm.')
          navigate('/login', { replace: true })
        }
      }
    } catch (err) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout wide>
      <div className="card card-pad">
        <h1 className="text-xl">
          {completion ? 'Complete your profile' : 'Create your account'}
        </h1>
        <p className="mb-6 mt-1 text-sm text-text-muted">
          {completion
            ? 'Just a few details so we can match you with the right roles.'
            : 'Join Season One and start matching with high-paying PA roles.'}
        </p>

        <Stepper steps={steps} current={step} />

        {/* STEP 1 — Account */}
        {step === 1 && (
          <div className="space-y-4">
            {!completion && (
              <Field label="I'm joining as a…" htmlFor="role">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => set('role')('pa')}
                    className={`rounded-card border px-4 py-3 text-sm font-semibold transition-colors ${
                      !isRecruiter
                        ? 'border-blue bg-blue-light text-blue-dark'
                        : 'border-border text-text-muted hover:border-blue-border'
                    }`}
                  >
                    Physician Assistant
                    <p className="mt-0.5 text-xs font-normal">
                      Looking for placement opportunities
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => set('role')('recruiter')}
                    className={`rounded-card border px-4 py-3 text-sm font-semibold transition-colors ${
                      isRecruiter
                        ? 'border-blue bg-blue-light text-blue-dark'
                        : 'border-border text-text-muted hover:border-blue-border'
                    }`}
                  >
                    Recruiter
                    <p className="mt-0.5 text-xs font-normal">
                      Searching Season One's PA contact database
                    </p>
                  </button>
                </div>
              </Field>
            )}
            <Field label="Email" htmlFor="email" required error={errors.email}>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={set('email')}
                error={!!errors.email}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </Field>
            <Field
              label="Password"
              htmlFor="password"
              required
              error={errors.password}
              hint="At least 8 characters."
            >
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={set('password')}
                error={!!errors.password}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </Field>
            <Field
              label="Full name"
              htmlFor="full_name"
              required
              error={errors.full_name}
            >
              <Input
                id="full_name"
                value={form.full_name}
                onChange={set('full_name')}
                error={!!errors.full_name}
                placeholder="Jordan Reyes"
                autoComplete="name"
              />
            </Field>
            {!isRecruiter && (
              <Field
                label="Credential"
                htmlFor="credential"
                required
                error={errors.credential}
              >
                <Select
                  id="credential"
                  value={form.credential}
                  onChange={set('credential')}
                  error={!!errors.credential}
                >
                  <option value="">Select…</option>
                  {CREDENTIALS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>
        )}

        {/* STEP 2 — Preferences (PA) / Company (Recruiter) */}
        {step === 2 && isRecruiter && (
          <div className="space-y-4">
            <Field
              label="Company / agency name"
              htmlFor="company_name"
              required
              error={errors.company_name}
            >
              <Input
                id="company_name"
                value={form.company_name}
                onChange={set('company_name')}
                error={!!errors.company_name}
                placeholder="Acme Healthcare Staffing"
              />
            </Field>
          </div>
        )}
        {step === 2 && !isRecruiter && (
          <div className="space-y-4">
            <Field
              label="Specialty"
              htmlFor="specialty"
              required
              error={errors.specialty}
            >
              <Select
                id="specialty"
                value={form.specialty}
                onChange={set('specialty')}
                error={!!errors.specialty}
              >
                <option value="">Select…</option>
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Current location"
              htmlFor="current_location"
              required
              error={errors.current_location}
            >
              <PlacesAutocomplete
                id="current_location"
                value={form.current_location}
                onChange={set('current_location')}
                error={!!errors.current_location}
              />
            </Field>
            <Field
              label="Preferred location"
              htmlFor="preferred_location"
              hint="Where would you like to work? Leave blank if flexible."
            >
              <PlacesAutocomplete
                id="preferred_location"
                value={form.preferred_location}
                onChange={set('preferred_location')}
                placeholder="Anywhere / City, State"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Availability"
                htmlFor="availability"
                required
                error={errors.availability}
              >
                <Select
                  id="availability"
                  value={form.availability}
                  onChange={set('availability')}
                  error={!!errors.availability}
                >
                  <option value="">Select…</option>
                  {AVAILABILITY_OPTIONS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Compensation goal"
                htmlFor="compensation_goal"
                required
                error={errors.compensation_goal}
              >
                <Input
                  id="compensation_goal"
                  value={form.compensation_goal}
                  onChange={set('compensation_goal')}
                  error={!!errors.compensation_goal}
                  placeholder="$150,000 / yr or $115 / hr"
                />
              </Field>
            </div>
          </div>
        )}

        {/* STEP 3 — Finish */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone" htmlFor="phone">
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="(555) 123-4567"
                  autoComplete="tel"
                />
              </Field>
            </div>
            <Field label="Short bio" htmlFor="bio" hint="Optional — tell us about your experience.">
              <Textarea
                id="bio"
                value={form.bio}
                onChange={set('bio')}
                placeholder="5 years in emergency medicine, ACLS/PALS certified…"
              />
            </Field>

            <div className="rounded-card border border-blue-border bg-blue-light p-4">
              <p className="text-sm font-semibold text-navy">Confirm your details</p>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <dt className="text-text-muted">Name</dt>
                <dd className="text-navy">{form.full_name || '—'}</dd>
                {!completion && (
                  <>
                    <dt className="text-text-muted">Email</dt>
                    <dd className="truncate text-navy">{form.email || '—'}</dd>
                  </>
                )}
                {isRecruiter ? (
                  <>
                    <dt className="text-text-muted">Company</dt>
                    <dd className="text-navy">{form.company_name || '—'}</dd>
                  </>
                ) : (
                  <>
                    <dt className="text-text-muted">Credential</dt>
                    <dd className="text-navy">{form.credential || '—'}</dd>
                    <dt className="text-text-muted">Specialty</dt>
                    <dd className="text-navy">{form.specialty || '—'}</dd>
                    <dt className="text-text-muted">Location</dt>
                    <dd className="text-navy">{form.current_location || '—'}</dd>
                    <dt className="text-text-muted">Availability</dt>
                    <dd className="text-navy">{form.availability || '—'}</dd>
                    <dt className="text-text-muted">Comp goal</dt>
                    <dd className="text-navy">{form.compensation_goal || '—'}</dd>
                  </>
                )}
              </dl>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between gap-3">
          {step > firstStep ? (
            <Button variant="secondary" onClick={back} type="button">
              Back
            </Button>
          ) : (
            <span />
          )}
          {step < 3 ? (
            <Button onClick={next} type="button">
              Continue
            </Button>
          ) : (
            <Button onClick={handleFinish} loading={submitting} type="button">
              {completion ? 'Save profile' : 'Create account'}
            </Button>
          )}
        </div>

        {!completion && (
          <p className="mt-6 text-center text-sm text-text-muted">
            Already have an account?{' '}
            <Link to="/login" className="link">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </AuthLayout>
  )
}
