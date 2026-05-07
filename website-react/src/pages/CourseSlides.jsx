import { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { getResourceAccessUrl } from '../api'
import { getCursusColor } from '../constants'
import { useAuth } from '../AuthContext'

export default function CourseSlides() {
  const { courseId } = useParams()
  const [params] = useSearchParams()
  const r2Key = params.get('key') || ''
  const { user } = useAuth()
  const [pdfUrl, setPdfUrl] = useState(null)
  const [label, setLabel] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!r2Key) { setError('no_key'); return }
    getResourceAccessUrl(courseId, r2Key)
      .then(d => {
        if (d?.url) {
          setPdfUrl(d.url + '#toolbar=0&navpanes=0&scrollbar=0&view=FitH')
          setLabel(d.label || r2Key.split('/').pop())
        } else setError('no_url')
      })
      .catch(e => setError(e?.message || 'load_failed'))
  }, [courseId, r2Key])

  // Anti-copy / anti-shortcut layer (best effort — soft deterrent)
  useEffect(() => {
    const onCtx = (e) => e.preventDefault()
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && ['s', 'p', 'a', 'c'].includes(e.key.toLowerCase())) {
        e.preventDefault()
      }
    }
    const onSel = (e) => e.preventDefault()
    document.addEventListener('contextmenu', onCtx)
    document.addEventListener('keydown', onKey)
    document.addEventListener('selectstart', onSel)
    return () => {
      document.removeEventListener('contextmenu', onCtx)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('selectstart', onSel)
    }
  }, [])

  useEffect(() => {
    if (label) document.title = `${label} — Sijill Project`
    return () => { document.title = 'Sijill Project' }
  }, [label])

  const color = getCursusColor(courseId) || '#5A4632'
  const userTag = user?.email ? user.email.split('@')[0] : 'membre Sijill'

  if (error) {
    return (
      <div className="container" data-testid="slides-error" style={{ padding: '140px 24px 80px', minHeight: '60vh' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24 }}>Slides indisponibles</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>
          Vérifiez que vous êtes connecté avec un abonnement actif.
        </p>
        <Link to={`/cours/${courseId}`} className="btn-outline" style={{ marginTop: 24 }}>
          Retour au cours
        </Link>
      </div>
    )
  }

  return (
    <div className="slides-page" data-testid="course-slides" style={{ paddingTop: 96, paddingBottom: 48, minHeight: '100vh', background: '#0A0A0A' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <Link
            to={`/cours/${courseId}`}
            data-testid="slides-back"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontFamily: 'var(--font-display)', fontSize: 11,
              letterSpacing: 2.5, textTransform: 'uppercase',
              color, textDecoration: 'none', opacity: 0.85,
            }}
          >
            <span aria-hidden>&larr;</span> Retour au cours
          </Link>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 11,
            letterSpacing: 2.5, textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}>
            <span style={{ color }}>Slides</span> · {label}
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          {/* PDF iframe — toolbar/print/download disabled via URL hash */}
          {pdfUrl ? (
            <iframe
              data-testid="slides-iframe"
              src={pdfUrl}
              title={label}
              style={{
                width: '100%', height: '78vh',
                border: `1px solid ${color}55`,
                background: '#1a1a1a',
                pointerEvents: 'auto',
              }}
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <div style={{
              width: '100%', height: '78vh',
              border: `1px solid ${color}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', fontFamily: 'var(--font-body)',
            }}>
              Chargement des slides…
            </div>
          )}

          {/* Diagonal watermark overlay (over the iframe to discourage screen captures) */}
          <div
            aria-hidden
            style={{
              position: 'absolute', inset: 0,
              pointerEvents: 'none',
              backgroundImage: `repeating-linear-gradient(-30deg, transparent 0 280px, rgba(201, 168, 76, 0.06) 280px 540px)`,
              mixBlendMode: 'overlay',
            }}
          />

          {/* Visible user tag at bottom */}
          <div style={{
            position: 'absolute', right: 16, bottom: 16,
            background: 'rgba(0,0,0,0.55)',
            color: '#FAEDC8',
            fontFamily: 'var(--font-display)',
            fontSize: 10, letterSpacing: 2,
            padding: '4px 10px', borderRadius: 2,
            pointerEvents: 'none',
          }}>
            Lecture · {userTag}
          </div>
        </div>

        <div style={{
          marginTop: 16, fontFamily: 'var(--font-body)', fontSize: 12,
          color: 'var(--text-muted)', textAlign: 'center',
        }}>
          Document réservé aux abonnés Sijill · Reproduction interdite
        </div>
      </div>
    </div>
  )
}
