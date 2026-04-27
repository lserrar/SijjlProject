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
      // Only show courses flagged as part of the launch catalog AND actually available (not coming_soon)
      const launchCourses = (allCourses || []).filter(c => c.is_launch_catalog === true && c.coming_soon !== true)
      const sorted = launchCourses.sort((a, b) =>
        (a.title || a.name || '').localeCompare(b.title || b.name || '', 'fr')
      )
      setCourses(sorted)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="loading">Chargement...</div>

  return (
    <section className="section" style={{ paddingTop: 140 }} data-testid="catalogue-page">
      <div style={{ marginBottom: 64 }}>
        <div className="section-eyebrow">Catalogue de lancement</div>
        <h1 className="section-title" style={{ fontSize: 'clamp(32px, 4vw, 52px)' }}>
          Mai 2026 — Première vague
        </h1>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 18,
          color: 'var(--text-muted)', maxWidth: 640, marginTop: 16, lineHeight: 1.7
        }}>
          {courses.length} cours sélectionnés pour le lancement, à travers les sept cursus.
          Le catalogue complet, en cours de production, est consultable depuis la page <Link to="/cursus" style={{ color: 'var(--accent, #C9A84C)', textDecoration: 'underline' }}>Cursus</Link>.
        </p>
      </div>

      <div className="courses-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {courses.map(c => {
          const color = getCursusColor(c.cursus_id)
          const cursusName = cursusMap[c.cursus_id]?.name || ''
          return (
            <Link
              key={c.id}
              to={`/cours/${c.id}`}
              className="course-card"
              data-testid={`catalogue-card-${c.id}`}
            >
              <div className="course-card-dot" style={{ background: color }} />
              <div className="course-card-title">{c.title || c.name}</div>
              <div className="course-card-desc">{c.description}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <div className="course-card-episodes" style={{ color: `${color}88` }}>
                  {c.modules_count || c.module_count || '?'} modules
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
