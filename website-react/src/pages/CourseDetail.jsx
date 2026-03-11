import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getCourseDetail, getCoursePlaylist } from '../api'
import { getCursusColor, getCursusLetter, formatDuration } from '../constants'
import { useAuth } from '../AuthContext'

export default function CourseDetail() {
  const { courseId } = useParams()
  const { user } = useAuth()
  const [course, setCourse] = useState(null)
  const [episodes, setEpisodes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getCourseDetail(courseId),
      getCoursePlaylist(courseId).catch(() => []),
    ]).then(([courseData, playlist]) => {
      setCourse(courseData)
      setEpisodes(playlist || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [courseId])

  if (loading) return <div className="loading">Chargement...</div>
  if (!course) return <div className="loading">Cours introuvable</div>

  const color = getCursusColor(course.cursus_id)
  const letter = getCursusLetter(course.cursus_id)
  const cursusName = course.cursus_name || course.cursus_id

  return (
    <div data-testid="course-detail-page">
      <div className="course-hero">
        <Link to="/cursus" className="course-back" data-testid="course-back-btn">
          &#8592; Retour aux cursus
        </Link>

        <div className="course-cursus-badge" style={{ borderColor: `${color}66`, color }} data-testid="course-cursus-badge">
          <span style={{
            width: 20, height: 20, display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: 10,
          }}>
            {letter}
          </span>
          {cursusName}
        </div>

        <h1 className="course-detail-title" data-testid="course-title">
          {course.title || course.name}
        </h1>
        <p className="course-detail-desc">{course.description}</p>

        <div style={{ display: 'flex', gap: 24, marginBottom: 60 }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 10,
            letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-dim)',
          }}>
            {episodes.length} episode{episodes.length > 1 ? 's' : ''}
          </div>
          {course.scholar_name && (
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 10,
              letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-dim)',
            }}>
              Par {course.scholar_name}
            </div>
          )}
        </div>

        {/* Separator */}
        <div style={{ width: 60, height: 1, background: color, marginBottom: 40 }} />

        {/* Episode list */}
        <div style={{ maxWidth: 720 }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 10,
            letterSpacing: 4, textTransform: 'uppercase',
            color: 'var(--text-dim)', marginBottom: 24,
          }}>
            Tous les episodes
          </div>

          {episodes.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Aucun episode disponible pour le moment.
            </p>
          ) : (
            <ul className="episode-list">
              {episodes.map((ep, i) => (
                <li
                  key={ep.id || i}
                  className="episode-item"
                  data-testid={`episode-item-${i}`}
                  style={{ borderColor: `${color}15` }}
                >
                  <span className="episode-num" style={{ color: `${color}88` }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="episode-title">{ep.title}</span>
                  {ep.duration && (
                    <span className="episode-duration">{formatDuration(ep.duration)}</span>
                  )}
                  {!user ? (
                    <span className="episode-lock" title="Connectez-vous pour ecouter">&#128274;</span>
                  ) : (
                    <span style={{ color, fontSize: 16 }} title="Ecouter">&#9654;</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* CTA if not logged in */}
        {!user && episodes.length > 0 && (
          <div style={{
            marginTop: 48, padding: 40,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            textAlign: 'center', maxWidth: 720,
          }} data-testid="course-cta-login">
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 12,
            }}>
              Ecoutez ce cours
            </div>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: 15,
              color: 'var(--text-muted)', marginBottom: 24,
            }}>
              Connectez-vous ou creez un compte pour acceder a l'integralite du contenu.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Link to="/connexion" className="btn-accent">Se connecter</Link>
              <Link to="/inscription" className="btn-outline">S'inscrire</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
