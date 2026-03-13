import { Helmet } from 'react-helmet-async'

export default function PolitiqueConfidentialite() {
  return (
    <div className="legal-page" data-testid="politique-confidentialite">
      <Helmet>
        <title>Politique de confidentialité | Sijill Project</title>
        <meta name="description" content="Politique de confidentialité et protection des données de Sijill Project." />
      </Helmet>

      <div className="legal-container">
        <h1 className="legal-title">Politique de confidentialité</h1>
        <div className="legal-rule" />

        <section className="legal-section">
          <h2>Responsable du traitement</h2>
          <p>
            <strong>Sijill Project SAS</strong><br />
            28 rue Saint-Lazare, 75009 Paris, France<br />
            Email : <a href="mailto:contact@sijillproject.com">contact@sijillproject.com</a>
          </p>
        </section>

        <section className="legal-section">
          <h2>Données collectées</h2>
          <p>Nous collectons les données suivantes dans le cadre de l'utilisation de nos services :</p>
          <ul>
            <li><strong>Données d'identification :</strong> nom, prénom, adresse email</li>
            <li><strong>Données de connexion :</strong> adresse IP, date et heure d'accès, navigateur utilisé</li>
            <li><strong>Données d'utilisation :</strong> progression dans les cours, historique d'écoute</li>
            <li><strong>Données de paiement :</strong> traitées de manière sécurisée par notre prestataire Stripe</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>Finalités du traitement</h2>
          <p>Vos données sont collectées pour les finalités suivantes :</p>
          <ul>
            <li>Gestion de votre compte utilisateur et authentification</li>
            <li>Accès aux contenus pédagogiques (audios, transcriptions, ressources)</li>
            <li>Traitement des paiements et gestion des abonnements</li>
            <li>Amélioration de nos services et de l'expérience utilisateur</li>
            <li>Communication relative à votre compte (emails transactionnels)</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>Base légale</h2>
          <p>Le traitement de vos données repose sur :</p>
          <ul>
            <li>L'exécution du contrat (accès aux services souscrits)</li>
            <li>Votre consentement (newsletter, communications marketing)</li>
            <li>L'intérêt légitime (amélioration des services, sécurité)</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>Durée de conservation</h2>
          <p>
            Vos données personnelles sont conservées pendant la durée de votre inscription sur la plateforme, puis pendant une durée de 3 ans après votre dernière activité, conformément aux obligations légales.
          </p>
        </section>

        <section className="legal-section">
          <h2>Partage des données</h2>
          <p>
            Vos données ne sont jamais vendues à des tiers. Elles peuvent être partagées avec nos sous-traitants techniques (hébergement, paiement) dans le strict cadre nécessaire à la fourniture de nos services.
          </p>
        </section>

        <section className="legal-section">
          <h2>Vos droits</h2>
          <p>Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul>
            <li><strong>Droit d'accès :</strong> obtenir la communication de vos données</li>
            <li><strong>Droit de rectification :</strong> demander la correction de données inexactes</li>
            <li><strong>Droit à l'effacement :</strong> demander la suppression de vos données</li>
            <li><strong>Droit à la portabilité :</strong> récupérer vos données dans un format structuré</li>
            <li><strong>Droit d'opposition :</strong> vous opposer au traitement de vos données</li>
          </ul>
          <p>
            Pour exercer ces droits, contactez-nous à : <a href="mailto:contact@sijillproject.com">contact@sijillproject.com</a>
          </p>
        </section>

        <section className="legal-section">
          <h2>Sécurité</h2>
          <p>
            Nous mettons en place des mesures techniques et organisationnelles appropriées pour protéger vos données contre l'accès non autorisé, la modification, la divulgation ou la destruction.
          </p>
        </section>

        <section className="legal-section">
          <h2>Réclamation</h2>
          <p>
            Si vous estimez que le traitement de vos données n'est pas conforme à la réglementation, vous pouvez introduire une réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés) : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>
          </p>
        </section>
      </div>
    </div>
  )
}
