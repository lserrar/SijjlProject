import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="site-footer" data-testid="site-footer">
      <div className="footer-top">
        <div>
          <div className="footer-brand">Sijill Project</div>
          <p className="footer-tagline">
            Parcours academiques en sciences islamiques.
            Philosophie, theologie, droit, litterature et spiritualite.
          </p>
        </div>
        <div>
          <div className="footer-col-title">Explorer</div>
          <ul className="footer-links">
            <li><Link to="/cursus">Tous les cursus</Link></li>
            <li><Link to="/connexion">Se connecter</Link></li>
            <li><Link to="/inscription">Creer un compte</Link></li>
          </ul>
        </div>
        <div>
          <div className="footer-col-title">A propos</div>
          <ul className="footer-links">
            <li><a href="#">Mentions legales</a></li>
            <li><a href="#">Contact</a></li>
            <li><a href="#">Conditions d'utilisation</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        Sijill Project &copy; {new Date().getFullYear()}. Tous droits reserves.
      </div>
    </footer>
  )
}
