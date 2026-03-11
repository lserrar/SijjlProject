import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api'
import { useAuth } from '../AuthContext'

export default function Register() {
  const [name, setName] = useState('')
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
      const data = await register(name, email, password)
      if (data.token) {
        loginUser(data.token, data.user)
        navigate('/')
      } else {
        navigate('/connexion')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page" data-testid="register-page">
      <div className="auth-card">
        <h1 className="auth-title">Inscription</h1>
        <p className="auth-subtitle">Créez votre compte Le Sijill</p>
        {error && <div className="auth-error" data-testid="register-error">{error}</div>}
        <form className="auth-form" onSubmit={handleSubmit}>
          <input className="auth-input" type="text" placeholder="Votre nom" value={name} onChange={e => setName(e.target.value)} required autoComplete="name" data-testid="register-name" />
          <input className="auth-input" type="email" placeholder="Adresse email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" data-testid="register-email" />
          <input className="auth-input" type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" data-testid="register-password" />
          <button type="submit" className="btn-accent auth-submit" disabled={loading} data-testid="register-submit">
            {loading ? 'Inscription...' : "S'inscrire"}
          </button>
        </form>
        <div className="auth-switch">
          Déjà un compte ? <Link to="/connexion" data-testid="register-to-login">Se connecter</Link>
        </div>
      </div>
    </div>
  )
}
