import { useState } from 'react'
import { sendSignInLink, signInWithPasted, getHandoffCode, signOut, isCloudConfigured } from '../lib/auth.js'

// Sign-in is a sheet, not a wall: bready worked without an account for months
// and still does. This only appears when Sara asks for it.
//
// The paste box is on every screen, and reachable without sending anything.
// On iOS a mailed link can never reach the home-screen app: tapping it opens
// Safari, and copying it makes Mail load the link to draw a preview, which
// spends the single-use token before it can be pasted. So the credential does
// not come from email at all — Safari, already signed in, hands its session
// over as a code.
function PasteLink({ value, onChange, onSubmit, checking, error }) {
  return (
    <>
      <div className="signin-divider">
        <span>on your home-screen app?</span>
      </div>
      <p className="signin-body">
        A mailed link cannot open this app, and copying it from the email uses it up. Instead open bready
        in <strong>Safari</strong>, tap <strong>Synced</strong>, tap <strong>Copy sign-in code</strong>,
        and paste it here.
      </p>
      <form onSubmit={onSubmit} noValidate>
        <input
          className="signin-input"
          type="text"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          placeholder="Paste your sign-in code"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={checking}
        />
        <button className="signin-primary" type="submit" disabled={checking}>
          {checking ? 'Signing in…' : 'Sign in with the code'}
        </button>
      </form>
      {error && <p className="signin-error">{error}</p>}
    </>
  )
}

export default function SignIn({ user, onClose, onSignedOut }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [message, setMessage] = useState('')
  const [link, setLink] = useState('')
  const [linkStatus, setLinkStatus] = useState('idle') // idle | checking | error
  const [linkError, setLinkError] = useState('')
  const [code, setCode] = useState('')
  const [copyState, setCopyState] = useState('idle') // idle | copied | error
  const [copyMessage, setCopyMessage] = useState('')

  async function copyCode() {
    setCopyState('idle')
    setCopyMessage('')
    setCode('')
    const result = await getHandoffCode()
    if (!result.ok) {
      setCopyState('error')
      setCopyMessage(result.error)
      return
    }
    try {
      await navigator.clipboard.writeText(result.code)
      setCopyState('copied')
    } catch (e) {
      // Clipboard blocked. Show the code so it can be selected by hand rather
      // than leaving Sara with a button that silently does nothing.
      setCode(result.code)
      setCopyState('error')
      setCopyMessage('Could not copy automatically — select the code below and copy it.')
    }
  }

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

  // Takes a handoff code or a sign-in link — Sara should not have to know
  // which kind of string she is holding.
  async function submitLink(e) {
    e.preventDefault()
    setLinkStatus('checking')
    setLinkError('')
    const result = await signInWithPasted(link)
    if (result.ok) {
      onClose()
    } else {
      setLinkStatus('error')
      setLinkError(result.error)
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
            <div className="signin-divider">
              <span>on your home-screen app?</span>
            </div>
            <p className="signin-body">
              Copy a sign-in code, then open the bready icon and paste it there. This moves the session,
              so Safari may ask you to sign in again later.
            </p>
            <button className="signin-secondary" onClick={copyCode}>
              {copyState === 'copied' ? 'Copied — now paste it in the app' : 'Copy sign-in code'}
            </button>
            {/* Only shown when the clipboard refused, so a live credential is
                not sitting on screen for no reason. */}
            {code && (
              <input
                className="signin-input"
                readOnly
                value={code}
                onFocus={(e) => e.target.select()}
              />
            )}
            {copyState === 'error' && <p className="signin-error">{copyMessage}</p>}
            <button className="signin-secondary" onClick={leave}>Sign out</button>
          </>
        ) : status === 'sent' ? (
          <>
            <h2 className="signin-title">Check your email</h2>
            <p className="signin-body">
              A sign-in link is on its way to <strong>{email}</strong>. Open it on this device and
              you will land back here, signed in.
            </p>
            <PasteLink
              value={link}
              onChange={setLink}
              onSubmit={submitLink}
              checking={linkStatus === 'checking'}
              error={linkStatus === 'error' ? linkError : ''}
            />
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
            <PasteLink
              value={link}
              onChange={setLink}
              onSubmit={submitLink}
              checking={linkStatus === 'checking'}
              error={linkStatus === 'error' ? linkError : ''}
            />
            {!isCloudConfigured() && (
              <p className="signin-error">Cloud sync is not configured in this build.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
