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
      document.title = `${article.title} — Waraqa #${article.number} | Sijill Project`
      const meta = document.querySelector('meta[name="description"]')
      if (meta) meta.setAttribute('content', article.seo_description || '')
    }
    return () => { document.title = 'Sijill Project' }
  }, [article])

  if (loading) return <div className="blog-loading" style={{ minHeight: '60vh', paddingTop: '120px' }}>Chargement...</div>
  if (!article) return (
    <div className="blog-not-found" data-testid="blog-not-found">
      <div style={{ textAlign: 'center', paddingTop: '120px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', marginBottom: '16px' }}>Article introuvable</h2>
        <Link to="/blog" style={{ color: 'var(--accent)' }}>Retour au blog</Link>
      </div>
    </div>
  )

  return (
    <article data-testid="blog-article" className="blog-article-page">
      {/* Header */}
      <header className="ba-header">
        <Link to="/blog" className="ba-back" data-testid="blog-back-btn">
          <i className="fas fa-arrow-left" /> Waraqa
        </Link>

        <div className="ba-meta">
          <span className="ba-series">Waraqa #{article.number}</span>
          <span className="ba-date">{article.date_ah} / {article.date_ce}</span>
          <span className="ba-epoch">{article.epoch}</span>
        </div>

        <h1 className="ba-title">{article.title}</h1>

        <div className="ba-tags">
          {(article.tags || []).map(t => (
            <span key={t} className="ba-tag">{t}</span>
          ))}
        </div>

        <div className="ba-author">
          <i className="fas fa-pen-nib" style={{ marginRight: '8px', color: 'var(--accent)' }} />
          {article.author}
        </div>
      </header>

      {/* Body sections */}
      <div className="ba-body">
        {(article.body_sections || []).map((section, i) => (
          <div key={i} className={`ba-section ba-section-${section.type}`}>
            {section.type === 'section' && (
              <div className="ba-section-head">
                <span className="ba-section-emoji">{section.emoji}</span>
                <h2 className="ba-section-title">{section.title}</h2>
                <i className={SECTION_ICONS[section.title] || 'fas fa-bookmark'} style={{ marginLeft: 'auto', color: 'var(--text-dim)', fontSize: '14px' }} />
              </div>
            )}
            <div className="ba-section-content">
              {section.content.split('\n\n').map((para, pi) => (
                <p key={pi}>{para}</p>
              ))}
            </div>
          </div>
        ))}

        {/* Context box */}
        {article.context && (
          <aside className="ba-box ba-context">
            <div className="ba-box-header">
              <i className="fas fa-map-marked-alt" />
              <span>Contexte historique</span>
            </div>
            <div className="ba-box-content">
              {article.context.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </aside>
        )}

        {/* Portrait box */}
        {article.portrait && (
          <aside className="ba-box ba-portrait">
            <div className="ba-box-header">
              <i className="fas fa-user-circle" />
              <span>Portrait</span>
            </div>
            <div className="ba-box-content">
              {article.portrait.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </aside>
        )}

        {/* Thesis box */}
        {article.thesis && (
          <aside className="ba-box ba-thesis">
            <div className="ba-box-header">
              <i className="fas fa-scroll" />
              <span>La thèse de Waraqa #{article.number}</span>
            </div>
            <div className="ba-box-content">
              {article.thesis.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </aside>
        )}

        {/* References */}
        {article.references?.length > 0 && (
          <aside className="ba-box ba-refs">
            <div className="ba-box-header">
              <i className="fas fa-book" />
              <span>Références</span>
            </div>
            <div className="ba-box-content">
              {article.references.map((ref, i) => (
                <p key={i} className="ba-ref-item">{ref.text}</p>
              ))}
            </div>
          </aside>
        )}
      </div>

      {/* Footer */}
      <footer className="ba-footer">
        <div className="ba-footer-line" />
        <Link to="/blog" className="ba-footer-link">
          <i className="fas fa-arrow-left" /> Tous les articles Waraqa
        </Link>
      </footer>
    </article>
  )
}
