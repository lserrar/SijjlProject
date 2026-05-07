import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getCourseDetail, getModules, getAudios, getAudioStreamUrl, getAudioTranscript, getContextResources, getCourseResources, getEpisodeAudioAccessUrl } from '../api'
import { getCursusColor, getCursusLetter, buildYouTubeEmbedUrl } from '../constants'
import { useAuth } from '../AuthContext'

const CURSUS_LETTER_MAP = {
  'cursus-falsafa': 'A', 'cursus-theologie': 'B',
  'cursus-sciences-islamiques': 'C', 'cursus-arts': 'D', 'cursus-spiritualites': 'E',
}
const API_BASE = window.location.origin + '/api'

const RES_TYPE_LABELS = {
  script: "Script",
  glossaire: "Glossaire",
  biblio: "Bibliographie",
  bibliographie: "Bibliographie",
  slides: "Slides",
  document: "Document",
}

function ResourceList({ resources, courseId, color }) {
  const navigate = useNavigate()

  function openResource(res) {
    // Slides → protected PDF inline viewer ; other docs → blog-style article rendering.
    if (res.type === 'slides') {
      navigate(`/cours/${courseId}/slides?key=${encodeURIComponent(res.r2_key)}`)
    } else {
      navigate(`/cours/${courseId}/ressource?key=${encodeURIComponent(res.r2_key)}`)
    }
  }

  // Group resources: course-level first, then by episode number
  const courseRes = resources.filter(r => r.scope === 'course')
  const epRes = resources.filter(r => r.scope === 'episode')
  const epGrouped = {}
  epRes.forEach(r => {
    const k = r.episode_number || 0
    if (!epGrouped[k]) epGrouped[k] = []
    epGrouped[k].push(r)
  })
  const epKeys = Object.keys(epGrouped).map(Number).sort((a, b) => a - b)

  return (
    <div data-testid="resource-list">
      {courseRes.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 11,
            letterSpacing: 2, textTransform: 'uppercase',
            color: `${color}AA`, marginBottom: 12,
          }}>
            Ressources du cours
          </div>
          {courseRes.map(r => (
            <ResourceCard
              key={r.r2_key}
              resource={r}
              color={color}
              onOpen={() => openResource(r)}
            />
          ))}
        </div>
      )}

      {epKeys.map(num => (
        <div key={num} style={{ marginBottom: 24 }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 11,
            letterSpacing: 2, textTransform: 'uppercase',
            color: `${color}AA`, marginBottom: 12,
          }}>
            Épisode {num}
          </div>
          {epGrouped[num].map(r => (
            <ResourceCard
              key={r.r2_key}
              resource={r}
              color={color}
              onOpen={() => openResource(r)}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function ResourceCard({ resource, color, onOpen }) {
  const typeLabel = RES_TYPE_LABELS[resource.type] || (resource.mime?.includes('pdf') ? 'PDF' : 'Document')
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid={`resource-card-${resource.r2_key.split('/').pop()}`}
      className="res-card"
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer',
        background: 'transparent', border: '1px solid var(--border)',
        font: 'inherit', color: 'inherit',
      }}
    >
      <div className="res-card-icon" style={{ background: `${color}1A` }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="9" y1="13" x2="15" y2="13"/>
          <line x1="9" y1="17" x2="13" y2="17"/>
        </svg>
      </div>
      <div className="res-card-body">
        <div className="res-card-title">{resource.label}</div>
        <div className="res-card-subtitle">
          {typeLabel}
          {resource.mime?.includes('pdf') ? ' · PDF' : resource.mime?.includes('wordprocessingml') ? ' · Word' : ''}
        </div>
      </div>
      <span className="res-card-chevron">{'\u203A'}</span>
    </button>
  )
}

function EpisodeRow({ ep, idx, color, testid, isAudioActive, isVideoActive, onPlayAudio, onPlayVideo }) {
  const hasAudio = !!ep.has_r2_audio
  const hasVideo = !!ep.youtube_url
  return (
    <div
      className="episode-row"
      data-testid={testid}
      style={{
        cursor: 'default',
        background: (isAudioActive || isVideoActive) ? `${color}0E` : 'transparent',
        borderLeft: `2px solid ${(isAudioActive || isVideoActive) ? color : 'transparent'}`,
        paddingLeft: 16,
        flexWrap: 'wrap', gap: 8,
      }}
    >
      <span className="episode-num" style={{ color: (isAudioActive || isVideoActive) ? color : `${color}55` }}>
        {String(idx + 1).padStart(2, '0')}
      </span>
      <span className="episode-title" style={{ color: (isAudioActive || isVideoActive) ? color : 'var(--text)', flex: 1, minWidth: 200 }}>
        {ep.title}
      </span>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onPlayVideo() }}
          disabled={!hasVideo}
          data-testid={`${testid}-video-btn`}
          title={hasVideo ? "Regarder la vidéo" : "Vidéo bientôt disponible"}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', fontSize: 12,
            fontFamily: 'var(--font-display)', letterSpacing: 1.5, textTransform: 'uppercase',
            border: `1px solid ${isVideoActive ? color : (hasVideo ? `${color}66` : 'var(--border)')}`,
            background: isVideoActive ? color : 'transparent',
            color: isVideoActive ? '#fff' : (hasVideo ? color : 'var(--text-dim)'),
            cursor: hasVideo ? 'pointer' : 'not-allowed',
            opacity: hasVideo ? 1 : 0.45,
            borderRadius: 2, transition: 'all 0.2s',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          Vidéo
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onPlayAudio() }}
          disabled={!hasAudio}
          data-testid={`${testid}-audio-btn`}
          title={hasAudio ? "Écouter le podcast" : "Audio bientôt disponible"}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', fontSize: 12,
            fontFamily: 'var(--font-display)', letterSpacing: 1.5, textTransform: 'uppercase',
            border: `1px solid ${isAudioActive ? color : (hasAudio ? `${color}66` : 'var(--border)')}`,
            background: isAudioActive ? color : 'transparent',
            color: isAudioActive ? '#fff' : (hasAudio ? color : 'var(--text-dim)'),
            cursor: hasAudio ? 'pointer' : 'not-allowed',
            opacity: hasAudio ? 1 : 0.45,
            borderRadius: 2, transition: 'all 0.2s',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
            <path d="M21 19a2 2 0 0 1-2 2h-1v-7h3z"/>
            <path d="M3 19a2 2 0 0 0 2 2h1v-7H3z"/>
          </svg>
          Audio
        </button>
      </div>
    </div>
  )
}

export default function CourseDetail() {
  const { courseId } = useParams()
  const { user } = useAuth()
  const [course, setCourse] = useState(null)
  const [modules, setModules] = useState([])
  const [audios, setAudios] = useState([])
  const [contextResources, setContextResources] = useState([])
  const [resources, setResources] = useState([])
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
  const [scholarsMap, setScholarsMap] = useState({})
  // Currently selected episode for YouTube iframe (separate from bottom audio player)
  const [currentVideo, setCurrentVideo] = useState(null)
  const audioRef = useRef(null)

  useEffect(() => {
    // Load all scholars once for the Professeur tab (primary + co-intervenants)
    fetch(`${API_BASE}/scholars`)
      .then(r => r.ok ? r.json() : [])
      .then(list => {
        const map = {}
        ;(list || []).forEach(s => { if (s.id) map[s.id] = s })
        setScholarsMap(map)
      })
      .catch(() => {})
  }, [])

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
        getCourseResources(courseId).then(r => setResources(r?.resources || [])).catch(() => setResources([]))
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
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnd)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnd)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
    }
  }, [currentAudio])

  // Media Session API — enables lock-screen / notification controls when phone screen is off
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    if (!currentAudio) return
    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: currentAudio.title || 'Sijill Project',
        artist: currentAudio.scholar_name || course?.scholar_name || 'Sijill Project',
        album: course?.title || course?.name || 'Sijill Project',
        artwork: [
          { src: `${window.location.origin}/api/site/favicon.svg`, sizes: '512x512', type: 'image/svg+xml' },
        ],
      })
      const safe = (fn) => { try { fn() } catch {} }
      navigator.mediaSession.setActionHandler('play', () => safe(() => audioRef.current?.play()))
      navigator.mediaSession.setActionHandler('pause', () => safe(() => audioRef.current?.pause()))
      navigator.mediaSession.setActionHandler('seekbackward', (d) => safe(() => {
        if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - (d.seekOffset || 15))
      }))
      navigator.mediaSession.setActionHandler('seekforward', (d) => safe(() => {
        if (audioRef.current) audioRef.current.currentTime = audioRef.current.currentTime + (d.seekOffset || 15)
      }))
      navigator.mediaSession.setActionHandler('seekto', (d) => safe(() => {
        if (audioRef.current && d.seekTime != null) audioRef.current.currentTime = d.seekTime
      }))
    } catch {}
  }, [currentAudio, course])

  // Update Media Session position state for accurate lock-screen progress bar
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return
    if (!duration) return
    try {
      navigator.mediaSession.setPositionState({ duration, position: currentTime, playbackRate: 1.0 })
    } catch {}
  }, [duration, currentTime])

  function ensureAccess() {
    if (!user) {
      window.location.href = '/connexion?next=' + encodeURIComponent(window.location.pathname)
      return false
    }
    if (!hasAccess) {
      window.location.href = '/pre-inscription'
      return false
    }
    return true
  }

  function playVideo(audioItem) {
    if (!ensureAccess()) return
    setCurrentVideo(audioItem)
    setShowTranscript(false)
    // Pause audio when switching to a different episode's video
    if (currentAudio && currentAudio.id !== audioItem.id) {
      try { audioRef.current?.pause() } catch {}
      setIsPlaying(false)
    }
    // Smooth scroll to top so the user sees the iframe
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function playAudio(audioItem) {
    if (!ensureAccess()) return
    // Toggle play/pause if same episode already loaded
    if (currentAudio?.id === audioItem.id) {
      if (isPlaying) { audioRef.current?.pause(); setIsPlaying(false) }
      else { audioRef.current?.play(); setIsPlaying(true) }
      return
    }
    setCurrentAudio(audioItem)
    setShowTranscript(false)
    setTranscript(null)
    setProgress(0); setCurrentTime(0); setDuration(0)
    try {
      // Prefer R2 podcast (.m4a) when available; fallback to legacy stream-url
      let streamUrl = null
      if (audioItem.has_r2_audio) {
        try {
          const d = await getEpisodeAudioAccessUrl(audioItem.id)
          streamUrl = d?.stream_url || null
        } catch {}
      }
      if (!streamUrl) {
        const d = await getAudioStreamUrl(audioItem.id)
        streamUrl = d?.stream_url || d?.url || null
      }
      if (!streamUrl) throw new Error('no_stream')
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = streamUrl
          audioRef.current.play().catch(() => {})
          setIsPlaying(true)
        }
      }, 80)
      getAudioTranscript(audioItem.id).then(t => { if (t?.has_transcript) setTranscript(t) }).catch(() => {})
    } catch (e) {
      console.error('Audio playback failed:', e)
      setIsPlaying(false)
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

  const TABS = [
    { key: 'episodes', label: `Épisodes` },
    { key: 'frise', label: `Frise` },
    { key: 'contexte', label: `Contexte` },
    { key: 'ressources', label: `Ressources` },
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

        {/* Video embed (ACCESS-GATED): only when user has explicitly chosen Vidéo on an episode. */}
        {(() => {
          const videoUrl = currentVideo?.youtube_url
          const hasVideo = !!videoUrl
          const embedUrl = buildYouTubeEmbedUrl(videoUrl)
          if (!hasVideo) return null

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
              data-testid="episode-youtube-embed"
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
                title={currentVideo?.title || 'Épisode vidéo'}
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
              />
              <div style={{
                position: 'absolute', top: 12, left: 12,
                fontFamily: 'var(--font-display)', fontSize: 10,
                letterSpacing: 2, textTransform: 'uppercase',
                color: '#fff', background: 'rgba(0,0,0,0.6)',
                padding: '4px 10px', borderRadius: 2, pointerEvents: 'none',
              }}>
                {currentVideo?.title}
              </div>
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
                            {modAudios.map((ep, ei) => (
                              <EpisodeRow
                                key={ep.id}
                                ep={ep}
                                idx={ei}
                                color={color}
                                testid={`episode-${mi}-${ei}`}
                                isAudioActive={currentAudio?.id === ep.id && isPlaying}
                                isVideoActive={currentVideo?.id === ep.id}
                                onPlayAudio={() => playAudio(ep)}
                                onPlayVideo={() => playVideo(ep)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {orphanAudios.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      {orphanAudios.map((ep, ei) => (
                        <EpisodeRow
                          key={ep.id}
                          ep={ep}
                          idx={ei}
                          color={color}
                          testid={`orphan-episode-${ei}`}
                          isAudioActive={currentAudio?.id === ep.id && isPlaying}
                          isVideoActive={currentVideo?.id === ep.id}
                          onPlayAudio={() => playAudio(ep)}
                          onPlayVideo={() => playVideo(ep)}
                        />
                      ))}
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

        {/* RESSOURCES TAB (script + glossaire + bibliographie) */}
        {activeTab === 'ressources' && (
          <div style={{ maxWidth: 800 }} data-testid="ressources-tab">
            {!hasAccess ? (
              <PaywallBlock testid="ressources-paywall" label="Les ressources pédagogiques (scripts, glossaires, bibliographies) sont" />
            ) : resources.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucune ressource disponible pour ce cours.</p>
            ) : (
              <ResourceList resources={resources} courseId={courseId} color={color} />
            )}
          </div>
        )}

        {/* CONFÉRENCES TAB */}
        {activeTab === 'professeur' && (
          <div style={{ maxWidth: 800 }} data-testid="professeur-tab">
            {(() => {
              const ids = [course.scholar_id, ...(course.co_scholar_ids || [])].filter(Boolean)
              if (ids.length === 0 && !course.scholar_name) {
                return <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Intervenant à venir.</p>
              }
              if (ids.length === 0) {
                return (
                  <div style={{ padding: 24, border: '1px solid var(--border)', borderRadius: 4 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)' }}>
                      {course.scholar_name}
                    </div>
                  </div>
                )
              }
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {ids.map((sid, idx) => {
                    const s = scholarsMap[sid] || { id: sid, name: sid }
                    const photoSrc = s.photo_url || s.photo
                    const initials = (s.name || '').split(/[\s·-]+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('')
                    return (
                      <Link
                        key={sid}
                        to={`/intervenant/${sid}`}
                        data-testid={`professeur-card-${sid}`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 24,
                          padding: 24, border: `1px solid ${color}33`, borderRadius: 4,
                          textDecoration: 'none', color: 'inherit',
                          backgroundImage: `linear-gradient(135deg, ${color}11, transparent)`,
                          transition: 'transform 0.2s ease, border-color 0.2s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = color }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = `${color}33` }}
                      >
                        {photoSrc ? (
                          <img
                            src={photoSrc}
                            alt={s.name}
                            width={96}
                            height={96}
                            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'flex'; }}
                            style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${color}`, flexShrink: 0 }}
                          />
                        ) : null}
                        <div style={{
                          display: photoSrc ? 'none' : 'flex',
                          width: 96, height: 96, borderRadius: '50%',
                          backgroundColor: 'var(--bg-card)',
                          border: `1px solid ${color}`,
                          alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--font-display)', fontSize: 32,
                          color, flexShrink: 0,
                        }}>{initials}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: 2,
                            textTransform: 'uppercase', color, marginBottom: 8,
                          }}>{idx === 0 ? 'Intervenant principal' : 'Co-intervenant'}</div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)', marginBottom: 8 }}>
                            {s.name}
                          </div>
                          {s.title && (
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--accent, #C9A84C)', fontStyle: 'italic', marginBottom: 8 }}>
                              {s.title}
                            </div>
                          )}
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)' }}>
                            Voir la fiche complète &nbsp;&#8250;
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        )}

        {!user && (
          <div className="course-cta" data-testid="course-cta-login" style={{ marginTop: 32 }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
              L'ensemble des contenus (épisodes, frise, contexte, ressources, conférences) est réservé aux abonnés Sijill.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Link to="/connexion" className="btn-outline">Se connecter</Link>
              <Link to="/inscription" className="btn-accent">S'inscrire</Link>
            </div>
          </div>
        )}
      </div>

      {/* Audio Player Bar — Sijill custom design (replicates mobile MiniPlayer) */}
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
          <div className="player-bar-inner">
            {/* Badge cursus (lettre) */}
            <div className="player-badge" style={{ background: `${color}1A` }}>
              <span className="player-badge-letter" style={{ color }}>
                {(course?.cursus_letter || getCursusLetter(course?.cursus_id) || 'A').toUpperCase()}
              </span>
            </div>

            {/* Titre + Professeur */}
            <div className="player-info">
              <div className="player-track-title">{currentAudio.title}</div>
              {(currentAudio.scholar_name || course?.scholar_name) && (
                <div className="player-track-scholar">{currentAudio.scholar_name || course?.scholar_name}</div>
              )}
            </div>

            {/* Mini waveform — 15 barres rectangulaires animées par la progression */}
            <div className="player-waveform" aria-hidden>
              {[35, 55, 40, 70, 50, 85, 60, 95, 55, 75, 45, 80, 60, 50, 40].map((h, i) => {
                const lit = i < Math.floor((progress / 100) * 15)
                return (
                  <span
                    key={i}
                    className="player-waveform-bar"
                    style={{
                      height: Math.max(4, Math.round((h / 100) * 20)),
                      background: lit ? color : '#333',
                    }}
                  />
                )
              })}
            </div>

            {/* Timer numérique */}
            <div className="player-timer">
              <span className="player-timer-current" style={{ color }}>{fmtTime(currentTime)}</span>
              <span className="player-timer-sep">/</span>
              <span className="player-timer-total">{fmtTime(duration)}</span>
            </div>

            {/* Contrôles : skip back / play / skip forward */}
            <div className="player-controls">
              <button className="player-skip-btn" data-testid="player-skip-back" onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 15) }} aria-label="Reculer 15 s">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12.5 8V4L6 8l6.5 4V8z"/><path d="M12 20a8 8 0 0 0 0-16"/><text x="7" y="16" fill="currentColor" fontSize="7" fontFamily="sans-serif">15</text></svg>
              </button>
              <button className="player-play-main" data-testid="player-play-toggle" style={{ background: color }} onClick={() => playAudio(currentAudio)} aria-label={isPlaying ? 'Pause' : 'Lecture'}>
                {isPlaying ? <svg width="14" height="14" viewBox="0 0 24 24" fill="#0A0A0A"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="#0A0A0A" style={{ marginLeft: 1 }}><polygon points="6,4 20,12 6,20"/></svg>}
              </button>
              <button className="player-skip-btn" data-testid="player-skip-forward" onClick={() => { if (audioRef.current) audioRef.current.currentTime += 15 }} aria-label="Avancer 15 s">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11.5 8V4L18 8l-6.5 4V8z"/><path d="M12 20a8 8 0 0 1 0-16"/><text x="7" y="16" fill="currentColor" fontSize="7" fontFamily="sans-serif">15</text></svg>
              </button>
            </div>

            {/* Actions : transcript + close */}
            <div className="player-actions">
              {transcript && (
                <button
                  className={`player-text-btn ${showTranscript ? 'active' : ''}`}
                  data-testid="player-transcript-btn"
                  onClick={() => setShowTranscript(!showTranscript)}
                  style={{ color: showTranscript ? color : 'var(--text-muted)' }}
                >
                  Lire
                </button>
              )}
              <button
                className="player-close-btn"
                data-testid="player-close"
                onClick={() => {
                  try { audioRef.current?.pause(); audioRef.current.src = '' } catch {}
                  setCurrentAudio(null); setIsPlaying(false); setProgress(0); setCurrentTime(0); setDuration(0); setTranscript(null); setShowTranscript(false)
                }}
                aria-label="Fermer le lecteur"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>

          {/* Barre de progression fine en bas */}
          <div className="player-progress" data-testid="player-progress" onClick={seekTo}>
            <div className="player-progress-fill" style={{ width: `${progress}%`, background: color }} />
          </div>
        </div>
      )}
    </div>
  )
}
