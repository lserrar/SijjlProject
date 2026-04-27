import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getCursus, getAllCourses } from '../api'
import { getCursusColor } from '../constants'

export default function Catalogue() {
  const [courses, setCourses] = useState([])
  const [cursusMap, setCursusMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getAllCourses(), getCursus()]).then(([allCourses, allCursus]) => {
      const map = {}
      ;(allCursus || []).forEach(c => { map[c.id] = c })
      setCursusMap(map)
      // All launch-catalog courses (both available and coming_soon)
      const launchCourses = (allCourses || []).filter(c => c.is_launch_catalog === true)
      const sorted = launchCourses.sort((a, b) => {
        // Available first, coming_soon last
        if (!!a.coming_soon !== !!b.coming_soon) return a.coming_soon ? 1 : -1
        return (a.title || a.name || '').localeCompare(b.title || b.name || '', 'fr')
      })
      setCourses(sorted)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="loading">Chargement...</div>

  const availableCount = courses.filter(c => !c.coming_soon).length
  const comingCount = courses.length - availableCount

  return (
    <section className="section" style={{ paddingTop: 140 }} data-testid="catalogue-page">
      <div style={{ marginBottom: 64 }}>
        <div className="section-eyebrow">Première vague — Mai 2026</div>
        <h1 className="section-title" style={{ fontSize: 'clamp(32px, 4vw, 52px)' }}>
          Catalogue de lancement
        </h1>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 17,
          color: 'var(--text-muted)', maxWidth: 720, marginTop: 20, lineHeight: 1.75
        }}>
          Sijill Project se construit par vagues successives. Chaque cursus s'enrichit au fil
          des mois, au rythme des contributions de nos intervenants académiques. Ce que vous
          découvrez ici est la première vague — d'autres suivront.
        </p>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 17,
          color: 'var(--text-muted)', maxWidth: 720, marginTop: 16, lineHeight: 1.75
        }}>
          Les cours sélectionnés pour le lancement couvrent les sept cursus. Le catalogue
          complet, en cours de production, est consultable depuis la page{' '}
          <Link to="/cursus" style={{ color: 'var(--accent, #C9A84C)', textDecoration: 'underline' }}>Cursus</Link>.
        </p>
        <div style={{
          marginTop: 24, display: 'flex', gap: 24, flexWrap: 'wrap',
          fontFamily: 'var(--font-display)', fontSize: 11,
          letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-dim)',
        }}>
          <span data-testid="available-count"><span style={{ color: 'var(--success, #04D182)' }}>●</span>&nbsp;&nbsp;{availableCount} disponibles</span>
          {comingCount > 0 && (
            <span data-testid="coming-count"><span style={{ color: 'var(--accent, #C9A84C)' }}>●</span>&nbsp;&nbsp;{comingCount} commandés</span>
          )}
        </div>
      </div>

      <div className="courses-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {courses.map(c => {
          const color = getCursusColor(c.cursus_id)
          const cursusName = cursusMap[c.cursus_id]?.name || ''
          const isComing = c.coming_soon === true
          return (
            <Link
              key={c.id}
              to={`/cours/${c.id}`}
              className="course-card"
              data-testid={`catalogue-card-${c.id}`}
              style={{ position: 'relative', opacity: isComing ? 0.82 : 1 }}
            >
              <div className="course-card-dot" style={{ background: color }} />
              {isComing && (
                <div
                  data-testid={`coming-soon-badge-${c.id}`}
                  style={{
                    position: 'absolute', top: 12, right: 12,
                    fontFamily: 'var(--font-display)', fontSize: 9,
                    letterSpacing: 1.5, textTransform: 'uppercase',
                    color: 'var(--accent, #C9A84C)',
                    padding: '3px 8px',
                    border: '1px solid var(--accent, #C9A84C)',
                    background: 'rgba(201,168,76,0.08)',
                    borderRadius: 2,
                  }}
                >
                  {c.available_date || 'Bientôt'}
                </div>
              )}
              <div className="course-card-title">{c.title || c.name}</div>
              <div className="course-card-desc">{c.description}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 10,
                  letterSpacing: 1.5, textTransform: 'uppercase',
                  color: isComing ? 'var(--accent, #C9A84C)' : 'var(--success, #04D182)',
                }}>
                  {isComing ? 'Commandé' : 'Disponible'}
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 8,
                  letterSpacing: 2, textTransform: 'uppercase',
                  color: 'var(--text-dim)', padding: '3px 8px',
                  border: `1px solid ${color}33`,
                }}>
                  {cursusName}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
