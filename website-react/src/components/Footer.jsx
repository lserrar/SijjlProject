import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="site-footer" data-testid="site-footer">
      <div className="footer-top">
        <div>
          <div className="footer-brand">Sijill Project<span style={{ color: 'var(--accent)' }}>.</span></div>
          <p className="footer-tagline">
            Parcours académiques en sciences islamiques.
            Philosophie, théologie, droit, littérature et histoire de la mystique islamique.
          </p>
          <div className="footer-social">
            <a href="https://www.facebook.com/sijill.project" target="_blank" rel="noopener noreferrer" title="Facebook" data-testid="footer-facebook">
              <i className="fab fa-facebook-f" />
            </a>
            <a href="https://www.instagram.com/sijillproject/" target="_blank" rel="noopener noreferrer" title="Instagram" data-testid="footer-instagram">
              <i className="fab fa-instagram" />
            </a>
            <a href="#" target="_blank" rel="noopener noreferrer" title="YouTube" data-testid="footer-youtube">
              <i className="fab fa-youtube" />
            </a>
          </div>
        </div>
        <div>
          <div className="footer-col-title">Explorer</div>
          <ul className="footer-links">
            <li><Link to="/cursus">Tous les cursus</Link></li>
            <li><Link to="/catalogue">Catalogue</Link></li>
            <li><Link to="/blog">Sijill Times</Link></li>
            <li><Link to="/a-propos">À propos</Link></li>
          </ul>
        </div>
        <div>
          <div className="footer-col-title">Compte</div>
          <ul className="footer-links">
            <li><Link to="/connexion">Se connecter</Link></li>
            <li><Link to="/inscription">Créer un compte</Link></li>
          </ul>
          <div className="footer-col-title" style={{ marginTop: 24 }}>Applications</div>
          <ul className="footer-links">
            <li><a href="#" data-testid="footer-appstore"><i className="fab fa-apple" style={{ marginRight: 6 }} />App Store</a></li>
            <li><a href="#" data-testid="footer-playstore"><i className="fab fa-google-play" style={{ marginRight: 6 }} />Google Play</a></li>
          </ul>
        </div>
        <div>
          <div className="footer-col-title">Légal</div>
          <ul className="footer-links">
            <li><Link to="/mentions-legales">Mentions légales</Link></li>
            <li><Link to="/conditions-utilisation">Conditions d'utilisation</Link></li>
            <li><Link to="/politique-de-confidentialite">Confidentialité</Link></li>
            <li><a href="mailto:contact@sijillproject.com">Contact</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        Sijill Project &copy; {new Date().getFullYear()}. Tous droits réservés.
      </div>
    </footer>
  )
}
