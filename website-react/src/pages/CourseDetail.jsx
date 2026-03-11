import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getCourseDetail, getModules, getAudios, getAudioStreamUrl, getAudioTranscript, getContextResources } from '../api'
import { getCursusColor, getCursusLetter, formatDuration } from '../constants'
import { useAuth } from '../AuthContext'

export default function CourseDetail() {
  const { courseId } = useParams()
  const { user } = useAuth()
  const [course, setCourse] = useState(null)
  const [modules, setModules] = useState([])
  const [audios, setAudios] = useState([])
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [openModule, setOpenModule] = useState(null)
  // Audio player state
  const [currentAudio, setCurrentAudio] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  // Transcript state
  const [transcript, setTranscript] = useState(null)
  const [showTranscript, setShowTranscript] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    Promise.all([
      getCourseDetail(courseId),
      getModules(courseId),
      getAudios(courseId).catch(() => []),
    ]).then(([courseData, modsData, audiosData]) => {
      setCourse(courseData)
      setModules(modsData || [])
      setAudios(audiosData || [])
      // Fetch resources based on cursus
      if (courseData?.cursus_id) {
        getContextResources(courseData.cursus_id).then(r => {
          setResources(r?.resources || [])
        }).catch(() => {})
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [courseId])

  // Audio player
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
    if (!user) return
    if (currentAudio?.id === audioItem.id && isPlaying) {
      audioRef.current?.pause()
      setIsPlaying(false)
      return
    }
    if (currentAudio?.id === audioItem.id && !isPlaying) {
      audioRef.current?.play()
      setIsPlaying(true)
      return
    }
    try {
      const streamData = await getAudioStreamUrl(audioItem.id)
      setCurrentAudio(audioItem)
      setShowTranscript(false)
      setTranscript(null)
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = streamData.stream_url || streamData.url
          audioRef.current.play()
          setIsPlaying(true)
        }
      }, 100)
      // Load transcript
      getAudioTranscript(audioItem.id).then(t => {
        if (t?.has_transcript) setTranscript(t)
      }).catch(() => {})
    } catch (e) { console.error(e) }
  }

  function seekTo(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    if (audioRef.current && duration) {
      audioRef.current.currentTime = pct * duration
    }
  }

  function fmtTime(s) {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  if (loading) return <div className="loading">Chargement...</div>
  if (!course) return <div className="loading">Cours introuvable</div>

  const color = getCursusColor(course.cursus_id)
  const letter = getCursusLetter(course.cursus_id)

  // Group audios by module
  const audiosByModule = {}
  audios.forEach(a => {
    const mid = a.module_id || 'unknown'
    if (!audiosByModule[mid]) audiosByModule[mid] = []
    audiosByModule[mid].push(a)
  })

  // Filter resources for this course's modules
  const courseModuleNums = modules.map(m => m.order || parseInt(m.id?.split('mod-')[1]) || 0)
  const courseResources = resources.filter(r => courseModuleNums.includes(r.module_number))

  return (
    <div data-testid="course-detail-page">
      <audio ref={audioRef} preload="auto" />

      <div className="course-hero">
        <Link to="/cursus" className="course-back" data-testid="course-back-btn">
          &#8592; Retour aux cursus
        </Link>

        <div className="course-cursus-badge" style={{ borderColor: `${color}66`, color }}>
          <span style={{
            width: 20, height: 20, display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: 10,
          }}>
            {letter}
          </span>
          Cursus {letter}
        </div>

        <h1 className="course-detail-title" data-testid="course-title">
          {course.title || course.name}
        </h1>
        <p className="course-detail-desc">{course.description}</p>

        <div style={{ display: 'flex', gap: 24, marginBottom: 60, flexWrap: 'wrap' }}>
          <div className="detail-stat">{modules.length} module{modules.length > 1 ? 's' : ''}</div>
          <div className="detail-stat">{audios.length} épisode{audios.length > 1 ? 's' : ''}</div>
          {course.scholar_name && <div className="detail-stat">Par {course.scholar_name}</div>}
        </div>

        <div style={{ width: 60, height: 1, background: color, marginBottom: 40 }} />

        {/* Modules accordion */}
        <div style={{ maxWidth: 800 }}>
          <div className="detail-section-title">Modules & épisodes</div>

          {modules.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Aucun module disponible pour le moment.
            </p>
          )}

          {modules.map((mod, mi) => {
            const modAudios = audiosByModule[mod.id] || []
            const isOpen = openModule === mod.id

            return (
              <div key={mod.id} data-testid={`module-item-${mi}`} style={{ marginBottom: 4 }}>
                <div
                  onClick={() => setOpenModule(isOpen ? null : mod.id)}
                  className="module-row"
                  style={{ borderLeftColor: isOpen ? color : 'transparent' }}
                >
                  <span className="module-num" style={{ color: `${color}88` }}>
                    M{String(mi + 1).padStart(2, '0')}
                  </span>
                  <span className="module-title">{mod.title || mod.name}</span>
                  <span className="module-ep-count">{modAudios.length} ép.</span>
                  <span style={{
                    fontSize: 12, color: 'var(--text-dim)',
                    transition: 'transform 0.3s', transform: isOpen ? 'rotate(180deg)' : 'none',
                  }}>&#9660;</span>
                </div>

                {isOpen && (
                  <div className="episode-list-container" style={{ borderLeftColor: `${color}33` }}>
                    {modAudios.length === 0 ? (
                      <div style={{ padding: '16px 24px', color: 'var(--text-dim)', fontSize: 14 }}>
                        Pas encore d'épisodes disponibles.
                      </div>
                    ) : modAudios.map((ep, ei) => {
                      const isCurrent = currentAudio?.id === ep.id
                      return (
                        <div
                          key={ep.id}
                          className={`episode-row ${isCurrent ? 'episode-active' : ''}`}
                          onClick={() => user && playAudio(ep)}
                          data-testid={`episode-${mi}-${ei}`}
                          style={{ cursor: user ? 'pointer' : 'default' }}
                        >
                          <span className="episode-num" style={{ color: isCurrent ? color : `${color}55` }}>
                            {String(ei + 1).padStart(2, '0')}
                          </span>
                          <span className="episode-title" style={{ color: isCurrent ? color : 'var(--text)' }}>
                            {ep.title}
                          </span>
                          {ep.has_transcript && (
                            <span style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 2, fontFamily: 'var(--font-display)', textTransform: 'uppercase' }}>
                              Texte
                            </span>
                          )}
                          {!user ? (
                            <span className="episode-lock">&#128274;</span>
                          ) : isCurrent && isPlaying ? (
                            <span style={{ color, fontSize: 14 }}>&#9646;&#9646;</span>
                          ) : (
                            <span style={{ color: user ? color : 'var(--text-dim)', fontSize: 14 }}>&#9654;</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Resources section */}
        {courseResources.length > 0 && (
          <div style={{ maxWidth: 800, marginTop: 64 }}>
            <div className="detail-section-title">Ressources associées</div>
            <div className="resources-grid">
              {courseResources.map(r => (
                <a
                  key={r.id}
                  href={`${window.location.origin}/api/resources/context/${r.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="resource-card"
                  data-testid={`resource-${r.id}`}
                >
                  <div className="resource-icon" style={{ color }}>&#9741;</div>
                  <div>
                    <div className="resource-title">{r.title}</div>
                    <div className="resource-meta">Module {r.module_number} &middot; {r.subject}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* CTA if not logged in */}
        {!user && (
          <div className="course-cta" data-testid="course-cta-login">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 12 }}>
              Écoutez ce cours
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-muted)', marginBottom: 24 }}>
              Connectez-vous ou créez un compte pour accéder à l'intégralité du contenu.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Link to="/connexion" className="btn-accent">Se connecter</Link>
              <Link to="/inscription" className="btn-outline">S'inscrire</Link>
            </div>
          </div>
        )}
      </div>

      {/* Fixed audio player bar */}
      {currentAudio && (
        <div className="player-bar" data-testid="audio-player-bar">
          {/* Transcript panel */}
          {showTranscript && transcript && (
            <div className="transcript-panel" data-testid="transcript-panel">
              <div className="transcript-header">
                <span className="transcript-title">{transcript.title}</span>
                <span className="transcript-meta">{transcript.word_count} mots &middot; {transcript.reading_time_minutes} min de lecture</span>
              </div>
              <div className="transcript-content" dangerouslySetInnerHTML={{
                __html: (transcript.content || '').replace(/^## (.*$)/gm, '<h3>$1</h3>').replace(/^### (.*$)/gm, '<h4>$1</h4>').replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')
              }} />
            </div>
          )}

          <div className="player-bar-inner">
            <div className="player-info">
              <div className="player-dot" style={{ background: color }} />
              <div>
                <div className="player-track-title">{currentAudio.title}</div>
                <div className="player-track-meta">{fmtTime(currentTime)} / {fmtTime(duration)}</div>
              </div>
            </div>

            <div className="player-controls">
              <button className="player-btn" onClick={() => { if (audioRef.current) { audioRef.current.currentTime -= 15 } }} data-testid="player-rewind">
                -15
              </button>
              <button
                className="player-play-btn"
                style={{ background: color }}
                onClick={() => playAudio(currentAudio)}
                data-testid="player-play"
              >
                {isPlaying ? '&#9646;&#9646;' : '&#9654;'}
              </button>
              <button className="player-btn" onClick={() => { if (audioRef.current) { audioRef.current.currentTime += 15 } }} data-testid="player-forward">
                +15
              </button>
            </div>

            <div className="player-actions">
              {transcript && (
                <button
                  className={`player-text-btn ${showTranscript ? 'active' : ''}`}
                  onClick={() => setShowTranscript(!showTranscript)}
                  data-testid="player-transcript-toggle"
                  style={{ color: showTranscript ? color : 'var(--text-muted)' }}
                >
                  Lire
                </button>
              )}
            </div>

            <div className="player-progress" onClick={seekTo} data-testid="player-progress">
              <div className="player-progress-fill" style={{ width: `${progress}%`, background: color }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
