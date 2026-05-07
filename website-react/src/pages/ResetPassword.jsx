import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { validateResetToken, resetPassword } from '../api'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') || ''

  const [tokenStatus, setTokenStatus] = useState('checking') // checking | valid | invalid
  const [maskedEmail, setMaskedEmail] = useState('')
  const [pwd, setPwd] = useState('')
  const [pwdConfirm, setPwdConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) { setTokenStatus('invalid'); return }
    validateResetToken(token)
      .then(d => {
        setTokenStatus('valid')
        if (d?.email_masked || d?.email) setMaskedEmail(d.email_masked || d.email)
      })
      .catch(() => setTokenStatus('invalid'))
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (pwd.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return }
    if (pwd !== pwdConfirm) { setError('Les deux mots de passe ne correspondent pas.'); return }
    setSubmitting(true)
    try {
      await resetPassword(token, pwd)
      setDone(true)
      setTimeout(() => navigate('/connexion'), 3500)
    } catch (err) {
      setError(err.message || 'Erreur lors de la réinitialisation.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page" data-testid="reset-password-page">
      <div className="auth-card">
        <h1 className="auth-title">Nouveau mot de passe</h1>

        {tokenStatus === 'checking' && (
          <p className="auth-subtitle" data-testid="reset-checking">Vérification du lien…</p>
        )}

        {tokenStatus === 'invalid' && (
          <div data-testid="reset-invalid">
            <p className="auth-subtitle" style={{ marginBottom: 24 }}>
              Ce lien est invalide ou a expiré (validité : 1 heure).
            </p>
            <Link
              to="/mot-de-passe-oublie"
              className="btn-accent auth-submit"
              style={{ display: 'inline-block', textAlign: 'center', textDecoration: 'none' }}
              data-testid="reset-request-new-link"
            >
              Demander un nouveau lien
            </Link>
            <div className="auth-switch">
              <Link to="/connexion">Retour à la connexion</Link>
            </div>
          </div>
        )}

        {tokenStatus === 'valid' && !done && (
          <>
            <p className="auth-subtitle">
              {maskedEmail
                ? <>Réinitialisation pour <strong>{maskedEmail}</strong>. Choisissez un nouveau mot de passe (6 caractères minimum).</>
                : <>Choisissez un nouveau mot de passe (6 caractères minimum).</>}
            </p>
            {error && <div className="auth-error" data-testid="reset-error">{error}</div>}
            <form className="auth-form" onSubmit={handleSubmit}>
              <input
                className="auth-input"
                type="password"
                placeholder="Nouveau mot de passe"
                value={pwd}
                onChange={e => setPwd(e.target.value)}
                required
                minLength={6}
                autoFocus
                autoComplete="new-password"
                data-testid="reset-password-input"
              />
              <input
                className="auth-input"
                type="password"
                placeholder="Confirmer le mot de passe"
                value={pwdConfirm}
                onChange={e => setPwdConfirm(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                data-testid="reset-password-confirm"
              />
              <button
                type="submit"
                className="btn-accent auth-submit"
                disabled={submitting}
                data-testid="reset-password-submit"
              >
                {submitting ? 'Mise à jour…' : 'Réinitialiser le mot de passe'}
              </button>
            </form>
          </>
        )}

        {done && (
          <div data-testid="reset-success">
            <p className="auth-subtitle" style={{ marginBottom: 16 }}>
              Mot de passe réinitialisé avec succès.
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
              Redirection vers la page de connexion…
            </p>
            <Link
              to="/connexion"
              className="btn-accent auth-submit"
              style={{ display: 'inline-block', textAlign: 'center', textDecoration: 'none' }}
              data-testid="reset-go-to-login"
            >
              Se connecter maintenant
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
