import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getCourseDetail, getModules, getAudios, getAudioStreamUrl, getAudioTranscript, getContextResources, getBibliographies } from '../api'
import { getCursusColor, getCursusLetter, buildYouTubeEmbedUrl } from '../constants'
import { useAuth } from '../AuthContext'

const CURSUS_LETTER_MAP = {
  'cursus-falsafa': 'A', 'cursus-theologie': 'B',
  'cursus-sciences-islamiques': 'C', 'cursus-arts': 'D', 'cursus-spiritualites': 'E',
}
const API_BASE = window.location.origin + '/api'

export default function CourseDetail() {
  const { courseId } = useParams()
  const { user } = useAuth()
  const [course, setCourse] = useState(null)
  const [modules, setModules] = useState([])
  const [audios, setAudios] = useState([])
  const [contextResources, setContextResources] = useState([])
  const [biblios, setBiblios] = useState([])
  const [audioConferences, setAudioConferences] = useState([])
  const [timelines, setTimelines] = useState([])
  const [loading, setLoading] = useState(true)
  const [openModule, setOpenModule] = useState(null)
  const [activeTab, setActiveTab] = useState('episodes')
  const [currentAudio, setCurrentAudio] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [transcript, setTranscript] = useState(null)
  const [showTranscript, setShowTranscript] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    // Check subscription access
    const token = localStorage.getItem('sijill_token')
    if (token) {
      fetch(`${API_BASE}/user/access?content_type=course&content_id=${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : { has_access: false })
        .then(data => setHasAccess(!!data.has_access))
        .catch(() => setHasAccess(false))
    } else {
      setHasAccess(false)
    }
  }, [courseId, user])

  useEffect(() => {
    Promise.all([
      getCourseDetail(courseId),
      getModules(courseId),
      getAudios(courseId).catch(() => []),
    ]).then(([courseData, modsData, audiosData]) => {
      setCourse(courseData)
      setModules(modsData || [])
      setAudios(audiosData || [])
      if (courseData?.cursus_id) {
        getContextResources(courseData.cursus_id).then(r => setContextResources(r?.resources || [])).catch(() => {})
        getBibliographies(courseId).then(bibs => setBiblios(bibs || [])).catch(() => {})
        // Fetch timelines for THIS cursus only
        fetch(`${API_BASE}/timelines/cursus/${courseData.cursus_id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('sijill_token') || ''}` }
        }).then(r => r.json()).then(data => {
          setTimelines(data.timelines || [])
        }).catch(() => {})
        fetch(`${API_BASE}/resources/audio`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('sijill_token') || ''}` }
        }).then(r => r.json()).then(data => {
          const letter = courseData.cursus_id === 'cursus-falsafa' ? 'A' : courseData.cursus_id === 'cursus-theologie' ? 'B' : courseData.cursus_id === 'cursus-sciences-islamiques' ? 'C' : courseData.cursus_id === 'cursus-arts' ? 'D' : 'E'
          const filtered = (data.resources || []).filter(c => c.cursus_letter === letter)
          setAudioConferences(filtered)
        }).catch(() => {})
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [courseId])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => {
      setCurrentTime(audio.currentTime)
      setDuration(audio.duration || 0)
      setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0)
    }
    const onEnd = () => { setIsPlaying(false); setProgress(0); setCurrentTime(0) }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnd)
    return () => { audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('ended', onEnd) }
  }, [currentAudio])

  async function playAudio(audioItem) {
    if (!user) {
      // Unauthenticated: redirect to login
      window.location.href = '/connexion?next=' + encodeURIComponent(window.location.pathname)
      return
    }
    if (!hasAccess) {
      // Authenticated but no subscription
      window.location.href = '/pre-inscription'
      return
    }
    if (currentAudio?.id === audioItem.id) {
      if (isPlaying) { audioRef.current?.pause(); setIsPlaying(false) }
      else { audioRef.current?.play(); setIsPlaying(true) }
      return
    }
    setCurrentAudio(audioItem)
    setShowTranscript(false)
    setTranscript(null)
    // If episode has YouTube video, just update the embed (no audio file needed)
    if (audioItem.youtube_url) {
      setIsPlaying(false)
      setProgress(0); setCurrentTime(0); setDuration(0)
      if (audioRef.current) { try { audioRef.current.pause() } catch {} }
    }
    try {
      const streamData = await getAudioStreamUrl(audioItem.id)
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = streamData.stream_url || streamData.url
          audioRef.current.play()
          setIsPlaying(true)
        }
      }, 100)
      getAudioTranscript(audioItem.id).then(t => { if (t?.has_transcript) setTranscript(t) }).catch(() => {})
    } catch (e) {
      // No audio available — that's OK if this is a video-only episode
      if (!audioItem.youtube_url) console.error(e)
    }
  }

  function seekTo(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    if (audioRef.current && duration) audioRef.current.currentTime = pct * duration
  }

  function fmtTime(s) {
    if (!s || isNaN(s)) return '0:00'
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }

  if (loading) return <div className="loading">Chargement...</div>
  if (!course) return <div className="loading">Cours introuvable</div>

  const color = getCursusColor(course.cursus_id)
  const letter = getCursusLetter(course.cursus_id)
  const audiosByModule = {}
  audios.forEach(a => { const mid = a.module_id || 'unknown'; if (!audiosByModule[mid]) audiosByModule[mid] = []; audiosByModule[mid].push(a) })

  const modNums = modules.map((m, i) => m.order || parseInt(m.id?.split('mod-')[1]) || (i + 1))
  // Context: show all resources for this cursus (like the mobile app)
  const courseCtxResources = contextResources
  // Biblios: already filtered by course_id from the API
  const courseBiblios = biblios

  const TABS = [
    { key: 'episodes', label: `Épisodes` },
    { key: 'frise', label: `Frise` },
    { key: 'contexte', label: `Contexte` },
    { key: 'biblio', label: `Bibliographie` },
    { key: 'professeur', label: `Professeur` },
  ]

  // Premium paywall block reused for Frise/Contexte/Biblio/Conférences
  const PaywallBlock = ({ testid, label }) => (
    <div data-testid={testid} style={{
      padding: 32, border: `1px solid ${color}33`, borderRadius: 4,
      background: `linear-gradient(135deg, ${color}11, transparent)`, textAlign: 'center',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: 3,
        textTransform: 'uppercase', color, marginBottom: 16,
      }}>Contenu réservé aux abonnés</div>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto 20px', lineHeight: 1.6 }}>
        {label} accessible avec un abonnement Sijill — 7&nbsp;€/mois ou 84&nbsp;€/an.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to={user ? '/pre-inscription' : '/inscription'} className="btn-accent">{user ? "Activer mon abonnement" : "Je m'abonne"}</Link>
        {!user && <Link to="/connexion" className="btn-outline">J'ai déjà un compte</Link>}
      </div>
    </div>
  )

  // Open a timeline securely via signed-token URL (issued only for subscribers)
  const openTimeline = async (tl) => {
    const token = localStorage.getItem('sijill_token')
    if (!token) { window.location.href = '/connexion?next=' + encodeURIComponent(window.location.pathname); return }
    const letter = course.cursus_id?.split('cursus-')[1]?.[0]?.toUpperCase() || 'A'
    const path = tl.filename
      ? `/timeline/file/${tl.filename}/access-url`
      : `/timeline/${letter}/access-url`
    try {
      const res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json()
      if (data.url) window.open(data.url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      // Fall back to login redirect on auth failure
      window.location.href = '/connexion?next=' + encodeURIComponent(window.location.pathname)
    }
  }

  return (
    <div data-testid="course-detail-page">
      <audio ref={audioRef} preload="auto" />

      <div className="course-hero">
        <Link to="/catalogue" className="course-back" data-testid="course-back-btn">&#8592; Retour au catalogue</Link>

        <div className="course-cursus-badge" style={{ borderColor: `${color}66`, color }}>
          <span style={{ width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 10 }}>{letter}</span>
          Cursus {letter}
        </div>

        <h1 className="course-detail-title" data-testid="course-title">{(course.title || course.name || '').replace(/^Cours \d+\s*:\s*/, '')}</h1>
        <p className="course-detail-desc">{course.description}</p>

        <div style={{ display: 'flex', gap: 24, marginBottom: 40, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="detail-stat">{modules.length} module{modules.length > 1 ? 's' : ''}</div>
          <div className="detail-stat">{audios.length} épisode{audios.length > 1 ? 's' : ''}</div>
          {course.scholar_name && <div className="detail-stat">Par {course.scholar_name}</div>}
          {course.coming_soon && (
            <div
              data-testid="course-coming-soon-badge"
              style={{
                fontFamily: 'var(--font-display)', fontSize: 10,
                letterSpacing: 2, textTransform: 'uppercase',
                color: 'var(--accent, #C9A84C)',
                padding: '6px 12px',
                border: '1px solid var(--accent, #C9A84C)',
                borderRadius: 2,
              }}
            >
              Disponible {course.available_date || 'prochainement'}
            </div>
          )}
        </div>

        {/* Video embed (ACCESS-GATED): episode-level priority, fallback to course-level. Paywall for non-subscribers. */}
        {(() => {
          const videoUrl = currentAudio?.youtube_url || course.youtube_url
          const hasVideo = !!videoUrl
          const embedUrl = buildYouTubeEmbedUrl(videoUrl)
          const isEpisodeVideo = !!currentAudio?.youtube_url
          if (!hasVideo && !currentAudio) return null

          // PAYWALL: not authenticated or no active subscription
          if (!hasAccess) {
            return (
              <div
                data-testid="paywall-cta"
                style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: 880,
                  aspectRatio: '16 / 9',
                  marginBottom: 24,
                  background: `linear-gradient(135deg, ${color}22, ${color}08)`,
                  border: `1px solid ${color}55`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: 32,
                }}
              >
                <div style={{ maxWidth: 520 }}>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: 11,
                    letterSpacing: 3, textTransform: 'uppercase',
                    color: color, marginBottom: 16,
                  }}>
                    Contenu réservé aux abonnés
                  </div>
                  <h2 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(22px, 3vw, 32px)',
                    fontWeight: 400, margin: '0 0 16px 0',
                    lineHeight: 1.2,
                  }}>
                    Accédez à l'intégralité de nos cours vidéo et podcast
                  </h2>
                  <p style={{
                    fontFamily: 'var(--font-body)', fontSize: 15,
                    color: 'var(--text-muted)', lineHeight: 1.6,
                    margin: '0 0 24px 0',
                  }}>
                    Abonnement fondateur à 7&nbsp;€/mois ou 84&nbsp;€/an pour débloquer tous les cursus et épisodes.
                  </p>
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {!user ? (
                      <>
                        <Link
                          to="/pre-inscription"
                          data-testid="paywall-cta-subscribe"
                          style={{
                            padding: '12px 28px',
                            background: color,
                            color: '#000', fontWeight: 600,
                            fontSize: 14, letterSpacing: 1,
                            textTransform: 'uppercase',
                            textDecoration: 'none',
                            borderRadius: 2,
                          }}
                        >
                          Je m'abonne
                        </Link>
                        <Link
                          to="/connexion"
                          data-testid="paywall-cta-login"
                          style={{
                            padding: '12px 28px',
                            border: `1px solid ${color}`,
                            color: color, fontWeight: 500,
                            fontSize: 14, letterSpacing: 1,
                            textTransform: 'uppercase',
                            textDecoration: 'none',
                            borderRadius: 2,
                          }}
                        >
                          J'ai déjà un compte
                        </Link>
                      </>
                    ) : (
                      <Link
                        to="/pre-inscription"
                        data-testid="paywall-cta-subscribe-loggedin"
                        style={{
                          padding: '12px 28px',
                          background: color,
                          color: '#000', fontWeight: 600,
                          fontSize: 14, letterSpacing: 1,
                          textTransform: 'uppercase',
                          textDecoration: 'none',
                          borderRadius: 2,
                        }}
                      >
                        Activer mon abonnement
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          }

          // Has access: show the actual embed
          if (!embedUrl) return null
          return (
            <div
              data-testid={isEpisodeVideo ? 'episode-youtube-embed' : 'course-youtube-embed'}
              onContextMenu={(e) => e.preventDefault()}
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: 880,
                aspectRatio: '16 / 9',
                marginBottom: 24,
                background: '#000',
                border: `1px solid ${color}33`,
              }}
            >
              <iframe
                src={embedUrl}
                title={isEpisodeVideo ? currentAudio?.title || 'Épisode vidéo' : 'Cours vidéo'}
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
              />
              {isEpisodeVideo && (
                <div style={{
                  position: 'absolute', top: 12, left: 12,
                  fontFamily: 'var(--font-display)', fontSize: 10,
                  letterSpacing: 2, textTransform: 'uppercase',
                  color: '#fff', background: 'rgba(0,0,0,0.6)',
                  padding: '4px 10px', borderRadius: 2, pointerEvents: 'none',
                }}>
                  {currentAudio.title}
                </div>
              )}
            </div>
          )
        })()}

        {/* 5 Tabs */}
        <div className="course-tabs" data-testid="course-tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`course-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
              style={{ '--tab-color': color }}
              data-testid={`tab-${tab.key}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ width: 60, height: 1, background: color, marginBottom: 40 }} />

        {/* ÉPISODES TAB */}
        {activeTab === 'episodes' && (
          <div style={{ maxWidth: 800 }}>
            {!hasAccess ? (
              <div data-testid="episodes-paywall" style={{
                padding: 32, border: `1px solid ${color}33`, borderRadius: 4,
                background: `linear-gradient(135deg, ${color}11, transparent)`, textAlign: 'center',
              }}>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: 3,
                  textTransform: 'uppercase', color, marginBottom: 16,
                }}>Contenu réservé aux abonnés</div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto 20px', lineHeight: 1.6 }}>
                  Les épisodes vidéo et podcast sont accessibles avec un abonnement Sijill — 7&nbsp;€/mois ou 84&nbsp;€/an.
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link to={user ? '/pre-inscription' : '/inscription'} className="btn-accent" data-testid="episodes-paywall-cta">{user ? "Activer mon abonnement" : "Je m'abonne"}</Link>
                  {!user && <Link to="/connexion" className="btn-outline">J'ai déjà un compte</Link>}
                </div>
              </div>
            ) : (() => {
              // Only show modules that have at least one episode
              const visibleModules = modules.filter(mod => (audiosByModule[mod.id] || []).length > 0)
              const orphanAudios = audios.filter(a => !a.module_id || !modules.find(m => m.id === a.module_id))
              if (visibleModules.length === 0 && orphanAudios.length === 0) {
                return <div style={{ padding: '32px 0', color: 'var(--text-dim)', fontSize: 14, textAlign: 'center' }}>Aucun épisode publié pour ce cours pour le moment.</div>
              }
              return (
                <>
                  {visibleModules.map((mod, mi) => {
                    const modAudios = audiosByModule[mod.id] || []
                    const isOpen = openModule === mod.id
                    return (
                      <div key={mod.id} data-testid={`module-item-${mi}`} style={{ marginBottom: 4 }}>
                        <div onClick={() => setOpenModule(isOpen ? null : mod.id)} className="module-row" style={{ borderLeftColor: isOpen ? color : 'transparent' }}>
                          <span className="module-num" style={{ color: `${color}88` }}>M{String(mi + 1).padStart(2, '0')}</span>
                          <span className="module-title">{mod.title || mod.name}</span>
                          <span className="module-ep-count">{modAudios.length} ép.</span>
                          <span style={{ fontSize: 12, color: 'var(--text-dim)', transition: 'transform 0.3s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>&#9660;</span>
                        </div>
                        {isOpen && (
                          <div className="episode-list-container" style={{ borderLeftColor: `${color}33` }}>
                            {modAudios.map((ep, ei) => {
                              const isCurrent = currentAudio?.id === ep.id
                              return (
                                <div key={ep.id} className={`episode-row ${isCurrent ? 'episode-active' : ''}`} onClick={() => playAudio(ep)} data-testid={`episode-${mi}-${ei}`} style={{ cursor: 'pointer' }}>
                                  <span className="episode-num" style={{ color: isCurrent ? color : `${color}55` }}>{String(ei + 1).padStart(2, '0')}</span>
                                  <span className="episode-title" style={{ color: isCurrent ? color : 'var(--text)' }}>{ep.title}</span>
                                  {ep.has_transcript && <span className="tag-texte">Texte</span>}
                                  {ep.youtube_url && <span className="tag-texte" style={{ background: 'rgba(220,53,69,0.12)', color: '#dc3545', borderColor: 'rgba(220,53,69,0.3)' }}>Vidéo</span>}
                                  {isCurrent && isPlaying ? <span style={{ color, fontSize: 14 }}>&#9646;&#9646;</span> : <span style={{ color, fontSize: 14 }}>&#9654;</span>}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {orphanAudios.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      {orphanAudios.map((ep, ei) => {
                        const isCurrent = currentAudio?.id === ep.id
                        return (
                          <div key={ep.id} className={`episode-row ${isCurrent ? 'episode-active' : ''}`} onClick={() => playAudio(ep)} data-testid={`orphan-episode-${ei}`} style={{ cursor: 'pointer' }}>
                            <span className="episode-num" style={{ color: isCurrent ? color : `${color}55` }}>{String(ei + 1).padStart(2, '0')}</span>
                            <span className="episode-title" style={{ color: isCurrent ? color : 'var(--text)' }}>{ep.title}</span>
                            {ep.has_transcript && <span className="tag-texte">Texte</span>}
                            {ep.youtube_url && <span className="tag-texte" style={{ background: 'rgba(220,53,69,0.12)', color: '#dc3545', borderColor: 'rgba(220,53,69,0.3)' }}>Vidéo</span>}
                            {isCurrent && isPlaying ? <span style={{ color, fontSize: 14 }}>&#9646;&#9646;</span> : <span style={{ color, fontSize: 14 }}>&#9654;</span>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        )}

        {/* FRISE CHRONOLOGIQUE TAB */}
        {activeTab === 'frise' && (
          <div style={{ maxWidth: 800 }} data-testid="frise-tab">
            {!hasAccess ? (
              <PaywallBlock testid="frise-paywall" label="La frise chronologique interactive est" />
            ) : timelines.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucune frise disponible.</p>
            ) : timelines.map(tl => (
              <button
                type="button"
                key={tl.filename || tl.id}
                onClick={() => openTimeline(tl)}
                className="res-card"
                data-testid={`timeline-${tl.id || tl.filename}`}
                style={{ width: '100%', textAlign: 'left', cursor: 'pointer', background: 'transparent', border: '1px solid var(--border)', font: 'inherit', color: 'inherit' }}
              >
                <div className="res-card-icon" style={{ background: `${color}1A` }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <div className="res-card-body">
                  <div className="res-card-title">{tl.title || tl.cursus_name}</div>
                  <div className="res-card-subtitle">Timeline interactive · Plein écran</div>
                </div>
                <span className="res-card-chevron">&#8250;</span>
              </button>
            ))}
          </div>
        )}

        {/* CONTEXTE TAB */}
        {activeTab === 'contexte' && (
          <div style={{ maxWidth: 800 }} data-testid="contexte-tab">
            {!hasAccess ? (
              <PaywallBlock testid="contexte-paywall" label="Les fiches de contexte historique sont" />
            ) : courseCtxResources.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucune fiche contextuelle disponible.</p>
            ) : courseCtxResources.map(ctx => (
              <Link key={ctx.id} to={`/ressource/fiche/${ctx.id}`} className="res-card" data-testid={`context-${ctx.id}`}>
                <div className="res-card-icon" style={{ background: `${color}1A` }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div className="res-card-body">
                  <div className="res-card-title">{ctx.title || ctx.subject}</div>
                  <div className="res-card-subtitle">Module {ctx.module_number} · Contexte historique</div>
                </div>
                <span className="res-card-chevron">&#8250;</span>
              </Link>
            ))}
          </div>
        )}

        {/* BIBLIOGRAPHIE TAB */}
        {activeTab === 'biblio' && (
          <div style={{ maxWidth: 800 }} data-testid="biblio-tab">
            {!hasAccess ? (
              <PaywallBlock testid="biblio-paywall" label="Les bibliographies sélectives sont" />
            ) : courseBiblios.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucune bibliographie disponible.</p>
            ) : courseBiblios.map(bib => (
              <Link key={bib.id} to={`/ressource/biblio/${bib.id}`} className="res-card" data-testid={`biblio-${bib.id}`}>
                <div className="res-card-icon" style={{ background: `${color}1A` }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                </div>
                <div className="res-card-body">
                  <div className="res-card-title">{bib.title || `Bibliographie — Module ${bib.module_number}`}</div>
                  <div className="res-card-subtitle">Bibliographie</div>
                </div>
                <span className="res-card-chevron">&#8250;</span>
              </Link>
            ))}
          </div>
        )}

        {/* CONFÉRENCES TAB */}
        {activeTab === 'professeur' && (
          <div style={{ maxWidth: 800 }} data-testid="professeur-tab">
            {course.scholar_id ? (
              <Link
                to={`/intervenant/${course.scholar_id}`}
                data-testid={`professeur-card-${course.scholar_id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 24,
                  padding: 24, border: `1px solid ${color}33`, borderRadius: 4,
                  textDecoration: 'none', color: 'inherit',
                  background: `linear-gradient(135deg, ${color}11, transparent)`,
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = color }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = `${color}33` }}
              >
                <div style={{
                  width: 96, height: 96, borderRadius: '50%',
                  backgroundColor: 'var(--bg-card)',
                  border: `1px solid ${color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontSize: 32,
                  color, flexShrink: 0,
                }}>
                  {(course.scholar_name || '').split(/[\s·-]+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: 2,
                    textTransform: 'uppercase', color, marginBottom: 8,
                  }}>Intervenant</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)', marginBottom: 8 }}>
                    {course.scholar_name}
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)' }}>
                    Voir la fiche complète &nbsp;&#8250;
                  </div>
                </div>
              </Link>
            ) : course.scholar_name ? (
              <div style={{ padding: 24, border: '1px solid var(--border)', borderRadius: 4 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)' }}>
                  {course.scholar_name}
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Intervenant à venir.</p>
            )}
          </div>
        )}

        {!user && (
          <div className="course-cta" data-testid="course-cta-login" style={{ marginTop: 32 }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
              L'ensemble des contenus (épisodes, frise, contexte, bibliographie, conférences) est réservé aux abonnés Sijill.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Link to="/connexion" className="btn-outline">Se connecter</Link>
              <Link to="/inscription" className="btn-accent">S'inscrire</Link>
            </div>
          </div>
        )}
      </div>

      {/* Audio Player Bar */}
      {currentAudio && (
        <div className="player-bar" data-testid="audio-player-bar">
          {showTranscript && transcript && (
            <div className="transcript-panel" data-testid="transcript-panel">
              <div className="transcript-header">
                <span className="transcript-title">{transcript.title}</span>
                <span className="transcript-meta">{transcript.word_count} mots · {transcript.reading_time_minutes} min de lecture</span>
              </div>
              <div className="transcript-content" dangerouslySetInnerHTML={{
                __html: (transcript.content || '').replace(/^## (.*$)/gm, '<h3>$1</h3>').replace(/^### (.*$)/gm, '<h4>$1</h4>').replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')
              }} />
            </div>
          )}
          <div className="player-progress" onClick={seekTo} data-testid="player-progress">
            <div className="player-progress-fill" style={{ width: `${progress}%`, background: color }} />
          </div>
          <div className="player-bar-inner">
            <div className="player-info">
              <div className="player-dot" style={{ background: color }} />
              <div>
                <div className="player-track-title">{currentAudio.title}</div>
                <div className="player-track-meta">{fmtTime(currentTime)} / {fmtTime(duration)}</div>
              </div>
            </div>
            <div className="player-controls">
              <button className="player-skip-btn" onClick={() => { if (audioRef.current) audioRef.current.currentTime -= 15 }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12.5 8V4L6 8l6.5 4V8z"/><path d="M12 20a8 8 0 0 0 0-16"/><text x="7" y="16" fill="currentColor" fontSize="7" fontFamily="sans-serif">15</text></svg></button>
              <button className="player-play-main" style={{ background: color }} onClick={() => playAudio(currentAudio)}>
                {isPlaying ? <svg width="20" height="20" viewBox="0 0 24 24" fill="#0A0A0A"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> : <svg width="20" height="20" viewBox="0 0 24 24" fill="#0A0A0A"><polygon points="6,4 20,12 6,20"/></svg>}
              </button>
              <button className="player-skip-btn" onClick={() => { if (audioRef.current) audioRef.current.currentTime += 15 }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11.5 8V4L18 8l-6.5 4V8z"/><path d="M12 20a8 8 0 0 1 0-16"/><text x="7" y="16" fill="currentColor" fontSize="7" fontFamily="sans-serif">15</text></svg></button>
            </div>
            <div className="player-actions">
              {transcript && <button className={`player-text-btn ${showTranscript ? 'active' : ''}`} onClick={() => setShowTranscript(!showTranscript)} style={{ color: showTranscript ? color : 'var(--text-muted)' }}>Lire</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
