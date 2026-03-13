import { Helmet } from 'react-helmet-async'

export default function MentionsLegales() {
  return (
    <div className="legal-page" data-testid="mentions-legales">
      <Helmet>
        <title>Mentions légales | Sijill Project</title>
        <meta name="description" content="Mentions légales de Sijill Project SAS." />
      </Helmet>

      <div className="legal-container">
        <h1 className="legal-title">Mentions légales</h1>
        <div className="legal-rule" />

        <section className="legal-section">
          <h2>Éditeur du site</h2>
          <p>
            <strong>Sijill Project SAS</strong><br />
            28 rue Saint-Lazare<br />
            75009 Paris, France<br />
            Email : <a href="mailto:contact@sijillproject.com">contact@sijillproject.com</a>
          </p>
        </section>

        <section className="legal-section">
          <h2>Directeur de la publication</h2>
          <p>Le directeur de la publication est le représentant légal de Sijill Project SAS.</p>
        </section>

        <section className="legal-section">
          <h2>Hébergement</h2>
          <p>
            Le site est hébergé par Hostinger International Ltd.<br />
            61 Lordou Vironos Street, 6023 Larnaca, Chypre.<br />
            Site web : <a href="https://www.hostinger.fr" target="_blank" rel="noopener noreferrer">www.hostinger.fr</a>
          </p>
        </section>

        <section className="legal-section">
          <h2>Propriété intellectuelle</h2>
          <p>
            L'ensemble du contenu du site Sijill Project (textes, images, vidéos, audios, logos, marques, base de données, structure) est protégé par le droit de la propriété intellectuelle. Toute reproduction, représentation, modification, publication ou adaptation de tout ou partie des éléments du site est strictement interdite sans l'autorisation écrite préalable de Sijill Project SAS.
          </p>
        </section>

        <section className="legal-section">
          <h2>Données personnelles</h2>
          <p>
            Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés, vous disposez de droits sur vos données personnelles. Consultez notre <a href="/politique-de-confidentialite">Politique de confidentialité</a> pour en savoir plus.
          </p>
        </section>

        <section className="legal-section">
          <h2>Cookies</h2>
          <p>
            Le site utilise des cookies nécessaires à son fonctionnement (authentification, préférences). Aucun cookie publicitaire ou de traçage tiers n'est utilisé.
          </p>
        </section>

        <section className="legal-section">
          <h2>Droit applicable</h2>
          <p>
            Le présent site et ses mentions légales sont régis par le droit français. En cas de litige, les tribunaux de Paris seront seuls compétents.
          </p>
        </section>
      </div>
    </div>
  )
}
