import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getCursus, getCourses, preregister } from '../api'
import { getCursusColor, getCursusLetter } from '../constants'

export default function Home() {
  const [cursus, setCursus] = useState([])
  const [featuredCourses, setFeaturedCourses] = useState([])
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const formRef = useRef(null)
  const location = useLocation()

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

  useEffect(() => {
    if (location.hash === '#preinscription' && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [location])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setResult(null)
    if (!prenom.trim() || !email.trim()) {
      setError('Veuillez remplir tous les champs.')
      return
    }
    setSubmitting(true)
    try {
      const res = await preregister(prenom.trim(), email.trim())
      setResult(res)
      if (!res.already_registered) {
        setPrenom('')
        setEmail('')
      }
    } catch (err) {
      setError(err.message || "Une erreur est survenue.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Hero */}
      <section className="hero" data-testid="home-hero">
        <div className="hero-eyebrow">Plateforme acad&eacute;mique</div>
        <h1 className="hero-title">
          Comprendre, transmettre,{' '}
          <span className="hero-title-sub">penser la pluralit&eacute; des savoirs islamiques</span>
        </h1>
        <p className="hero-subtitle">
          Des parcours structur&eacute;s en philosophie, th&eacute;ologie, droit, litt&eacute;rature et histoire de la mystique islamique.
          Plus de 100 &eacute;pisodes audio par les meilleurs sp&eacute;cialistes.
        </p>
        <div className="hero-cta">
          <Link to="/cursus" className="btn-accent" data-testid="hero-explore-btn">
            Explorer les cursus
          </Link>
          <a href="#preinscription" className="btn-outline" data-testid="hero-prereg-btn">
            Pr&eacute;-inscription
          </a>
        </div>
        <div className="hero-stats">
          <div>
            <div className="hero-stat-value">{cursus.length || 7}</div>
            <div className="hero-stat-label">Cursus</div>
          </div>
          <div>
            <div className="hero-stat-value">{featuredCourses.length ? '24+' : '24'}</div>
            <div className="hero-stat-label">Cours</div>
          </div>
          <div>
            <div className="hero-stat-value">100+</div>
            <div className="hero-stat-label">&Eacute;pisodes</div>
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
          &laquo;&nbsp;L'histoire consiste &agrave; m&eacute;diter, &agrave; rechercher la v&eacute;rit&eacute;, &agrave; expliquer les causes et les origines des &eacute;v&eacute;nements. Elle prend ainsi racine dans la philosophie, dont elle doit &ecirc;tre compt&eacute;e comme une branche.&nbsp;&raquo;
        </p>
        <span className="featured-quote-author">Ibn Khald&ucirc;n (al-Muqaddima)</span>
      </section>

      {/* Cursus section */}
      <section className="section" data-testid="home-cursus-section">
        <div className="section-header">
          <div>
            <div className="section-eyebrow">{cursus.length || 7} cursus disponibles</div>
            <h2 className="section-title">Les grandes voies du savoir islamique</h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--text-muted)', marginTop: 8 }}>
              Choisissez votre parcours d'&eacute;tude
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
              <div className="section-eyebrow">&Agrave; la une</div>
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

      {/* Offre fondateur + Pré-inscription */}
      <section className="section fondateur-section" id="preinscription" ref={formRef} data-testid="fondateur-section">
        <div className="fondateur-card" data-testid="fondateur-card">
          <div className="prereg-form-badge">Tarif fondateur &mdash; 200 places uniquement</div>
          <div className="prereg-form-price">
            <span className="prereg-price-amount">7</span>
            <span className="prereg-price-unit">&euro;/mois</span>
          </div>
          <div className="fondateur-engagement">engagement 12 mois</div>
          <div className="fondateur-standard">(tarif standard apr&egrave;s lancement : 12 &euro;/mois)</div>
          {result ? (
            <div className="prereg-success" data-testid="prereg-success">
              <div className="prereg-success-icon">&#10003;</div>
              <p>{result.message}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="prereg-form" data-testid="prereg-form">
              <input
                type="text"
                placeholder={`Pr\u00e9nom`}
                value={prenom}
                onChange={e => setPrenom(e.target.value)}
                className="prereg-input"
                data-testid="prereg-prenom"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="prereg-input"
                data-testid="prereg-email"
                required
              />
              {error && <div className="prereg-error" data-testid="prereg-error">{error}</div>}
              <button
                type="submit"
                className="prereg-submit"
                disabled={submitting}
                data-testid="prereg-submit"
              >
                {submitting ? 'Inscription...' : "Je m'inscris"}
              </button>
              <p className="prereg-disclaimer">
                Aucun spam. Vous recevrez uniquement les actualit&eacute;s du lancement.
              </p>
            </form>
          )}
        </div>
      </section>
    </>
  )
}
