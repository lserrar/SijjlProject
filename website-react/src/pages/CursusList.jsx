import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getCursus, getCourses } from '../api'
import { getCursusColor, getCursusLetter } from '../constants'

export default function CursusList() {
  const [cursus, setCursus] = useState([])
  const [openCursus, setOpenCursus] = useState(null)
  const [courses, setCourses] = useState({})
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()

  useEffect(() => {
    getCursus().then(data => {
      setCursus(data || [])
      setLoading(false)
      const openId = searchParams.get('open')
      if (openId && data.some(c => c.id === openId)) {
        toggleCursus(openId)
      }
    })
  }, [])

  async function toggleCursus(id) {
    if (openCursus === id) {
      setOpenCursus(null)
      return
    }
    setOpenCursus(id)
    if (!courses[id]) {
      const data = await getCourses(id)
      setCourses(prev => ({ ...prev, [id]: data || [] }))
    }
  }

  if (loading) return <div className="loading">Chargement...</div>

  return (
    <section className="section" style={{ paddingTop: 140 }} data-testid="cursus-list-page">
      <div style={{ marginBottom: 64 }}>
        <div className="section-eyebrow">{cursus.length} Cursus disponibles</div>
        <h1 className="section-title" style={{ fontSize: 'clamp(32px, 4vw, 52px)' }}>
          Les grandes voies du savoir islamique
        </h1>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 18,
          color: 'var(--text-muted)', maxWidth: 600, marginTop: 16, lineHeight: 1.7
        }}>
          Choisissez votre parcours d'étude
        </p>

        <div
          data-testid="launch-wave-notice"
          style={{
            marginTop: 32,
            padding: '20px 24px',
            background: 'var(--bg-card)',
            borderLeft: '2px solid var(--accent, #C9A84C)',
            maxWidth: 720,
          }}
        >
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 11,
            letterSpacing: 3, textTransform: 'uppercase',
            color: 'var(--accent, #C9A84C)', marginBottom: 10,
          }}>
            Première vague — Mai 2026
          </div>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 15,
            color: 'var(--text-muted)', lineHeight: 1.7, margin: 0,
          }}>
            Sijill Project se construit par vagues successives. Chaque cursus s'enrichit au fil
            des mois, au rythme des contributions de nos intervenants académiques. Ce que vous
            découvrez ici est la première vague — d'autres suivront.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {cursus.map(c => {
          const color = getCursusColor(c.id)
          const letter = getCursusLetter(c.id)
          const isOpen = openCursus === c.id
          const cursusCourses = courses[c.id] || []

          return (
            <div key={c.id} data-testid={`cursus-item-${c.id}`}>
              <div
                onClick={() => toggleCursus(c.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 24,
                  padding: '28px 32px',
                  background: isOpen ? 'var(--bg-card)' : 'transparent',
                  border: `1px solid ${isOpen ? color + '44' : 'var(--border)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                }}
                data-testid={`cursus-toggle-${c.id}`}
              >
                <div style={{
                  width: 48, height: 48,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontSize: 20, color,
                  border: `1px solid ${color}33`,
                  flexShrink: 0,
                }}>
                  {letter}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 400,
                    marginBottom: 4,
                  }}>
                    {c.name}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-body)', fontSize: 14,
                    color: 'var(--text-muted)',
                    display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {c.description}
                  </div>
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 10,
                  letterSpacing: 2, textTransform: 'uppercase',
                  color: 'var(--text-dim)', flexShrink: 0,
                }}>
                  {c.course_count} cours
                </div>
                <div style={{
                  fontFamily: 'var(--font-body)', fontSize: 18,
                  color: 'var(--text-dim)', transition: 'transform 0.3s',
                  transform: isOpen ? 'rotate(180deg)' : 'none',
                }}>
                  &#9660;
                </div>
              </div>

              {isOpen && (
                <div style={{
                  background: 'var(--bg-card)',
                  borderLeft: `1px solid ${color}44`,
                  borderRight: `1px solid ${color}44`,
                  borderBottom: `1px solid ${color}44`,
                  padding: '24px 32px',
                }}>
                  {cursusCourses.length === 0 ? (
                    <div style={{
                      fontFamily: 'var(--font-display)', fontSize: 11,
                      letterSpacing: 3, textTransform: 'uppercase',
                      color: 'var(--text-dim)',
                    }}>
                      Chargement...
                    </div>
                  ) : (
                    <div className="courses-grid">
                      {cursusCourses.map(course => (
                        <Link
                          key={course.id}
                          to={`/cours/${course.id}`}
                          className="course-card"
                          data-testid={`course-card-${course.id}`}
                          style={{ border: `1px solid ${color}22`, position: 'relative' }}
                        >
                          <div className="course-card-dot" style={{ background: color }} />
                          {course.coming_soon && (
                            <div
                              data-testid={`coming-soon-badge-${course.id}`}
                              style={{
                                position: 'absolute', top: 12, right: 12,
                                fontFamily: 'var(--font-display)', fontSize: 9,
                                letterSpacing: 1.5, textTransform: 'uppercase',
                                color: 'var(--accent, #C9A84C)',
                                padding: '3px 8px',
                                border: `1px solid var(--accent, #C9A84C)`,
                                borderRadius: 2,
                              }}
                            >
                              {course.available_date || 'Bientôt'}
                            </div>
                          )}
                          <div className="course-card-title">{course.title || course.name}</div>
                          <div className="course-card-desc">{course.description}</div>
                          <div className="course-card-episodes" style={{ color: `${color}88` }}>
                            {course.modules_count || course.module_count || '?'} modules
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
