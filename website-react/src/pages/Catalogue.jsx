import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getCursus, getCatalogue } from '../api'
import { getCursusColor } from '../constants'

export default function Catalogue() {
  const [items, setItems] = useState([])
  const [cursusMap, setCursusMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getCatalogue(), getCursus()]).then(([cat, allCursus]) => {
      const map = {}
      ;(allCursus || []).forEach(c => { map[c.id] = c })
      setCursusMap(map)
      setItems(cat || [])
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="loading">Chargement...</div>

  const available = items.filter(i => !i.coming_soon && i.episode_count > 0)
  const ordered = items.filter(i => i.coming_soon || i.episode_count === 0)

  return (
    <section className="section" style={{ paddingTop: 140 }} data-testid="catalogue-page">
      <div style={{ marginBottom: 64 }}>
        <div className="section-eyebrow">Première vague — Mai 2026</div>
        <h1 className="section-title" style={{ fontSize: 'clamp(32px, 4vw, 52px)' }}>
          Catalogue de lancement
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 17, color: 'var(--text-muted)', maxWidth: 720, marginTop: 20, lineHeight: 1.75 }}>
          Sijill Project se construit par vagues successives. Chaque cursus s'enrichit au fil
          des mois, au rythme des contributions de nos intervenants académiques. Ce que vous
          découvrez ici est la première vague — d'autres suivront.
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 17, color: 'var(--text-muted)', maxWidth: 720, marginTop: 16, lineHeight: 1.75 }}>
          Les cours sélectionnés pour le lancement couvrent les sept cursus. Le catalogue
          complet, en cours de production, est consultable depuis la page{' '}
          <Link to="/cursus" style={{ color: 'var(--accent, #C9A84C)', textDecoration: 'underline' }}>Cursus</Link>.
        </p>
        <div style={{
          marginTop: 24, display: 'flex', gap: 24, flexWrap: 'wrap',
          fontFamily: 'var(--font-display)', fontSize: 11,
          letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-dim)',
        }}>
          <span data-testid="available-count"><span style={{ color: 'var(--success, #04D182)' }}>●</span>&nbsp;&nbsp;{available.length} disponibles</span>
          {ordered.length > 0 && (
            <span data-testid="coming-count"><span style={{ color: 'var(--accent, #C9A84C)' }}>●</span>&nbsp;&nbsp;{ordered.length} commandés</span>
          )}
        </div>
      </div>

      <div className="courses-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {items.map(it => {
          const color = getCursusColor(it.cursus_id)
          const cursusName = cursusMap[it.cursus_id]?.name || ''
          const isModule = it.type === 'module'
          const hasEpisodes = it.episode_count > 0
          const isAvailable = !it.coming_soon && hasEpisodes
          const isComing = it.coming_soon || !hasEpisodes
          return (
            <Link
              key={it.id}
              to={`/cours/${it.course_id}`}
              className="course-card"
              data-testid={`catalogue-card-${it.id}`}
              style={{ position: 'relative', opacity: isComing ? 0.78 : 1 }}
            >
              <div className="course-card-dot" style={{ background: color }} />
              {isComing && (
                <div
                  data-testid={`coming-soon-badge-${it.id}`}
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
                  {it.available_date || 'Bientôt'}
                </div>
              )}
              <div className="course-card-title">{it.title}</div>
              {isModule && it.course_title && (
                <div style={{
                  fontFamily: 'var(--font-body)', fontSize: 12,
                  color: 'var(--text-dim)', marginTop: -4, marginBottom: 8,
                  fontStyle: 'italic',
                }}>
                  {it.course_title.replace(/^Cours \d+ : /, '')}
                </div>
              )}
              {it.description && <div className="course-card-desc">{it.description}</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 10,
                  letterSpacing: 1.5, textTransform: 'uppercase',
                  color: isAvailable ? 'var(--success, #04D182)' : 'var(--accent, #C9A84C)',
                }}>
                  {hasEpisodes
                    ? `${it.episode_count} épisode${it.episode_count > 1 ? 's' : ''}`
                    : 'Commandé'}
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
