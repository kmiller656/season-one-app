import { useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/ui/PageHeader'
import Field from '../../components/ui/Field'
import Input from '../../components/ui/Input'
import Textarea from '../../components/ui/Textarea'
import Button from '../../components/ui/Button'
import { WEB3FORMS_KEY, SUPPORT_EMAIL } from '../../lib/constants'

export default function Team() {
  const { profile, user } = useAuth()
  const [name, setName] = useState(profile?.full_name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!message.trim()) {
      toast.error('Please write a message')
      return
    }
    setSending(true)
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: `Season One app — message from ${name || email}`,
          from_name: name || 'Season One PA',
          name,
          email,
          replyto: email,
          message,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Message sent — your team will be in touch')
        setMessage('')
      } else {
        throw new Error(json.message || 'Submission failed')
      }
    } catch (err) {
      toast.error(err.message || 'Could not send message')
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="My Team"
        subtitle="Send a message to your Season One team."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="card card-pad space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your name" htmlFor="t-name">
                <Input
                  id="t-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </Field>
              <Field label="Reply-to email" htmlFor="t-email">
                <Input
                  id="t-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </Field>
            </div>
            <Field label="Message" htmlFor="t-msg">
              <Textarea
                id="t-msg"
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can your Season One team help?"
              />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" loading={sending}>
                Send message
              </Button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-1">
          <div className="card card-pad">
            <h3 className="text-base">Here to help</h3>
            <p className="mt-2 text-sm text-text-mid">
              Your dedicated Season One team is here to answer questions about
              opportunities, compensation, credentialing, and the placement
              process.
            </p>
            <hr className="my-4 border-border" />
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Direct email
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="link text-sm"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
