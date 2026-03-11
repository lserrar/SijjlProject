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
        <div className="section-eyebrow">Parcours</div>
        <h1 className="section-title" style={{ fontSize: 'clamp(32px, 4vw, 52px)' }}>
          Tous les cursus
        </h1>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 18,
          color: 'var(--text-muted)', maxWidth: 600, marginTop: 16, lineHeight: 1.7
        }}>
          Chaque cursus regroupe plusieurs cours thématiques. Explorez les parcours et découvrez les modules.
        </p>
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
                          style={{ border: `1px solid ${color}22` }}
                        >
                          <div className="course-card-dot" style={{ background: color }} />
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
