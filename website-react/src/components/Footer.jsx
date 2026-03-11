import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="site-footer" data-testid="site-footer">
      <div className="footer-top">
        <div>
          <div className="footer-brand">Le Sijill<span style={{ color: 'var(--accent)' }}>.</span></div>
          <p className="footer-tagline">
            Parcours académiques en sciences islamiques.
            Philosophie, théologie, droit, littérature et spiritualité.
          </p>
        </div>
        <div>
          <div className="footer-col-title">Explorer</div>
          <ul className="footer-links">
            <li><Link to="/cursus">Tous les cursus</Link></li>
            <li><Link to="/catalogue">Catalogue</Link></li>
            <li><Link to="/a-propos">À propos</Link></li>
          </ul>
        </div>
        <div>
          <div className="footer-col-title">Compte</div>
          <ul className="footer-links">
            <li><Link to="/connexion">Se connecter</Link></li>
            <li><Link to="/inscription">Créer un compte</Link></li>
          </ul>
        </div>
        <div>
          <div className="footer-col-title">Légal</div>
          <ul className="footer-links">
            <li><a href="#">Mentions légales</a></li>
            <li><a href="#">Conditions d'utilisation</a></li>
            <li><a href="#">Contact</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        Le Sijill &copy; {new Date().getFullYear()}. Tous droits réservés.
      </div>
    </footer>
  )
}
