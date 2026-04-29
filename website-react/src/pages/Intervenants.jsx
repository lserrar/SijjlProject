import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api'
import ScholarAvatar from '../components/ScholarAvatar'

export default function Intervenants() {
  const [scholars, setScholars] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiFetch('/scholars'),
      apiFetch('/courses'),
    ]).then(([s, c]) => {
      setScholars(s || [])
      setCourses(c || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">Chargement...</div>

  // Group courses by scholar_id (primary OR co-intervenant)
  const coursesByScholar = {}
  courses.forEach(c => {
    if (!c.is_launch_catalog) return
    const ids = [c.scholar_id, ...(c.co_scholar_ids || [])].filter(Boolean)
    ids.forEach(sid => {
      coursesByScholar[sid] = coursesByScholar[sid] || []
      coursesByScholar[sid].push(c)
    })
  })

  // Sort scholars: those with launch courses first, then alphabetical
  const sorted = [...scholars].sort((a, b) => {
    const aHas = (coursesByScholar[a.id] || []).length > 0
    const bHas = (coursesByScholar[b.id] || []).length > 0
    if (aHas !== bHas) return aHas ? -1 : 1
    return (a.name || '').localeCompare(b.name || '', 'fr')
  })

  return (
    <section className="section" style={{ paddingTop: 140 }} data-testid="intervenants-page">
      <div style={{ marginBottom: 64 }}>
        <div className="section-eyebrow">Académiciens et chercheurs</div>
        <h1 className="section-title" style={{ fontSize: 'clamp(32px, 4vw, 52px)' }}>
          Nos intervenants
        </h1>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 17,
          color: 'var(--text-muted)', maxWidth: 720, marginTop: 20, lineHeight: 1.75,
        }}>
          Chaque cours de Sijill Project est confié à un·e spécialiste reconnu·e de son domaine.
          Universitaires, chercheurs et chercheuses apportent leur expertise pour transmettre
          la richesse des savoirs islamiques classiques.
        </p>
      </div>

      <div
        className="courses-grid"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
        data-testid="scholars-grid"
      >
        {sorted.map(s => {
          const sCourses = coursesByScholar[s.id] || []
          return (
            <Link
              key={s.id}
              to={`/intervenant/${s.id}`}
              className="course-card"
              data-testid={`scholar-card-${s.id}`}
              style={{ position: 'relative', textDecoration: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <ScholarAvatar scholar={s} size={64} color="var(--accent, #C9A84C)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: 18,
                    color: 'var(--text-primary)', marginBottom: 4,
                  }}>
                    {s.name}
                  </div>
                  {s.title && (
                    <div style={{
                      fontFamily: 'var(--font-body)', fontSize: 12,
                      color: 'var(--accent, #C9A84C)', fontStyle: 'italic',
                      marginBottom: 6,
                    }}>
                      {s.title}
                    </div>
                  )}
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: 10,
                    letterSpacing: 1.5, textTransform: 'uppercase',
                    color: sCourses.length > 0 ? 'var(--success, #04D182)' : 'var(--text-dim)',
                  }}>
                    {sCourses.length > 0
                      ? `${sCourses.length} cours au lancement`
                      : 'Bientôt'}
                  </div>
                </div>
              </div>
              {s.bio && (
                <div style={{
                  fontFamily: 'var(--font-body)', fontSize: 14,
                  color: 'var(--text-muted)', lineHeight: 1.6,
                  display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {s.bio}
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
