import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../AuthContext'

const APP_URL = 'https://app.sijillproject.com'

export default function Header() {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <>
      <header className="site-header" data-testid="site-header">
        <Link to="/" className="site-logo" data-testid="site-logo">
          Sijill <span className="logo-project">Project</span><span className="logo-dot">.</span>
        </Link>
        <nav className="site-nav" data-testid="desktop-nav">
          <Link to="/cursus" data-testid="nav-cursus">Cursus</Link>
          <Link to="/catalogue" data-testid="nav-catalogue">Catalogue</Link>
          <Link to="/intervenants" data-testid="nav-intervenants">Intervenants</Link>
          <Link to="/blog" data-testid="nav-blog">Blog</Link>
          <Link to="/a-propos" data-testid="nav-about">A propos</Link>
        </nav>
        <div className="nav-auth" data-testid="nav-auth">
          <Link to="/#preinscription" className="btn-prereg" data-testid="nav-prereg">
            Pre-inscription
          </Link>
          <a href={APP_URL} className="btn-open-app" data-testid="nav-open-app" target="_blank" rel="noopener noreferrer">
            <i className="fas fa-circle-play" />
            Ouvrir l'App
          </a>
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
              <Link to="/inscription" data-testid="nav-register">S'inscrire</Link>
              <Link to="/connexion" className="btn-accent" data-testid="nav-login">
                Connexion
              </Link>
            </>
          )}
        </div>
        <button
          className={`mobile-menu-btn${menuOpen ? ' active' : ''}`}
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Menu"
          data-testid="mobile-menu-btn"
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
      </header>

      {/* Mobile overlay menu */}
      <div className={`mobile-menu-overlay${menuOpen ? ' open' : ''}`} data-testid="mobile-menu-overlay">
        <nav className="mobile-menu-nav" data-testid="mobile-nav">
          <Link to="/cursus" data-testid="mobile-nav-cursus">Cursus</Link>
          <Link to="/catalogue" data-testid="mobile-nav-catalogue">Catalogue</Link>
          <Link to="/intervenants" data-testid="mobile-nav-intervenants">Intervenants</Link>
          <Link to="/blog" data-testid="mobile-nav-blog">Blog</Link>
          <Link to="/a-propos" data-testid="mobile-nav-about">A propos</Link>
          <div className="mobile-menu-divider" />
          <a href={APP_URL} className="mobile-menu-app-link" data-testid="mobile-nav-open-app">
            <i className="fas fa-circle-play" /> Ouvrir l'App
          </a>
          <Link to="/#preinscription" className="btn-accent" data-testid="mobile-nav-prereg" onClick={() => setMenuOpen(false)}>
            Pre-inscription
          </Link>
          <div className="mobile-menu-divider" />
          {user ? (
            <>
              <span className="mobile-menu-user">{user.name || user.email}</span>
              <button className="btn-accent mobile-menu-logout" onClick={() => { logout(); setMenuOpen(false) }} data-testid="mobile-logout-btn">
                Quitter
              </button>
            </>
          ) : (
            <>
              <Link to="/inscription" data-testid="mobile-nav-register">S'inscrire</Link>
              <Link to="/connexion" className="btn-accent" data-testid="mobile-nav-login">
                Connexion
              </Link>
            </>
          )}
        </nav>
      </div>
    </>
  )
}
