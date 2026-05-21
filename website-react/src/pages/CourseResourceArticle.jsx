import { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { getCourseResourceArticle, downloadCourseResourcePdf } from '../api'
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

// Inline formatting markers emitted by the backend DOCX parser
// (`\u2999B\u2999…\u2999/B\u2999` and `\u2999I\u2999…\u2999/I\u2999`).
const RICH_TOKEN_RE = /(\u2999B\u2999|\u2999\/B\u2999|\u2999I\u2999|\u2999\/I\u2999)/

// Render text with inline <strong>/<em> reflecting the original Word
// run-level formatting. Tokens are well-formed and produced by the
// backend; we still close any dangling spans defensively.
function RichText({ text }) {
  if (!text || !text.includes('\u2999')) return <>{text}</>
  const parts = text.split(RICH_TOKEN_RE).filter(Boolean)
  const out = []
  let b = false, i = 0, key = 0
  for (const part of parts) {
    if (part === '\u2999B\u2999') { b += 1; continue }
    if (part === '\u2999/B\u2999') { b = Math.max(0, b - 1); continue }
    if (part === '\u2999I\u2999') { i += 1; continue }
    if (part === '\u2999/I\u2999') { i = Math.max(0, i - 1); continue }
    let node = part
    if (i > 0) node = <em key={`em-${key}`}>{node}</em>
    if (b > 0) node = <strong key={`b-${key}`}>{node}</strong>
    out.push(<span key={key++}>{node}</span>)
  }
  return <>{out}</>
}

// Strip every rich marker so headings / pills never carry the noise.
function plainText(s) {
  if (typeof s !== 'string') return s
  return s.replace(/\u2999\/?[BI]\u2999/g, '')
}

// Returns true if the paragraph is *entirely* bold (i.e. opens with [B] and
// closes with [/B] with no other content outside). Common Word pattern where
// authors fake a section title with bold instead of a Heading style.
function isFullyBold(text) {
  if (typeof text !== 'string') return false
  const trimmed = text.trim()
  if (!trimmed.startsWith('\u2999B\u2999')) return false
  if (!trimmed.endsWith('\u2999/B\u2999')) return false
  // Make sure there is no `[/B]` before the last marker (= would mean a
  // bold span then non-bold then bold again).
  const inner = trimmed.slice('\u2999B\u2999'.length, -('\u2999/B\u2999'.length))
  return !inner.includes('\u2999/B\u2999')
}

function GlossaryParagraph({ text }) {
  // Inline H3 marker emitted by the backend DOCX parser.
  if (typeof text === 'string' && text.startsWith('[H3]')) {
    return <h3 className="cra-h3" data-testid="article-h3">{plainText(text.slice(4)).trim()}</h3>
  }
  const stripped = plainText(text)
  const m = GLOSS_RE.exec(stripped)
  if (!m) return <p className="cra-p"><RichText text={text} /></p>
  return (
    <p className="cra-p cra-gloss-entry">
      <strong className="cra-gloss-term">{m[1].trim()}</strong>
      <span className="cra-gloss-sep"> — </span>
      {m[2]}
    </p>
  )
}

function BiblioParagraph({ text }) {
  // Inline H3 marker → sub-heading.
  if (typeof text === 'string' && text.startsWith('[H3]')) {
    return <h3 className="cra-h3 cra-biblio-h3" data-testid="article-h3">{plainText(text.slice(4)).trim()}</h3>
  }
  // Fully-bold paragraph = author-faked section title → render as sub-heading.
  if (isFullyBold(text)) {
    return <h3 className="cra-h3 cra-biblio-h3" data-testid="article-biblio-section">{plainText(text).trim()}</h3>
  }
  return (
    <p className="cra-p cra-biblio-entry">
      <RichText text={text} />
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
  const [pdfState, setPdfState] = useState('idle') // idle | loading | error

  async function handleDownloadPdf() {
    if (pdfState === 'loading') return
    setPdfState('loading')
    try {
      const { blob, filename } = await downloadCourseResourcePdf(courseId, r2Key)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setPdfState('idle')
    } catch (e) {
      setPdfState('error')
      setTimeout(() => setPdfState('idle'), 3000)
    }
  }

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
  const isBiblio = article.type === 'biblio' || article.type === 'bibliographie'

  return (
    <div className="cra cra-prestige" data-testid="course-resource-article">
      <article className="cra-article">
        {/* Watermark grain overlay */}
        <div aria-hidden className="cra-grain" />

        <div className="cra-inner">
          <div className="cra-toolbar">
            <Link
              to={`/cours/${courseId}`}
              className="cra-back"
              data-testid="resource-article-back"
              style={{ color }}
            >
              <span aria-hidden>&larr;</span> Retour au cours
            </Link>

            <button
              type="button"
              data-testid="resource-article-download-pdf"
              onClick={handleDownloadPdf}
              disabled={pdfState === 'loading'}
              className="cra-download"
              style={{ color, borderColor: `${color}55` }}
              aria-label="Télécharger en PDF protégé"
              title="Télécharger une version PDF avec votre nom en filigrane"
            >
              {pdfState === 'loading' ? 'Préparation…' : pdfState === 'error' ? 'Erreur, réessayer' : 'Télécharger en PDF'}
            </button>
          </div>

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

          <h1 className="cra-title">{plainText(article.title)}</h1>
          {article.course_title && (
            <div className="cra-course-title">{article.course_title}</div>
          )}

          <div className="cra-rule" style={{ background: color }} />

          {article.lead && (
            <p data-testid="resource-article-lead" className="cra-lead" style={{ borderLeftColor: color }}>
              <RichText text={article.lead} />
            </p>
          )}

          <div data-testid="resource-article-body" className={`cra-body${isBiblio ? ' cra-biblio' : ''}`}>
            {(article.sections || []).map((sec, si) => (
              <section key={si} className="cra-section">
                {sec.title && (
                  <h2 className="cra-h2" style={{ color }}>{plainText(sec.title)}</h2>
                )}
                {(sec.paragraphs || []).map((p, pi) => (
                  isGlossary
                    ? <GlossaryParagraph key={pi} text={p} />
                    : isBiblio
                      ? <BiblioParagraph key={pi} text={p} />
                      : <p key={pi} className="cra-p"><RichText text={p} /></p>
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
