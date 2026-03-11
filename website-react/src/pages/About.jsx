export default function About() {
  return (
    <div data-testid="about-page">
      <section className="section" style={{ paddingTop: 140, maxWidth: 800, margin: '0 auto' }}>
        <div className="section-eyebrow" style={{ marginBottom: 24 }}>À propos</div>
        <h1 className="section-title" style={{ fontSize: 'clamp(32px, 4vw, 52px)', marginBottom: 48 }}>
          Le Sijill<span style={{ color: 'var(--accent)' }}>.</span>
        </h1>

        <p className="about-lead">
          Comprendre, transmettre, penser la pluralité des savoirs islamiques
        </p>

        <div className="about-body">
          <h2>Pourquoi Le Sijill ?</h2>
          <p>Parce que comprendre les savoirs du monde islamique est essentiel pour comprendre l'histoire globale des idées.</p>
          <p>Parce qu'il existe aujourd'hui un besoin profond d'accéder à ces héritages autrement que par des récits simplifiés, confessionnels ou polarisés.</p>
          <p>Parce que les sciences islamiques classiques offrent des outils irremplaçables pour repenser les rapports entre raison et révélation, entre rationalité et présence, entre concept et lumière, entre monde visible et mondes invisibles.</p>
          <p>Parce que ces savoirs continuent d'inspirer des recherches contemporaines en philosophie, théologie, anthropologie, sciences historiques, esthétique ou études comparées.</p>
          <p>Le Sijill est un espace où ces héritages sont présentés dans leur complexité, avec le sérieux qu'ils méritent, et avec la conviction qu'ils demeurent essentiels pour penser le monde aujourd'hui.</p>

          <h2>Qui sommes-nous ?</h2>
          <p>Le Sijill est une plateforme académique née d'une conviction : l'histoire intellectuelle du monde islamique constitue l'un des patrimoines les plus riches, les plus pluriels et les plus féconds de l'humanité, mais trop souvent, elle demeure inaccessible, fragmentaire ou déformée.</p>
          <p>La philosophie, le kalām, la théologie, l'exégèse, l'histoire du hadith, le soufisme spéculatif, l'art, la littérature et les sciences ont pourtant été, durant des siècles, les lieux d'élaboration d'une véritable culture de la complexité, capable d'accueillir des héritages multiples, de les transformer et de les faire dialoguer.</p>
          <p>Notre projet est né de cette intuition : offrir un espace rigoureux, exigeant et ouvert, permettant d'explorer ces savoirs dans leur complexité, leur diversité et leurs continuités internes.</p>
          <p>Le Sijill ne vise pas à simplifier ni à réécrire l'histoire. Il s'agit au contraire de restituer ce que fut la réalité plurielle du monde intellectuel islamique : un espace où les traditions se croisent, s'opposent et se fécondent mutuellement, où la philosophie grecque rencontre la théologie dialectique, où les systèmes aristotéliciens conversent avec les visions mystiques, et où l'articulation entre raison, révélation et intuition devient l'un des moteurs de la pensée.</p>

          <blockquote className="about-quote">
            <p>&laquo;&nbsp;La civilisation musulmane, dès ses débuts, a inclus un nombre bien plus important d'éléments d'origines diverses que la civilisation européenne. Dans son développement ultérieur, lorsqu'il y avait des conflits entre deux systèmes philosophiques divergents, elle n'a pas, de façon générale, éliminé l'un d'entre eux : elle leur a plutôt permis de coexister côte à côte ou à des niveaux différents.&nbsp;&raquo;</p>
            <cite>— Shlomo Pines</cite>
          </blockquote>

          <h2>Un projet académique structuré autour de quatre principes</h2>

          <h3>1. La rigueur scientifique comme exigence première</h3>
          <p>Tous les contenus proposés sur Le Sijill sont conçus ou présentés par des chercheurs, enseignants-chercheurs ou universitaires reconnus dans leur domaine. Nous ne proposons ni vulgarisation approximative, ni discours d'autorité, mais une transmission fondée sur les textes, les manuscrits, les éditions critiques et les travaux académiques contemporains.</p>

          <h3>2. Une vision globale des savoirs islamiques</h3>
          <p>L'Islam classique et prémoderne ne s'est jamais développé dans une seule direction. La pensée islamique est un espace à plusieurs dimensions, où se rencontrent :</p>
          <ul>
            <li>la <em>falsafa</em> héritière d'Aristote, Plotin et des écoles hellénistiques ;</li>
            <li>le <em>kalām</em>, forme singulière de théologie rationnelle ;</li>
            <li>l'exégèse et les sciences du hadith ;</li>
            <li>les traditions de sagesse orientale, persane et indienne ;</li>
            <li>le soufisme dans ses versions pratiques, théoriques et métaphysiques ;</li>
            <li>la philosophie politique, la cosmologie, la médecine, les mathématiques, l'astronomie ;</li>
            <li>les arts, la poésie, les récits mystiques, l'esthétique.</li>
          </ul>

          <h3>3. Une contextualisation historique précise</h3>
          <p>Comprendre le kalām sans saisir les débats du VIII<sup>e</sup> siècle ; comprendre Avicenne sans l'important mouvement de traduction du grec ; comprendre Ibn ʿArabī sans la crise des savoirs du XI<sup>e</sup> siècle ; comprendre Mullā Ṣadrā sans la culture safavide — tout cela est impossible. Nos modules replacent chaque œuvre dans son époque, dans son environnement politique, dans sa langue et dans son horizon conceptuel.</p>

          <h3>4. Une pédagogie adaptée aux rythmes contemporains</h3>
          <p>Nos modules sont construits autour de capsules de 6 à 21 minutes, chacune centrée sur une question précise, un texte, un auteur, une notion ou un débat. Une grande attention est portée à la visualisation : frises chronologiques, cartes, schémas conceptuels, portraits, citations commentées.</p>

          <h2>Une plateforme au service d'un héritage intellectuel pluriel</h2>
          <p>L'objectif de Le Sijill n'est pas de promouvoir une école, une confession, une vision ou un cadre doctrinal particuliers. Ce que nous souhaitons, c'est mettre en lumière :</p>
          <ul>
            <li>la richesse de la philosophie islamique dans ses formes orientales (al-Fārābī, Ibn Sīnā, Suhrawardī, Mullā Ṣadrā) et occidentales (Ibn Bājja, Ibn Ṭufayl, Averroès),</li>
            <li>les débats passionnés du kalām, des Muʿtazilites aux Ashʿarites en passant par les Māturīdites,</li>
            <li>la puissance littéraire et métaphysique du soufisme classique, d'al-Junayd à Ibn ʿArabī,</li>
            <li>l'apport décisif des savants non musulmans (chrétiens, sabéens, juifs) dans la transmission des savoirs,</li>
            <li>les formes multiples d'interprétation du Coran et de la Sunna,</li>
            <li>les interactions constantes entre monde islamique, héritage grec, pensée indienne et traditions persanes.</li>
          </ul>
          <p>Nous voulons montrer comment, à travers ces échanges, s'est formée ce que l'on pourrait appeler une « civilisation de la pensée », où le débat, la dissension et la controverse étaient des moteurs de la créativité intellectuelle.</p>
        </div>
      </section>
    </div>
  )
}
