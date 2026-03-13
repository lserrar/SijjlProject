import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const API_BASE = window.location.origin + '/api'

export default function BlogList() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/blog`)
      .then(r => r.json())
      .then(data => { setArticles(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    document.title = 'Sijill Times — Le monde en… | Sijill Project'
  }, [])

  return (
    <div className="st" data-testid="blog-page">
      {/* Hero */}
      <header className="st-hero">
        <div className="st-hero-inner">
          <p className="st-eyebrow">Accès libre</p>
          <h1 className="st-masthead">Sijill Times</h1>
          <div className="st-rule" />
          <p className="st-series-name">Le monde en…</p>
          <p className="st-series-sub">Chroniques de la civilisation islamique</p>
          <p className="st-hero-desc">
            Chaque numéro explore une année charnière de l'histoire islamique, ses acteurs et ses transformations.
          </p>
        </div>
      </header>

      {/* Articles */}
      <main className="st-main">
        {loading ? (
          <div className="st-loading">Chargement...</div>
        ) : articles.length === 0 ? (
          <div className="st-empty">Aucun article publié pour le moment.</div>
        ) : (
          <div className="st-grid">
            {articles.map((a, i) => {
              return (
                <Link
                  to={`/blog/${a.id}`}
                  key={a.id}
                  className={`st-card ${i === 0 ? 'st-card--featured' : ''}`}
                  data-testid={`blog-card-${a.id}`}
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <div className="st-card-img">
                    <img
                      src={`${API_BASE}/blog/image/${a.id}`}
                      alt={a.title}
                      loading="lazy"
                      onError={(e) => { e.target.parentElement.style.display = 'none' }}
                    />
                  </div>
                  <div className="st-card-body">
                    <div className="st-card-meta">
                      <span className="st-card-num">N° {a.number}</span>
                      <span className="st-card-dot" />
                      <span className="st-card-epoch">{a.epoch}</span>
                    </div>
                    <div className="st-card-year">{a.date_ah} / {a.date_ce}</div>
                    <h2 className="st-card-title">{a.title}</h2>
                    <p className="st-card-excerpt">{a.seo_description}</p>
                    <div className="st-card-tags">
                      {(a.tags || []).slice(0, 4).map(t => (
                        <span key={t} className="st-card-tag">{t}</span>
                      ))}
                    </div>
                    <span className="st-card-read">Lire l'article <i className="fas fa-long-arrow-alt-right" /></span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
