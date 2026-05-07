import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await forgotPassword(email.trim().toLowerCase())
      setSubmitted(true)
    } catch (err) {
      setError(err.message || "Une erreur est survenue. Réessayez.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page" data-testid="forgot-password-page">
      <div className="auth-card">
        <h1 className="auth-title">Mot de passe oublié</h1>

        {submitted ? (
          <div data-testid="forgot-password-success">
            <p className="auth-subtitle" style={{ marginBottom: 24 }}>
              Si un compte existe avec l'adresse <strong>{email}</strong>, vous recevrez un email contenant un lien de réinitialisation valable <strong>1 heure</strong>.
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 32 }}>
              Pensez à vérifier vos courriers indésirables si vous ne le voyez pas dans les prochaines minutes.
            </p>
            <Link
              to="/connexion"
              className="btn-accent auth-submit"
              style={{ display: 'inline-block', textAlign: 'center', textDecoration: 'none' }}
              data-testid="forgot-password-back-to-login"
            >
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <>
            <p className="auth-subtitle">
              Saisissez votre adresse email. Nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>
            {error && <div className="auth-error" data-testid="forgot-password-error">{error}</div>}
            <form className="auth-form" onSubmit={handleSubmit}>
              <input
                className="auth-input"
                type="email"
                placeholder="Adresse email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
                data-testid="forgot-password-email"
              />
              <button
                type="submit"
                className="btn-accent auth-submit"
                disabled={loading}
                data-testid="forgot-password-submit"
              >
                {loading ? 'Envoi en cours…' : 'Envoyer le lien'}
              </button>
            </form>
            <div className="auth-switch">
              <Link to="/connexion" data-testid="forgot-password-to-login">Retour à la connexion</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
