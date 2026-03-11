import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Header() {
  const { user, logout } = useAuth()

  return (
    <header className="site-header" data-testid="site-header">
      <Link to="/" className="site-logo" data-testid="site-logo">
        <span className="logo-le">Le </span>Sijill<span className="logo-dot">.</span>
      </Link>
      <nav className="site-nav">
        <Link to="/cursus" data-testid="nav-cursus">Cursus</Link>
        <Link to="/catalogue" data-testid="nav-catalogue">Catalogue</Link>
        <Link to="/a-propos" data-testid="nav-about">À propos</Link>
      </nav>
      <div className="nav-auth">
        {user ? (
          <div className="user-menu">
            <span className="user-name">{user.name || user.email}</span>
            <div className="user-avatar" data-testid="user-avatar">
              {(user.name || user.email || '?')[0].toUpperCase()}
            </div>
            <button className="btn-logout" onClick={logout} data-testid="logout-btn">
              Quitter
            </button>
          </div>
        ) : (
          <>
            <Link to="/connexion" data-testid="nav-login">Connexion</Link>
            <Link to="/inscription" className="btn-accent" data-testid="nav-register">
              S'inscrire
            </Link>
          </>
        )}
      </div>
    </header>
  )
}
