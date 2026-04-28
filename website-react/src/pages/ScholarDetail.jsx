import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiFetch } from '../api'
import { getCursusColor } from '../constants'

function getInitials(name) {
  if (!name) return '?'
  return name.split(/[\s·-]+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('')
}

export default function ScholarDetail() {
  const { scholarId } = useParams()
  const [scholar, setScholar] = useState(null)
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiFetch(`/scholars/${scholarId}`).catch(() => null),
      apiFetch(`/courses?scholar_id=${scholarId}`).catch(() => []),
    ]).then(([s, c]) => {
      setScholar(s)
      setCourses(c || [])
      setLoading(false)
    })
  }, [scholarId])

  if (loading) return <div className="loading">Chargement...</div>
  if (!scholar) return <div className="loading">Intervenant introuvable</div>

  const launchCourses = courses.filter(c => c.is_launch_catalog)

  return (
    <section className="section" style={{ paddingTop: 140 }} data-testid={`scholar-page-${scholar.id}`}>
      <div className="rv-top-bar" style={{ marginBottom: 32 }}>
        <Link to="/intervenants" className="course-back" data-testid="scholar-back-btn">&#8592; Retour aux intervenants</Link>
      </div>

      <div style={{
        display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap',
        marginBottom: 48,
      }}>
        {scholar.photo_url ? (
          <img
            src={scholar.photo_url}
            alt={scholar.name}
            style={{ width: 160, height: 160, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }}
          />
        ) : (
          <div style={{
            width: 160, height: 160, borderRadius: '50%',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--accent, #C9A84C)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: 56,
            color: 'var(--accent, #C9A84C)', flexShrink: 0,
          }} data-testid="scholar-avatar">
            {getInitials(scholar.name)}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="section-eyebrow">Intervenant</div>
          <h1 className="section-title" style={{ fontSize: 'clamp(28px, 4vw, 44px)', marginTop: 8 }}>
            {scholar.name}
          </h1>
          {scholar.title && (
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: 16,
              color: 'var(--accent, #C9A84C)', fontStyle: 'italic',
              marginTop: 12,
            }} data-testid="scholar-title">
              {scholar.title}
            </div>
          )}
          {scholar.bio && (
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: 17,
              color: 'var(--text-muted)', marginTop: 20, lineHeight: 1.75,
            }}>
              {scholar.bio}
            </p>
          )}
        </div>
      </div>

      {launchCourses.length > 0 && (
        <div>
          <div className="section-eyebrow" style={{ marginBottom: 16 }}>Ses cours au lancement</div>
          <div className="courses-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {launchCourses.map(c => {
              const color = getCursusColor(c.cursus_id)
              return (
                <Link
                  key={c.id}
                  to={`/cours/${c.id}`}
                  className="course-card"
                  data-testid={`scholar-course-${c.id}`}
                >
                  <div className="course-card-dot" style={{ background: color }} />
                  <div className="course-card-title">{(c.title || '').replace(/^Cours \d+\s*:\s*/, '')}</div>
                  {c.description && <div className="course-card-desc">{c.description}</div>}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
