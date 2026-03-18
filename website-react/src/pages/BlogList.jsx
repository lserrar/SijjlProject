import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import SEO from '../components/SEO'

const API_BASE = window.location.origin + '/api'

const CURSUS_LIST = [
  { id: 'A', name: 'A · Falsafa', color: '#04D182', tags: ['Falsafa', 'Ibn Sina', 'Al-Kindī', 'Averroès', 'Ibn Rushd', 'Mouvement de traduction', 'Maison de la Sagesse', 'Al-Ghazālī', 'Taḥāfut al-Falāsifa', 'Aristote', 'Averroïsme latin', 'Ibn Khaldūn', 'Muqaddima', 'ʿAsabiyya', 'Sociologie', 'Historiographie'] },
  { id: 'B', name: 'B · Kalām & Droit', color: '#8B5CF6', tags: ['Fiqh', 'Kalām', 'Abu Hanifa', 'École hanafite', 'Mālik ibn Anas', 'École mālikite', 'Qiyās', 'Sunna', 'ʿAmal'] },
  { id: 'C', name: 'C · Sciences islamiques', color: '#EAD637', tags: ['Hadīth', 'Al-Bukhārī', 'Ṣaḥīḥ', 'Sciences islamiques', 'Isnād', 'Canon sunnite', 'Hadīth sunnisme', 'Transoxiane'] },
  { id: 'D', name: 'D · Arts & Sciences', color: '#EC4899', tags: ['Adab', 'Poésie de cour', 'Al-Idrīsī', 'Géographie islamique', 'Cartographie', 'Nuzhat al-Mushtāq', 'Livre de Roger'] },
  { id: 'E', name: 'E · Mystique islamique', color: '#06B6D4', tags: ['Taṣawwuf', 'Soufisme', 'Mystique islamique', 'Al-Ḥallāj', 'Ana al-Ḥaqq'] },
  { id: 'F', name: 'F · Pensées non islamiques', color: '#F59E0B', tags: ['Maïmonide', 'Philosophie juive', 'Guide des égarés', 'Langue arabe', 'Diaspora andalouse'] },
]

function getArticleCursus(article) {
  const result = []
  const tags = article.tags || []
  for (const c of CURSUS_LIST) {
    if (tags.some(t => c.tags.includes(t))) result.push(c.id)
  }
  return result
}

function parseAH(dateAh) {
  if (!dateAh) return 0
  const m = dateAh.match(/(\d+)/)
  return m ? parseInt(m[1], 10) : 0
}

export default function BlogList() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState('newest')
  const [selectedCursus, setSelectedCursus] = useState('')

  useEffect(() => {
    fetch(`${API_BASE}/blog`)
      .then(r => r.json())
      .then(data => { setArticles(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    document.title = 'Sijill Times — Le monde en… | Sijill Project'
  }, [])

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

    if (selectedCursus) {
      result = result.filter(a => getArticleCursus(a).includes(selectedCursus))
    }

    result.sort((a, b) => {
      const ahA = parseAH(a.date_ah)
      const ahB = parseAH(b.date_ah)
      return sortOrder === 'newest' ? ahB - ahA : ahA - ahB
    })

    return result
  }, [articles, search, sortOrder, selectedCursus])

  const hasFilters = search || selectedCursus

  return (
    <div className="st" data-testid="blog-page">
      <SEO
        title="Sijill Times — Blog"
        description="Sijill Times : explorez l'histoire islamique à travers nos articles. Chroniques historiques, analyses et réflexions."
        path="/blog"
        keywords="histoire islamique, civilisation islamique, philosophie arabe, sciences islamiques, Sijill Times, blog académique, falsafa, kalām, soufisme, Ibn Khaldun"
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
              value={selectedCursus}
              onChange={e => setSelectedCursus(e.target.value)}
              className="st-filter-select"
              data-testid="blog-filter-cursus"
            >
              <option value="">Tous les cursus</option>
              {CURSUS_LIST.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
              className="st-filter-select"
              data-testid="blog-sort"
            >
              <option value="newest">Année AH : récent → ancien</option>
              <option value="oldest">Année AH : ancien → récent</option>
            </select>
          </div>
        </div>
        {hasFilters && (
          <div className="st-filter-status">
            <span>{filtered.length} article{filtered.length !== 1 ? 's' : ''} trouvé{filtered.length !== 1 ? 's' : ''}</span>
            <button className="st-filter-reset" onClick={() => { setSearch(''); setSelectedCursus('') }} data-testid="blog-filter-reset">
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
