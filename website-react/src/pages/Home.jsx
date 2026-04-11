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

  // Scroll to #preinscription if hash is present
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
      {/* Hero — Pre-registration */}
      <section className="hero prereg-hero" id="preinscription" ref={formRef} data-testid="prereg-hero">
        <div className="prereg-layout">
          <div className="prereg-content">
            <div className="hero-eyebrow">Ouverture septembre 2026</div>
            <h1 className="prereg-title">
              Sijill Project
            </h1>
            <p className="prereg-subtitle">
              La premi&egrave;re plateforme acad&eacute;mique audio pour comprendre la pluralit&eacute; des savoirs islamiques, en fran&ccedil;ais.
            </p>
            <div className="prereg-stats-inline">
              <span>7 cursus</span>
              <span className="prereg-dot"></span>
              <span>17 universitaires</span>
              <span className="prereg-dot"></span>
              <span>+80 &eacute;pisodes</span>
            </div>
          </div>
          <div className="prereg-form-card" data-testid="prereg-form-card">
            <div className="prereg-form-badge">Tarif fondateur</div>
            <div className="prereg-form-price">
              <span className="prereg-price-amount">7</span>
              <span className="prereg-price-unit">&euro;/mois</span>
            </div>
            <div className="prereg-form-places">200 places uniquement</div>
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
            <div className="section-eyebrow">6 cursus disponibles</div>
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
              <div className="section-eyebrow">A la une</div>
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

      {/* CTA — repeat pre-registration */}
      <section className="section" style={{ textAlign: 'center', paddingTop: 40 }}>
        <div className="section-eyebrow" style={{ textAlign: 'center', justifyContent: 'center' }}>Pr&ecirc;t &agrave; commencer ?</div>
        <h2 className="section-title" style={{ textAlign: 'center', marginBottom: 32 }}>
          Rejoignez Sijill Project
        </h2>
        <a href="#preinscription" className="btn-accent" data-testid="home-cta-prereg">
          Se pr&eacute;-inscrire
        </a>
      </section>
    </>
  )
}
