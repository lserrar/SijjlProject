import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import SEO from '../components/SEO'

const API_BASE = window.location.origin + '/api'

export default function BlogList() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState('newest')
  const [selectedEpoch, setSelectedEpoch] = useState('')

  useEffect(() => {
    fetch(`${API_BASE}/blog`)
      .then(r => r.json())
      .then(data => { setArticles(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    document.title = 'Sijill Times — Le monde en… | Sijill Project'
  }, [])

  const epochs = useMemo(() => {
    const set = new Set()
    articles.forEach(a => { if (a.epoch) set.add(a.epoch) })
    return [...set].sort()
  }, [articles])

  const filtered = useMemo(() => {
    let result = [...articles]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(a =>
        (a.title || '').toLowerCase().includes(q) ||
        (a.seo_description || '').toLowerCase().includes(q) ||
        (a.epoch || '').toLowerCase().includes(q) ||
        (a.tags || []).some(t => t.toLowerCase().includes(q))
      )
    }

    if (selectedEpoch) {
      result = result.filter(a => a.epoch === selectedEpoch)
    }

    result.sort((a, b) => {
      const na = a.number || 0
      const nb = b.number || 0
      return sortOrder === 'newest' ? nb - na : na - nb
    })

    return result
  }, [articles, search, sortOrder, selectedEpoch])

  const hasFilters = search || selectedEpoch

  return (
    <div className="st" data-testid="blog-page">
      <SEO
        title="Sijill Times — Blog"
        description="Sijill Times : explorez l'histoire islamique à travers nos articles. Chroniques historiques, analyses et réflexions."
        path="/blog"
      />
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

      {/* Filters toolbar */}
      <div className="st-toolbar" data-testid="blog-toolbar">
        <div className="st-toolbar-inner">
          <div className="st-search" data-testid="blog-search">
            <i className="fas fa-search st-search-icon" />
            <input
              type="text"
              placeholder="Rechercher un article, un tag, une époque…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="st-search-input"
              data-testid="blog-search-input"
            />
            {search && (
              <button className="st-search-clear" onClick={() => setSearch('')} data-testid="blog-search-clear">
                <i className="fas fa-times" />
              </button>
            )}
          </div>
          <div className="st-filters">
            <select
              value={selectedEpoch}
              onChange={e => setSelectedEpoch(e.target.value)}
              className="st-filter-select"
              data-testid="blog-filter-epoch"
            >
              <option value="">Toutes les époques</option>
              {epochs.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
              className="st-filter-select"
              data-testid="blog-sort"
            >
              <option value="newest">Plus récent</option>
              <option value="oldest">Plus ancien</option>
            </select>
          </div>
        </div>
        {hasFilters && (
          <div className="st-filter-status">
            <span>{filtered.length} article{filtered.length !== 1 ? 's' : ''} trouvé{filtered.length !== 1 ? 's' : ''}</span>
            <button className="st-filter-reset" onClick={() => { setSearch(''); setSelectedEpoch('') }} data-testid="blog-filter-reset">
              Réinitialiser
            </button>
          </div>
        )}
      </div>

      {/* Articles */}
      <main className="st-main">
        {loading ? (
          <div className="st-loading">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="st-empty">
            {hasFilters ? 'Aucun article ne correspond à votre recherche.' : 'Aucun article publié pour le moment.'}
          </div>
        ) : (
          <div className="st-grid">
            {filtered.map((a, i) => (
              <Link
                to={`/blog/${a.id}`}
                key={a.id}
                className={`st-card ${i === 0 && !hasFilters ? 'st-card--featured' : ''}`}
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
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
