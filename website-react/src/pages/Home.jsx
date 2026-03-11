import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getCursus, getCourses } from '../api'
import { getCursusColor, getCursusLetter } from '../constants'

export default function Home() {
  const [cursus, setCursus] = useState([])
  const [featuredCourses, setFeaturedCourses] = useState([])

  useEffect(() => {
    getCursus().then(data => {
      setCursus(data || [])
      if (data && data[0]) {
        getCourses(data[0].id).then(courses => {
          setFeaturedCourses((courses || []).slice(0, 4))
        })
      }
    })
  }, [])

  return (
    <>
      {/* Hero */}
      <section className="hero" data-testid="home-hero">
        <div className="hero-eyebrow">Plateforme académique</div>
        <h1 className="hero-title">
          Sciences islamiques,{' '}
          <span style={{ color: 'var(--accent)' }}>savoir ancestral</span>
        </h1>
        <p className="hero-subtitle">
          Des parcours structurés en philosophie, théologie, droit, littérature et spiritualité.
          Plus de 100 épisodes audio par les meilleurs spécialistes.
        </p>
        <div className="hero-cta">
          <Link to="/cursus" className="btn-accent" data-testid="hero-explore-btn">
            Explorer les cursus
          </Link>
          <Link to="/inscription" className="btn-outline" data-testid="hero-register-btn">
            Créer un compte
          </Link>
        </div>
        <div className="hero-stats">
          <div>
            <div className="hero-stat-value">5</div>
            <div className="hero-stat-label">Cursus</div>
          </div>
          <div>
            <div className="hero-stat-value">24</div>
            <div className="hero-stat-label">Cours</div>
          </div>
          <div>
            <div className="hero-stat-value">100+</div>
            <div className="hero-stat-label">Épisodes</div>
          </div>
          <div>
            <div className="hero-stat-value">50+</div>
            <div className="hero-stat-label">Heures</div>
          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="featured-quote">
        <p className="featured-quote-text">
          &laquo;&nbsp;Celui qui ne connaît pas l'histoire est condamné à la revivre&nbsp;&raquo;
        </p>
        <span className="featured-quote-author">Ibn Khaldûn</span>
      </section>

      {/* Cursus section */}
      <section className="section" data-testid="home-cursus-section">
        <div className="section-header">
          <div>
            <div className="section-eyebrow">5 cursus disponibles</div>
            <h2 className="section-title">Les grandes voies du savoir islamique</h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--text-muted)', marginTop: 8 }}>
              Choisissez votre parcours d'étude
            </p>
          </div>
          <Link to="/cursus" className="btn-outline">Voir tout</Link>
        </div>
        <div className="cursus-grid">
          {cursus.map(c => {
            const color = getCursusColor(c.id)
            const letter = getCursusLetter(c.id)
            return (
              <Link
                key={c.id}
                to={`/cursus?open=${c.id}`}
                className="cursus-card"
                data-testid={`cursus-card-${c.id}`}
                style={{ borderColor: `${color}22` }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = `${color}66`
                  e.currentTarget.style.boxShadow = `0 8px 40px ${color}15`
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = `${color}22`
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: color }} />
                <div className="cursus-card-letter" style={{ color }}>{letter}</div>
                <div className="cursus-card-name">{c.name}</div>
                <div className="cursus-card-desc">{c.description}</div>
                <div className="cursus-card-meta" style={{ color: `${color}99` }}>
                  {c.course_count} cours
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Featured courses */}
      {featuredCourses.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }} data-testid="home-courses-section">
          <div className="section-header">
            <div>
              <div className="section-eyebrow">À la une</div>
              <h2 className="section-title">Commencez par la Falsafa</h2>
            </div>
          </div>
          <div className="courses-grid">
            {featuredCourses.map(c => {
              const color = getCursusColor(c.cursus_id)
              return (
                <Link
                  key={c.id}
                  to={`/cours/${c.id}`}
                  className="course-card"
                  data-testid={`course-card-${c.id}`}
                >
                  <div className="course-card-dot" style={{ background: color }} />
                  <div className="course-card-title">{c.title || c.name}</div>
                  <div className="course-card-desc">{c.description}</div>
                  <div className="course-card-episodes">
                    {c.modules_count || c.module_count || '?'} modules
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="section" style={{ textAlign: 'center', paddingTop: 40 }}>
        <div className="section-eyebrow" style={{ textAlign: 'center', justifyContent: 'center' }}>Prêt à commencer ?</div>
        <h2 className="section-title" style={{ textAlign: 'center', marginBottom: 32 }}>
          Rejoignez Sijill Project
        </h2>
        <Link to="/inscription" className="btn-accent" data-testid="home-cta-register">
          Créer un compte gratuitement
        </Link>
      </section>
    </>
  )
}
