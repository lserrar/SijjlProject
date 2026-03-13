import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'

const API_BASE = window.location.origin + '/api'

const SECTION_ICONS = {
  "TERRES D'ISLAM": "fas fa-globe-africa",
  "VIE INTELLECTUELLE": "fas fa-book-reader",
  "LES ÉCHANGES": "fas fa-exchange-alt",
  "LE RESTE DU MONDE": "fas fa-globe-americas",
  "CE QUE ÇA CHANGE": "fas fa-lightbulb",
  "POUR ALLER PLUS LOIN": "fas fa-graduation-cap",
}

export default function BlogArticle() {
  const { articleId } = useParams()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/blog/${articleId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => { setArticle(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [articleId])

  useEffect(() => {
    if (article) {
      document.title = `${article.title} — Sijill Times #${article.number} | Sijill Project`
      const meta = document.querySelector('meta[name="description"]')
      if (meta) meta.setAttribute('content', article.seo_description || '')
    }
    return () => { document.title = 'Sijill Project' }
  }, [article])

  if (loading) return <div className="st"><div className="st-loading" style={{ minHeight: '60vh', paddingTop: '140px' }}>Chargement...</div></div>
  if (!article) return (
    <div className="st" data-testid="blog-not-found">
      <div style={{ textAlign: 'center', paddingTop: '140px', minHeight: '60vh' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', marginBottom: '16px', color: '#1a1a1a' }}>Article introuvable</h2>
        <Link to="/blog" style={{ color: '#04D182' }}>Retour au blog</Link>
      </div>
    </div>
  )

  return (
    <div className="st" data-testid="blog-article">
      <article className="ba">
        {/* Header */}
        <header className="ba-hdr">
          <Link to="/blog" className="ba-back" data-testid="blog-back-btn">
            <i className="fas fa-arrow-left" /> Sijill Times
          </Link>

          <div className="ba-meta-row">
            <span className="ba-pill">N° {article.number}</span>
            <span className="ba-date-txt">{article.date_ah} / {article.date_ce}</span>
            <span className="ba-epoch-txt">{article.epoch}</span>
          </div>

          <h1 className="ba-hdl">{article.title}</h1>

          <div className="ba-tag-row">
            {(article.tags || []).map(t => (
              <span key={t} className="ba-tag">{t}</span>
            ))}
          </div>
        </header>

        {/* Hero image removed per user request */}

        {/* Hook / Introduction */}
        {article.hook && (
          <div className="ba-hook">
            <p>{article.hook}</p>
          </div>
        )}

        {/* Body sections */}
        <div className="ba-content">
          {(article.body_sections || []).map((section, i) => (
            <div key={i} className={`ba-sec ${section.type === 'intro' ? 'ba-sec--intro' : ''}`}>
              {section.type === 'section' && (
                <div className="ba-sec-hd">
                  <span className="ba-sec-roman">{section.roman}.</span>
                  <h2 className="ba-sec-ttl">{section.title}</h2>
                  <i className={SECTION_ICONS[section.title] || 'fas fa-bookmark'} />
                </div>
              )}
              <div className="ba-sec-body">
                {section.content.split('\n\n').map((para, pi) => (
                  <p key={pi}>{para}</p>
                ))}
              </div>
            </div>
          ))}

          {/* Carte politique */}
          {article.carte_politique?.length > 0 && (
            <aside className="ba-aside ba-aside--carte">
              <div className="ba-aside-hd">
                <i className="fas fa-map-marked-alt" />
                <span>Carte politique rapide</span>
              </div>
              <ul className="ba-carte-list">
                {article.carte_politique.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </aside>
          )}

          {/* Portrait */}
          {article.portrait && (
            <aside className="ba-aside ba-aside--portrait">
              <div className="ba-aside-hd">
                <i className="fas fa-user-circle" />
                <span>{article.portrait_header || 'Portrait'}</span>
              </div>
              <div className="ba-aside-body">
                {article.portrait.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </aside>
          )}

          {/* References */}
          {article.references?.length > 0 && (
            <aside className="ba-aside ba-aside--refs">
              <div className="ba-aside-hd">
                <i className="fas fa-book" />
                <span>Références</span>
              </div>
              <div className="ba-aside-body">
                {article.references.map((ref, i) => (
                  <div key={i} className="ba-ref">
                    <span className="ba-ref-type">{ref.type}</span>
                    <p>{ref.text}</p>
                  </div>
                ))}
              </div>
            </aside>
          )}
        </div>

        {/* Footer */}
        <footer className="ba-foot">
          <div className="ba-foot-rule" />
          <Link to="/blog" className="ba-foot-link">
            <i className="fas fa-arrow-left" /> Tous les articles
          </Link>
        </footer>
      </article>
    </div>
  )
}
