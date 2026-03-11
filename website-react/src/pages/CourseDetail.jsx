import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getCourseDetail, getModules, getAudios, getAudioStreamUrl, getAudioTranscript, getContextResources, getBibliographies } from '../api'
import { getCursusColor, getCursusLetter, formatDuration } from '../constants'
import { useAuth } from '../AuthContext'

const CURSUS_LETTER_MAP = {
  'cursus-falsafa': 'A', 'cursus-theologie': 'B',
  'cursus-sciences-islamiques': 'C', 'cursus-arts': 'D', 'cursus-spiritualites': 'E',
}

export default function CourseDetail() {
  const { courseId } = useParams()
  const { user } = useAuth()
  const [course, setCourse] = useState(null)
  const [modules, setModules] = useState([])
  const [audios, setAudios] = useState([])
  const [resources, setResources] = useState([])
  const [biblios, setBiblios] = useState([])
  const [loading, setLoading] = useState(true)
  const [openModule, setOpenModule] = useState(null)
  const [activeTab, setActiveTab] = useState('modules')
  const [currentAudio, setCurrentAudio] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
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
      if (courseData?.cursus_id) {
        const letter = CURSUS_LETTER_MAP[courseData.cursus_id]
        getContextResources(courseData.cursus_id).then(r => setResources(r?.resources || [])).catch(() => {})
        getBibliographies(letter).then(bibs => setBiblios(bibs || [])).catch(() => {})
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
    if (!user) return
    if (currentAudio?.id === audioItem.id) {
      if (isPlaying) { audioRef.current?.pause(); setIsPlaying(false) }
      else { audioRef.current?.play(); setIsPlaying(true) }
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
      getAudioTranscript(audioItem.id).then(t => { if (t?.has_transcript) setTranscript(t) }).catch(() => {})
    } catch (e) { console.error(e) }
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

  // Filter resources & biblios for this course's modules
  const modNums = modules.map((m, i) => m.order || parseInt(m.id?.split('mod-')[1]) || (i + 1))
  const courseResources = resources.filter(r => modNums.includes(r.module_number))
  const courseBiblios = biblios.filter(b => {
    const bModNum = parseInt(b.id?.split('mod')[1]) || 0
    return modNums.includes(bModNum)
  })

  return (
    <div data-testid="course-detail-page">
      <audio ref={audioRef} preload="auto" />

      <div className="course-hero">
        <Link to="/cursus" className="course-back" data-testid="course-back-btn">&#8592; Retour aux cursus</Link>

        <div className="course-cursus-badge" style={{ borderColor: `${color}66`, color }}>
          <span style={{ width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 10 }}>
            {letter}
          </span>
          Cursus {letter}
        </div>

        <h1 className="course-detail-title" data-testid="course-title">{course.title || course.name}</h1>
        <p className="course-detail-desc">{course.description}</p>

        <div style={{ display: 'flex', gap: 24, marginBottom: 40, flexWrap: 'wrap' }}>
          <div className="detail-stat">{modules.length} module{modules.length > 1 ? 's' : ''}</div>
          <div className="detail-stat">{audios.length} épisode{audios.length > 1 ? 's' : ''}</div>
          {course.scholar_name && <div className="detail-stat">Par {course.scholar_name}</div>}
        </div>

        {/* Tabs */}
        <div className="course-tabs" data-testid="course-tabs">
          {['modules', 'fiches', 'biblio'].map(tab => (
            <button
              key={tab}
              className={`course-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
              style={{ '--tab-color': color }}
              data-testid={`tab-${tab}`}
            >
              {tab === 'modules' ? `Modules (${modules.length})` :
               tab === 'fiches' ? `Fiches (${courseResources.length})` :
               `Bibliographie (${courseBiblios.length})`}
            </button>
          ))}
        </div>

        <div style={{ width: 60, height: 1, background: color, marginBottom: 40 }} />

        {/* Modules tab */}
        {activeTab === 'modules' && (
          <div style={{ maxWidth: 800 }}>
            {modules.map((mod, mi) => {
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
                      {modAudios.length === 0 ? (
                        <div style={{ padding: '16px 24px', color: 'var(--text-dim)', fontSize: 14 }}>Pas encore d'épisodes.</div>
                      ) : modAudios.map((ep, ei) => {
                        const isCurrent = currentAudio?.id === ep.id
                        return (
                          <div key={ep.id} className={`episode-row ${isCurrent ? 'episode-active' : ''}`} onClick={() => user && playAudio(ep)} data-testid={`episode-${mi}-${ei}`} style={{ cursor: user ? 'pointer' : 'default' }}>
                            <span className="episode-num" style={{ color: isCurrent ? color : `${color}55` }}>{String(ei + 1).padStart(2, '0')}</span>
                            <span className="episode-title" style={{ color: isCurrent ? color : 'var(--text)' }}>{ep.title}</span>
                            {ep.has_transcript && <span style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 2, fontFamily: 'var(--font-display)', textTransform: 'uppercase' }}>Texte</span>}
                            {!user ? <span className="episode-lock">&#128274;</span> :
                             isCurrent && isPlaying ? <span style={{ color, fontSize: 14 }}>&#9646;&#9646;</span> :
                             <span style={{ color: user ? color : 'var(--text-dim)', fontSize: 14 }}>&#9654;</span>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Fiches tab */}
        {activeTab === 'fiches' && (
          <div style={{ maxWidth: 800 }}>
            {courseResources.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucune fiche contextuelle disponible.</p>
            ) : (
              <div className="resources-grid">
                {courseResources.map(r => (
                  <Link key={r.id} to={`/ressource/fiche/${r.id}`} className="resource-card" data-testid={`resource-${r.id}`}>
                    <div className="resource-icon" style={{ color }}>&#9741;</div>
                    <div>
                      <div className="resource-title">{r.title || r.subject}</div>
                      <div className="resource-meta">Module {r.module_number}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Biblio tab */}
        {activeTab === 'biblio' && (
          <div style={{ maxWidth: 800 }}>
            {courseBiblios.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucune bibliographie disponible.</p>
            ) : (
              <div className="resources-grid">
                {courseBiblios.map(b => (
                  <Link key={b.id} to={`/ressource/biblio/${b.id}`} className="resource-card" data-testid={`biblio-${b.id}`}>
                    <div className="resource-icon" style={{ color }}>&#128218;</div>
                    <div>
                      <div className="resource-title">Bibliographie</div>
                      <div className="resource-meta">{b.id?.replace('biblio-', '').replace('-', ' module ')}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CTA if not logged in */}
        {!user && (
          <div className="course-cta" data-testid="course-cta-login">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 12 }}>Écoutez ce cours</div>
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

      {/* Audio Player Bar — app-like design */}
      {currentAudio && (
        <div className="player-bar" data-testid="audio-player-bar">
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

          {/* Progress bar at top */}
          <div className="player-progress" onClick={seekTo} data-testid="player-progress">
            <div className="player-progress-fill" style={{ width: `${progress}%`, background: color }} />
          </div>

          <div className="player-bar-inner">
            {/* Track info */}
            <div className="player-info">
              <div className="player-dot" style={{ background: color }} />
              <div>
                <div className="player-track-title">{currentAudio.title}</div>
                <div className="player-track-meta">{fmtTime(currentTime)} / {fmtTime(duration)}</div>
              </div>
            </div>

            {/* Controls — app-like */}
            <div className="player-controls">
              <button className="player-skip-btn" onClick={() => { if (audioRef.current) audioRef.current.currentTime -= 15 }} data-testid="player-rewind">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12.5 8V4L6 8l6.5 4V8z"/><path d="M12 20a8 8 0 0 0 0-16"/><text x="7" y="16" fill="currentColor" fontSize="7" fontFamily="var(--font-display)">15</text></svg>
              </button>
              <button className="player-play-main" style={{ background: color }} onClick={() => playAudio(currentAudio)} data-testid="player-play">
                {isPlaying ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#0A0A0A"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#0A0A0A"><polygon points="6,4 20,12 6,20"/></svg>
                )}
              </button>
              <button className="player-skip-btn" onClick={() => { if (audioRef.current) audioRef.current.currentTime += 15 }} data-testid="player-forward">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11.5 8V4L18 8l-6.5 4V8z"/><path d="M12 20a8 8 0 0 1 0-16"/><text x="7" y="16" fill="currentColor" fontSize="7" fontFamily="var(--font-display)">15</text></svg>
              </button>
            </div>

            {/* Actions */}
            <div className="player-actions">
              {transcript && (
                <button className={`player-text-btn ${showTranscript ? 'active' : ''}`} onClick={() => setShowTranscript(!showTranscript)} data-testid="player-transcript-toggle" style={{ color: showTranscript ? color : 'var(--text-muted)' }}>
                  Lire
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
