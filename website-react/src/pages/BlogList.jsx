import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const API_BASE = window.location.origin + '/api'

const EPOCH_COLORS = {
  'Époque abbasside': '#C9A84C',
  'Époque omeyyade': '#04D182',
  'Époque bouyide': '#8B5CF6',
}

function DiamondSep() {
  return (
    <div className="about-diamond-sep">
      <span className="about-diamond-sep-line" />
      <span className="about-diamond-sep-gem" />
      <span className="about-diamond-sep-line" />
    </div>
  )
}

export default function BlogList() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/blog`)
      .then(r => r.json())
      .then(data => { setArticles(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div data-testid="blog-page" className="blog-page">

      {/* SEO: Hidden h1 for crawlers */}
      <section className="blog-hero">
        <div className="blog-hero-ornament" />
        <div className="blog-hero-eyebrow">
          <span className="about-eyebrow-line" />
          <span className="about-eyebrow-text">Accès libre</span>
        </div>
        <h1 className="blog-hero-title">Waraqa</h1>
        <p className="blog-hero-subtitle">Chroniques de la civilisation islamique</p>
        <p className="blog-hero-desc">
          Une série d'articles autour des dates clés de l'histoire islamique.
          Chaque numéro explore une année charnière, ses acteurs et ses transformations.
        </p>
      </section>

      <DiamondSep />

      <section className="blog-list-section">
        <div className="container">
          {loading ? (
            <div className="blog-loading">Chargement des articles...</div>
          ) : articles.length === 0 ? (
            <div className="blog-empty">Aucun article publié pour le moment.</div>
          ) : (
            <div className="blog-grid">
              {articles.map((a, i) => (
                <Link
                  to={`/blog/${a.id}`}
                  key={a.id}
                  className="blog-card"
                  data-testid={`blog-card-${a.id}`}
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <div className="blog-card-number">
                    <span className="blog-card-hash">#</span>
                    <span className="blog-card-num">{a.number}</span>
                  </div>
                  <div className="blog-card-content">
                    <div className="blog-card-date">
                      <span className="blog-card-ah">{a.date_ah}</span>
                      <span className="blog-card-sep">/</span>
                      <span className="blog-card-ce">{a.date_ce}</span>
                    </div>
                    <div className="blog-card-epoch" style={{ color: EPOCH_COLORS[a.epoch] || 'var(--accent)' }}>
                      {a.epoch}
                    </div>
                    <h2 className="blog-card-title">{a.title}</h2>
                    <p className="blog-card-excerpt">{a.seo_description}</p>
                    <div className="blog-card-tags">
                      {(a.tags || []).slice(0, 4).map(t => (
                        <span key={t} className="blog-card-tag">{t}</span>
                      ))}
                    </div>
                    <div className="blog-card-author">
                      <span className="blog-card-author-label">Par</span> {a.author}
                    </div>
                  </div>
                  <div className="blog-card-arrow">
                    <i className="fas fa-arrow-right" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
