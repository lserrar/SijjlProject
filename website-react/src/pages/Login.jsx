import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../api'
import { useAuth } from '../AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { loginUser } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(email, password)
      loginUser(data.token, data.user)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page" data-testid="login-page">
      <div className="auth-card">
        <h1 className="auth-title">Connexion</h1>
        <p className="auth-subtitle">Accédez à votre espace Sijill</p>
        {error && <div className="auth-error" data-testid="login-error">{error}</div>}
        <form className="auth-form" onSubmit={handleSubmit}>
          <input className="auth-input" type="email" placeholder="Adresse email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" data-testid="login-email" />
          <input className="auth-input" type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" data-testid="login-password" />
          <button type="submit" className="btn-accent auth-submit" disabled={loading} data-testid="login-submit">
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        <div className="auth-switch" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Link to="/mot-de-passe-oublie" data-testid="login-to-forgot" style={{ fontSize: 13 }}>Mot de passe oublié ?</Link>
          <span style={{ fontSize: 13 }}>Pas encore de compte ? <Link to="/inscription" data-testid="login-to-register">S'inscrire</Link></span>
        </div>
      </div>
    </div>
  )
}
