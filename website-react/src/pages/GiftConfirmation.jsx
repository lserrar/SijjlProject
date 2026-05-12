import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { finalizeGiftCardBySession } from '../api'

export default function GiftConfirmation() {
  const [params] = useSearchParams()
  const sessionId = params.get('session_id')
  const [state, setState] = useState({ status: 'loading', data: null, error: null })

  useEffect(() => {
    document.title = 'Cadeau confirmé · Sijill'
    if (!sessionId) { setState({ status: 'error', error: 'Session manquante' }); return }
    let mounted = true
    let attempts = 0
    async function poll() {
      try {
        const res = await finalizeGiftCardBySession(sessionId)
        if (!mounted) return
        if (res?.status === 'paid') {
          setState({ status: 'paid', data: res })
        } else if (attempts < 15) {
          attempts++
          setTimeout(poll, 1500)
        } else {
          setState({ status: 'error', error: "Le paiement n'est pas encore confirmé. Patientez quelques minutes puis rechargez la page." })
        }
      } catch (e) {
        if (!mounted) return
        setState({ status: 'error', error: e?.message || 'Erreur' })
      }
    }
    poll()
    return () => { mounted = false }
  }, [sessionId])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '60px 24px' }}>
      <div style={{ maxWidth: 580, margin: '0 auto', textAlign: 'center' }} data-testid="gift-confirmation">
        {state.status === 'loading' && (
          <>
            <div style={{ fontSize: 11, letterSpacing: 3, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vérification du paiement</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, marginTop: 14 }}>Un instant…</h1>
          </>
        )}
        {state.status === 'paid' && (
          <>
            <div style={{ width: 64, height: 64, margin: '0 auto', background: 'var(--brand-secondary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: '#0d0c0a', marginBottom: 22 }}>✓</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32 }}>Merci pour votre cadeau !</h1>
            <p style={{ fontSize: 16, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 12 }}>
              Votre <strong style={{ color: 'var(--text)' }}>{state.data.plan_label}</strong> pour <strong style={{ color: 'var(--text)' }}>{state.data.recipient_name}</strong> est confirmé.
              {state.data.deliver_at
                ? <> L'email cadeau sera envoyé le <strong style={{ color: 'var(--text)' }}>{state.data.deliver_at}</strong>.</>
                : <> L'email cadeau vient d'être envoyé à <strong style={{ color: 'var(--text)' }}>{state.data.recipient_email}</strong>.</>}
            </p>
            <div style={{ background: 'rgba(31,174,107,0.08)', border: '1px solid rgba(31,174,107,0.35)', padding: '18px 22px', borderRadius: 4, marginTop: 28 }}>
              <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--brand-secondary)' }}>Code généré (conservez-le)</div>
              <div data-testid="gift-code" style={{ fontFamily: 'Courier New, monospace', fontSize: 22, marginTop: 8, color: 'var(--text)', letterSpacing: 2 }}>{state.data.code}</div>
            </div>
            <Link to="/" style={{ display: 'inline-block', marginTop: 30, color: 'var(--brand-secondary)', fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase' }}>← Retour à l'accueil</Link>
          </>
        )}
        {state.status === 'error' && (
          <>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: '#ff9d9d' }}>Confirmation en attente</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: 10 }}>{state.error}</p>
            <Link to="/cadeau" style={{ display: 'inline-block', marginTop: 20, color: 'var(--brand-secondary)' }}>← Retour</Link>
          </>
        )}
      </div>
    </div>
  )
}
