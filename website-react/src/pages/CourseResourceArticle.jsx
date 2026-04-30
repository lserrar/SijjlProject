import { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { getCourseResourceArticle } from '../api'
import { getCursusColor } from '../constants'
import { useAuth } from '../AuthContext'

const TYPE_LABELS = {
  script: "Script de l'épisode",
  glossaire: "Glossaire",
  biblio: "Bibliographie",
  bibliographie: "Bibliographie",
}

export default function CourseResourceArticle() {
  const { courseId } = useParams()
  const [params] = useSearchParams()
  const r2Key = params.get('key') || ''
  const { user } = useAuth()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!r2Key) { setError('no_key'); setLoading(false); return }
    setLoading(true); setError(null)
    getCourseResourceArticle(courseId, r2Key)
      .then(d => { setArticle(d); setLoading(false) })
      .catch(e => { setError(e?.message || 'load_failed'); setLoading(false) })
  }, [courseId, r2Key])

  // Soft anti-copy: disable native context menu and Ctrl+S/P/A on this page
  useEffect(() => {
    const onCtx = (e) => e.preventDefault()
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && ['s', 'p', 'a'].includes(e.key.toLowerCase())) {
        e.preventDefault()
      }
    }
    document.addEventListener('contextmenu', onCtx)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('contextmenu', onCtx)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(() => {
    if (article?.title) document.title = `${article.title} — Sijill Project`
    return () => { document.title = 'Sijill Project' }
  }, [article])

  if (loading) {
    return <div className="loading" style={{ padding: '120px 24px', minHeight: '60vh' }}>Chargement du document…</div>
  }

  if (error === 'no_key' || (!article && error)) {
    return (
      <div className="container" data-testid="resource-article-error" style={{ padding: '140px 24px 80px', minHeight: '60vh' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24 }}>Document introuvable</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>
          Vérifiez que vous êtes connecté avec un abonnement actif.
        </p>
        <Link to={`/cours/${courseId}`} className="btn-outline" style={{ marginTop: 24 }}>
          Retour au cours
        </Link>
      </div>
    )
  }

  if (!article) return null

  const color = getCursusColor(article.course_id || courseId) || '#C9A84C'
  const typeLabel = TYPE_LABELS[article.type] || 'Document pédagogique'
  const userTag = user?.email ? user.email.split('@')[0] : 'membre Sijill'

  return (
    <div
      className="cra"
      data-testid="course-resource-article"
      style={{
        // Watermark: soft repeating pattern with the user's identifier (anti-screenshot deterrent)
        backgroundImage: `repeating-linear-gradient(-30deg, transparent 0 240px, rgba(255,255,255,0.025) 240px 480px)`,
        userSelect: 'text',
        WebkitUserSelect: 'text',
        paddingTop: 120,
        paddingBottom: 80,
      }}
    >
      <article
        className="ba"
        style={{ position: 'relative', maxWidth: 760, margin: '0 auto', padding: '0 24px' }}
      >
        {/* Watermark overlay */}
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0,
            pointerEvents: 'none',
            backgroundImage: `repeating-linear-gradient(-30deg, transparent 0 200px, rgba(255,255,255,0.04) 200px 400px)`,
            zIndex: 0,
          }}
        />
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Back link */}
          <Link
            to={`/cours/${courseId}`}
            className="ba-back"
            data-testid="resource-article-back"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontFamily: 'var(--font-display)', fontSize: 11,
              letterSpacing: 2, textTransform: 'uppercase',
              color: 'var(--text-muted)', textDecoration: 'none', marginBottom: 32,
            }}
          >
            <span aria-hidden>&larr;</span> Retour au cours
          </Link>

          {/* Pills row */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            <span
              data-testid="resource-article-type"
              style={{
                fontFamily: 'var(--font-display)', fontSize: 10,
                letterSpacing: 3, textTransform: 'uppercase',
                color, padding: '4px 12px',
                border: `1px solid ${color}55`, borderRadius: 2,
              }}
            >
              {typeLabel}
            </span>
            {article.scope === 'episode' && article.audio_title && (
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)' }}>
                {article.audio_title}
              </span>
            )}
            {article.word_count > 0 && (
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-dim)' }}>
                {article.word_count} mots · {Math.max(1, Math.round(article.word_count / 220))} min
              </span>
            )}
          </div>

          {/* Title */}
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 5vw, 44px)',
              lineHeight: 1.15,
              margin: '0 0 12px',
              color: 'var(--text)',
            }}
          >
            {article.title}
          </h1>

          {article.course_title && (
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', marginBottom: 32 }}>
              {article.course_title}
            </div>
          )}

          <div style={{ width: 60, height: 1, background: color, marginBottom: 32 }} />

          {/* Lead */}
          {article.lead && (
            <p
              data-testid="resource-article-lead"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 19, lineHeight: 1.6,
                color: 'var(--text)', marginBottom: 32,
                fontStyle: 'italic', opacity: 0.92,
                borderLeft: `2px solid ${color}`,
                padding: '4px 0 4px 20px',
              }}
            >
              {article.lead}
            </p>
          )}

          {/* Sections */}
          <div data-testid="resource-article-body">
            {(article.sections || []).map((sec, si) => (
              <section key={si} style={{ marginBottom: 32 }}>
                {sec.title && (
                  <h2
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 22, lineHeight: 1.25,
                      color, margin: '0 0 16px',
                      letterSpacing: 0.5,
                    }}
                  >
                    {sec.title}
                  </h2>
                )}
                {(sec.paragraphs || []).map((p, pi) => (
                  <p
                    key={pi}
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 17, lineHeight: 1.75,
                      color: 'var(--text)', marginBottom: 16,
                    }}
                  >
                    {p}
                  </p>
                ))}
              </section>
            ))}
          </div>

          {/* Footer */}
          <footer style={{ marginTop: 64, paddingTop: 32, borderTop: `1px solid ${color}33` }}>
            <div
              style={{
                fontFamily: 'var(--font-display)', fontSize: 10,
                letterSpacing: 2, textTransform: 'uppercase',
                color: 'var(--text-dim)', marginBottom: 12,
              }}
            >
              Document réservé aux abonnés Sijill
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)' }}>
              Lecture par <strong>{userTag}</strong> · Reproduction interdite
            </div>
            <Link
              to={`/cours/${courseId}`}
              className="btn-outline"
              data-testid="resource-article-back-bottom"
              style={{ marginTop: 24, display: 'inline-block' }}
            >
              &larr; Retour au cours
            </Link>
          </footer>
        </div>
      </article>
    </div>
  )
}
