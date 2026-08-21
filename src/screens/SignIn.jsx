import { useState } from 'react'
import { sendSignInLink, signOut, isCloudConfigured } from '../lib/auth.js'

// Sign-in is a sheet, not a wall: bready worked without an account for months
// and still does. This only appears when Sara asks for it.
export default function SignIn({ user, onClose, onSignedOut }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [message, setMessage] = useState('')

  async function submit(e) {
    e.preventDefault()
    setStatus('sending')
    setMessage('')
    const result = await sendSignInLink(email)
    if (result.ok) {
      setStatus('sent')
    } else {
      setStatus('error')
      setMessage(result.error)
    }
  }

  async function leave() {
    await signOut()
    onSignedOut?.()
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet signin" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />

        {user ? (
          <>
            <h2 className="signin-title">Signed in</h2>
            <p className="signin-body">
              Your bakeries, rankings and photos are saved to <strong>{user.email}</strong> and
              follow you to any browser you sign in on.
            </p>
            <button className="signin-secondary" onClick={leave}>Sign out</button>
          </>
        ) : status === 'sent' ? (
          <>
            <h2 className="signin-title">Check your email</h2>
            <p className="signin-body">
              A sign-in link is on its way to <strong>{email}</strong>. Open it on this device and
              you will land back here, signed in.
            </p>
            <button className="signin-secondary" onClick={() => setStatus('idle')}>
              Use a different address
            </button>
          </>
        ) : (
          <>
            <h2 className="signin-title">Keep your bakeries everywhere</h2>
            <p className="signin-body">
              Right now everything lives in this browser, so a different one starts empty and your
              photos do not come with you. Sign in and they follow you everywhere.
            </p>
            {/* noValidate: let our own message be the only one the user sees,
                rather than the browser's bubble racing it. */}
            <form onSubmit={submit} noValidate>
              <input
                className="signin-input"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === 'sending'}
              />
              <button className="signin-primary" type="submit" disabled={status === 'sending'}>
                {status === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
              </button>
            </form>
            <p className="signin-note">No password. We send a link and you tap it.</p>
            {status === 'error' && <p className="signin-error">{message}</p>}
            {!isCloudConfigured() && (
              <p className="signin-error">Cloud sync is not configured in this build.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
