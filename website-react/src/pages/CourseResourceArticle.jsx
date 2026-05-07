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
  document: "Document",
}

// Glossary entry: "Term : definition" (Term up to 60 chars, no period inside).
const GLOSS_RE = /^([A-ZÀ-ÝŒÇ][^.:;\n]{1,60}?)\s*:\s+(.*)$/

function GlossaryParagraph({ text }) {
  const m = GLOSS_RE.exec(text)
  if (!m) return <p className="cra-p">{text}</p>
  return (
    <p className="cra-p cra-gloss-entry">
      <strong className="cra-gloss-term">{m[1].trim()}</strong>
      <span className="cra-gloss-sep"> — </span>
      {m[2]}
    </p>
  )
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

  const color = getCursusColor(article.course_id || courseId) || '#5A4632'
  const typeLabel = TYPE_LABELS[article.type] || 'Document pédagogique'
  const userTag = user?.email ? user.email.split('@')[0] : 'membre Sijill'
  const isGlossary = article.type === 'glossaire'

  return (
    <div className="cra cra-prestige" data-testid="course-resource-article">
      <article className="cra-article">
        {/* Watermark grain overlay */}
        <div aria-hidden className="cra-grain" />

        <div className="cra-inner">
          <Link
            to={`/cours/${courseId}`}
            className="cra-back"
            data-testid="resource-article-back"
            style={{ color }}
          >
            <span aria-hidden>&larr;</span> Retour au cours
          </Link>

          <div className="cra-pills">
            <span data-testid="resource-article-type" className="cra-pill" style={{ borderColor: `${color}55`, color }}>
              {typeLabel}
            </span>
            {article.scope === 'episode' && article.audio_title && (
              <span className="cra-pill-text">{article.audio_title}</span>
            )}
            {article.word_count > 0 && (
              <span className="cra-pill-meta">
                {article.word_count} mots · {Math.max(1, Math.round(article.word_count / 220))} min
              </span>
            )}
          </div>

          <h1 className="cra-title">{article.title}</h1>
          {article.course_title && (
            <div className="cra-course-title">{article.course_title}</div>
          )}

          <div className="cra-rule" style={{ background: color }} />

          {article.lead && (
            <p data-testid="resource-article-lead" className="cra-lead" style={{ borderLeftColor: color }}>
              {article.lead}
            </p>
          )}

          <div data-testid="resource-article-body" className="cra-body">
            {(article.sections || []).map((sec, si) => (
              <section key={si} className="cra-section">
                {sec.title && (
                  <h2 className="cra-h2" style={{ color }}>{sec.title}</h2>
                )}
                {(sec.paragraphs || []).map((p, pi) => (
                  isGlossary
                    ? <GlossaryParagraph key={pi} text={p} />
                    : <p key={pi} className="cra-p">{p}</p>
                ))}
              </section>
            ))}
          </div>

          <footer className="cra-footer" style={{ borderColor: `${color}33` }}>
            <div className="cra-foot-tag" style={{ color }}>Document réservé aux abonnés Sijill</div>
            <div className="cra-foot-meta">
              Lecture par <strong>{userTag}</strong> · Reproduction interdite
            </div>
            <Link
              to={`/cours/${courseId}`}
              className="btn-outline cra-foot-back"
              data-testid="resource-article-back-bottom"
            >
              &larr; Retour au cours
            </Link>
          </footer>
        </div>
      </article>
    </div>
  )
}
