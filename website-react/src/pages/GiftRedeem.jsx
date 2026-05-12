import { useEffect, useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { lookupGiftCard, redeemGiftCard } from '../api'
import { useAuth } from '../AuthContext'

export default function GiftRedeem() {
  const [params] = useSearchParams()
  const initCode = params.get('code') || ''
  const [code, setCode] = useState(initCode)
  const [preview, setPreview] = useState(null)
  const [previewErr, setPreviewErr] = useState(null)
  const [loading, setLoading] = useState(false)
  const [redeeming, setRedeeming] = useState(false)
  const [result, setResult] = useState(null)
  const { user } = useAuth() || {}
  const navigate = useNavigate()

  useEffect(() => { document.title = "J'ai reçu un cadeau · Sijill" }, [])
  useEffect(() => { if (initCode) handleLookup(initCode) }, [initCode])

  async function handleLookup(c = code) {
    setPreviewErr(null); setPreview(null)
    const v = (c || '').trim().toUpperCase()
    if (!v) return
    setLoading(true)
    try {
      const data = await lookupGiftCard(v)
      setPreview(data)
    } catch (e) {
      setPreviewErr(e?.message || 'Code introuvable')
    } finally {
      setLoading(false)
    }
  }

  async function handleRedeem() {
    if (!user) {
      navigate(`/connexion?next=${encodeURIComponent('/cadeau/recu?code=' + encodeURIComponent(code))}`)
      return
    }
    setRedeeming(true)
    try {
      const r = await redeemGiftCard(code.trim().toUpperCase())
      setResult(r)
    } catch (e) {
      setPreviewErr(e?.message || 'Échec de l\'activation')
    } finally { setRedeeming(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '60px 24px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }} data-testid="gift-redeem">
        <Link to="/" style={{ color: 'var(--brand-secondary)', fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase' }}>← Retour</Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 34, marginTop: 18 }}>J'ai reçu un cadeau Sijill</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14.5, lineHeight: 1.6 }}>
          Saisissez le code reçu par email pour activer votre abonnement.
        </p>

        {!result && (
          <>
            <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                   onBlur={() => handleLookup()}
                   data-testid="gift-code-input"
                   placeholder="SIJILL-XXXX-XXXX-XXXX"
                   style={{
                     width: '100%', marginTop: 24, padding: '14px 18px',
                     background: 'var(--bg-tertiary, #1a1a1a)', border: '1px solid var(--border-subtle)',
                     color: 'var(--text)', fontSize: 17, letterSpacing: 2, fontFamily: 'Courier New, monospace',
                     textAlign: 'center', borderRadius: 4,
                   }} />
            {loading && <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>Vérification…</p>}
            {previewErr && <p data-testid="gift-error" style={{ color: '#ff8888', marginTop: 10, fontSize: 13 }}>{previewErr}</p>}

            {preview && (
              <div style={{ marginTop: 28, padding: '24px 26px', background: 'rgba(31,174,107,0.08)', border: '1px solid rgba(31,174,107,0.35)', borderRadius: 6 }}>
                <p style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--brand-secondary)', margin: 0 }}>Aperçu du cadeau</p>
                <h2 style={{ marginTop: 8, fontSize: 22, fontFamily: 'var(--font-display)' }}>{preview.plan_label}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginTop: 4 }}>
                  De la part de <strong style={{ color: 'var(--text)' }}>{preview.purchaser_name}</strong> · Pour <strong style={{ color: 'var(--text)' }}>{preview.recipient_name}</strong>
                </p>
                {preview.personal_message && (
                  <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(0,0,0,0.25)', borderLeft: '2px solid var(--brand-secondary)', fontStyle: 'italic', color: 'var(--text)', fontFamily: 'EB Garamond, Georgia, serif', fontSize: 15 }}>
                    « {preview.personal_message} »
                  </div>
                )}
                <button onClick={handleRedeem} disabled={redeeming} data-testid="gift-redeem-btn"
                        style={{
                          marginTop: 22, width: '100%', padding: '14px',
                          background: 'var(--brand-secondary)', color: '#0d0c0a',
                          border: 'none', fontSize: 12.5, letterSpacing: 2.5, textTransform: 'uppercase',
                          fontWeight: 600, cursor: redeeming ? 'progress' : 'pointer', borderRadius: 3,
                        }}>
                  {redeeming ? 'Activation…' : user ? 'Activer mon cadeau' : 'Se connecter pour activer'}
                </button>
              </div>
            )}
          </>
        )}

        {result && (
          <div data-testid="gift-success" style={{ marginTop: 28, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, margin: '0 auto', background: 'var(--brand-secondary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: '#0d0c0a', marginBottom: 18 }}>✓</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26 }}>Cadeau activé !</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
              Votre <strong style={{ color: 'var(--text)' }}>{result.plan_label}</strong> a été ajouté à votre compte. <br/>
              Accès jusqu'au <strong style={{ color: 'var(--text)' }}>{new Date(result.subscription_end_date).toLocaleDateString('fr-FR')}</strong>.
            </p>
            <Link to="/catalogue" style={{ display: 'inline-block', marginTop: 22, padding: '12px 24px', background: 'var(--brand-secondary)', color: '#0d0c0a', textDecoration: 'none', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', borderRadius: 3 }}>
              Découvrir le catalogue
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
