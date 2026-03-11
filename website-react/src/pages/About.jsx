const DOMAIN_TAGS = [
  { label: 'Falsafa', color: '#04D182' },
  { label: 'Kalām', color: '#8B5CF6' },
  { label: 'Soufisme', color: '#06B6D4' },
  { label: 'Exégèse', color: '#F59E0B' },
  { label: 'Poésie mystique', color: '#EC4899' },
  { label: 'Philosophie politique', color: '#C9A84C' },
  { label: 'Sciences du hadith', color: '#04D182' },
  { label: 'Ismaélisme', color: '#8B5CF6' },
  { label: 'Mathématiques', color: '#F59E0B' },
  { label: 'Astronomie', color: '#06B6D4' },
  { label: 'Médecine', color: '#EC4899' },
  { label: 'Géographie', color: '#C9A84C' },
  { label: 'Muʿtazilisme', color: '#04D182' },
  { label: 'Ashʿarisme', color: '#8B5CF6' },
  { label: 'Philosophie persane', color: '#06B6D4' },
]

const PRINCIPLES = [
  { num: '01', digit: '1', title: 'La rigueur scientifique comme exigence première', desc: 'Tous les contenus sont conçus par des chercheurs reconnus. Une transmission fondée sur les textes, les manuscrits et les travaux académiques contemporains.' },
  { num: '02', digit: '2', title: 'Une vision globale des savoirs islamiques', desc: "L'Islam classique ne s'est jamais développé dans une seule direction. Falsafa, kalām, soufisme, sciences naturelles, arts — un tissu intellectuel cohérent dans sa diversité." },
  { num: '03', digit: '3', title: 'Une contextualisation historique précise', desc: "Comprendre Avicenne sans le mouvement de traduction du grec, ou Ibn ʿArabī sans la crise des savoirs du XIe siècle, est impossible. Chaque œuvre replacée dans son époque." },
  { num: '04', digit: '4', title: 'Une pédagogie adaptée aux rythmes contemporains', desc: "Capsules de 6 à 21 minutes, chacune centrée sur une question précise. Un accès progressif à des matières exigeantes, sans sacrifier la complexité." },
]

function DiamondSeparator() {
  return (
    <div className="about-diamond-sep">
      <span className="about-diamond-sep-line" />
      <span className="about-diamond-sep-gem" />
      <span className="about-diamond-sep-line" />
    </div>
  )
}

export default function About() {
  return (
    <div data-testid="about-page" className="about-page-v3">

      {/* HERO MANIFESTE */}
      <section className="about-hero-v3">
        <div className="about-hero-circle-lg" />
        <div className="about-hero-circle-sm" />
        <div className="about-hero-gold-line" />

        <div className="about-eyebrow">
          <span className="about-eyebrow-line" />
          <span className="about-eyebrow-text">Notre identité</span>
        </div>

        <div className="about-hero-title-block">
          <h1 className="about-hero-title-main">Comprendre, transmettre,</h1>
          <p className="about-hero-title-italic">penser la pluralité des savoirs islamiques</p>
        </div>

        <p className="about-hero-intro">
          Une plateforme académique née d'une conviction : l'histoire intellectuelle du monde islamique constitue l'un des patrimoines les plus riches et les plus féconds de l'humanité.
        </p>
      </section>

      <DiamondSeparator />

      {/* POURQUOI SIJILL PROJECT ? */}
      <section className="about-section-v3">
        <h2 className="about-section-label-green">Pourquoi Sijill Project ?</h2>
        <p className="about-section-text-v3">
          Parce que comprendre les savoirs du monde islamique est <strong>essentiel pour comprendre l'histoire globale des idées</strong>.
          Parce qu'il existe aujourd'hui un besoin profond d'accéder à ces héritages autrement que par des récits simplifiés, confessionnels ou polarisés.
        </p>
        <p className="about-section-text-v3">
          Parce que ces savoirs continuent d'inspirer des recherches contemporaines en philosophie, théologie, anthropologie, sciences historiques et études comparées.
        </p>
      </section>

      {/* CITATION SHLOMO PINES */}
      <section className="about-quote-v3">
        <span className="about-quote-guillemet-v3">&ldquo;</span>
        <p className="about-quote-text-v3">
          La civilisation musulmane, dès ses débuts, a inclus un nombre bien plus important d'éléments d'origines diverses que la civilisation européenne. Elle n'a pas, de façon générale, éliminé les systèmes divergents : elle leur a plutôt permis de coexister côte à côte.
        </p>
        <div className="about-quote-divider-v3" />
        <cite className="about-quote-author-v3">Shlomo Pines · Philosophe et historien des sciences</cite>
      </section>

      <DiamondSeparator />

      {/* 4 PRINCIPES */}
      <section className="about-principles-v3">
        <div className="about-principles-header-v3">
          <h2 className="about-principles-title-v3">Quatre principes</h2>
          <span className="about-principles-line-v3" />
        </div>

        {PRINCIPLES.map((p, i) => (
          <div key={i} className="about-principle-card-v3" data-testid={`principle-card-${i}`}>
            <span className="about-principle-num-v3">{p.num}</span>
            <span className="about-principle-ghost-v3">{p.digit}</span>
            <h3 className="about-principle-title-v3">{p.title}</h3>
            <p className="about-principle-desc-v3">{p.desc}</p>
          </div>
        ))}
      </section>

      <DiamondSeparator />

      {/* DOMAINES EXPLORÉS */}
      <section className="about-domains-v3">
        <div className="about-principles-header-v3">
          <h2 className="about-principles-title-v3">Domaines explorés</h2>
          <span className="about-principles-line-v3" />
        </div>
        <div className="about-tags-grid">
          {DOMAIN_TAGS.map(tag => (
            <span key={tag.label} className="about-tag" style={{ borderColor: `${tag.color}40`, color: tag.color }}>
              {tag.label}
            </span>
          ))}
        </div>
      </section>

      <DiamondSeparator />

      {/* NOTRE AMBITION */}
      <section className="about-vision-v3">
        <div className="about-vision-top-line" />
        <h2 className="about-vision-label">Notre ambition</h2>
        <p className="about-vision-text">
          Montrer comment, à travers ces échanges, s'est formée ce que l'on pourrait appeler une{' '}
          <strong>« civilisation de la pensée »</strong>,
          où le débat, la dissension et la controverse étaient des moteurs de la créativité intellectuelle.
        </p>
      </section>

      {/* FOOTER MARK */}
      <div className="about-footer-v3">
        <div className="about-footer-line-v3" />
        <div className="about-footer-logo-row">
          <span className="about-footer-logo-text">SIJILL PROJECT</span>
          <span className="about-footer-logo-dot" />
        </div>
        <span className="about-footer-devise">Rigueur · Pluralité · Transmission</span>
        <div className="about-footer-line-v3" />
      </div>
    </div>
  )
}
