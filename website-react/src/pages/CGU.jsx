import { Helmet } from 'react-helmet-async'

export default function CGU() {
  return (
    <div className="legal-page" data-testid="cgu">
      <Helmet>
        <title>Conditions générales d'utilisation | Sijill Project</title>
        <meta name="description" content="Conditions générales d'utilisation de la plateforme Sijill Project." />
      </Helmet>

      <div className="legal-container">
        <h1 className="legal-title">Conditions générales d'utilisation</h1>
        <div className="legal-rule" />

        <section className="legal-section">
          <h2>Article 1 — Objet</h2>
          <p>
            Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de la plateforme Sijill Project, éditée par Sijill Project SAS, 28 rue Saint-Lazare, 75009 Paris.
          </p>
          <p>
            Sijill Project est une plateforme éducative proposant des parcours académiques en sciences islamiques sous forme de cours audio, de transcriptions, de ressources bibliographiques et d'articles de blog.
          </p>
        </section>

        <section className="legal-section">
          <h2>Article 2 — Accès à la plateforme</h2>
          <p>L'accès à certains contenus est libre et gratuit (blog Sijill Times, présentation des cursus). L'accès aux contenus pédagogiques complets (audios, transcriptions) nécessite la création d'un compte et, le cas échéant, la souscription à un abonnement ou l'achat d'un cours.</p>
        </section>

        <section className="legal-section">
          <h2>Article 3 — Inscription</h2>
          <p>Pour créer un compte, l'utilisateur doit fournir des informations exactes et à jour. Il est responsable de la confidentialité de ses identifiants de connexion. Toute utilisation du compte est réputée faite par le titulaire du compte.</p>
        </section>

        <section className="legal-section">
          <h2>Article 4 — Contenus et propriété intellectuelle</h2>
          <p>Tous les contenus disponibles sur Sijill Project (cours, audios, textes, images, vidéos, logos) sont la propriété exclusive de Sijill Project SAS ou de ses ayants droit. Ils sont protégés par les lois françaises et internationales relatives à la propriété intellectuelle.</p>
          <p>L'utilisateur s'engage à ne pas :</p>
          <ul>
            <li>Reproduire, copier, distribuer ou publier les contenus sans autorisation</li>
            <li>Télécharger ou enregistrer les contenus audio sauf si cette fonctionnalité est explicitement prévue</li>
            <li>Partager ses identifiants de connexion avec des tiers</li>
            <li>Utiliser les contenus à des fins commerciales</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>Article 5 — Abonnements et paiements</h2>
          <p>Les tarifs des abonnements et des cours sont indiqués en euros TTC sur la plateforme. Les paiements sont traités de manière sécurisée via notre prestataire Stripe. L'utilisateur peut gérer son abonnement depuis son espace personnel.</p>
        </section>

        <section className="legal-section">
          <h2>Article 6 — Droit de rétractation</h2>
          <p>Conformément à l'article L.221-28 du Code de la consommation, le droit de rétractation ne s'applique pas aux contenus numériques fournis sur un support immatériel dont l'exécution a commencé avec l'accord de l'utilisateur. En acceptant ces CGU et en accédant au contenu, l'utilisateur renonce expressément à son droit de rétractation.</p>
        </section>

        <section className="legal-section">
          <h2>Article 7 — Responsabilités</h2>
          <p>Sijill Project s'efforce d'assurer la disponibilité et la qualité de la plateforme. Cependant, nous ne garantissons pas un accès ininterrompu. L'utilisateur utilise la plateforme sous sa propre responsabilité.</p>
        </section>

        <section className="legal-section">
          <h2>Article 8 — Résiliation</h2>
          <p>L'utilisateur peut supprimer son compte à tout moment en contactant <a href="mailto:contact@sijillproject.com">contact@sijillproject.com</a>. Sijill Project se réserve le droit de suspendre ou supprimer un compte en cas de violation des présentes CGU.</p>
        </section>

        <section className="legal-section">
          <h2>Article 9 — Modification des CGU</h2>
          <p>Sijill Project se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés des modifications par email ou notification sur la plateforme.</p>
        </section>

        <section className="legal-section">
          <h2>Article 10 — Droit applicable</h2>
          <p>Les présentes CGU sont régies par le droit français. Tout litige relatif à leur interprétation ou leur exécution relève de la compétence exclusive des tribunaux de Paris.</p>
        </section>

        <section className="legal-section">
          <h2>Contact</h2>
          <p>
            Pour toute question relative aux présentes CGU :<br />
            <strong>Sijill Project SAS</strong><br />
            28 rue Saint-Lazare, 75009 Paris<br />
            <a href="mailto:contact@sijillproject.com">contact@sijillproject.com</a>
          </p>
        </section>
      </div>
    </div>
  )
}
