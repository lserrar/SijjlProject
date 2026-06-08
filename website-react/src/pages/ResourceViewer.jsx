import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getResourceContent, getBibliographies } from '../api'
import { getCursusColor } from '../constants'
import { useAuth } from '../AuthContext'

// Major section headings recognised in Contexte fiches. The list is matched
// case-insensitively and accepts an optional " et historique" / "s" suffix
// so authoring variants don't break the parser.
const SECTION_TITLES = [
  'Contexte dynastique',
  'Contexte dynastique et historique',
  'Contexte intellectuel',
  'Chronologie biographique',
  'Chronologie',
  'Débats historiographiques',
  'Postérité',
  'Héritage',
  'Sources et orientations bibliographiques',
]

const SKIP_PATTERNS = [
  /^Sijill Project$/i,
  /^Bibliographie sélective$/i,
  /^Cursus [A-E]$/i,
  /^Module \d+/i,
  /^Le Sijill\s*[—–-]\s*Plateforme/i,
]

const FONT_SIZES = [18, 22, 26]
const FONT_LABELS = ['A', 'A+', 'A++']

function filterBiblioContent(raw) {
  if (!raw) return { lines: [], noteIndex: -1 }
  const parts = raw.split('\n\n')
  const lines = []
  let noteIndex = -1

  for (const part of parts) {
    const text = part.trim().replace(/^#+\s*/, '')
    if (!text) continue
    if (SKIP_PATTERNS.some(p => p.test(text))) continue
    lines.push(part.trim())
  }

  for (let i = 0; i < lines.length; i++) {
    if (/Note pédagogique/i.test(lines[i])) { noteIndex = i; break }
  }
  return { lines, noteIndex }
}

function parseContextContent(content, authoritativeTitle = '') {
  // Format-agnostic parser. The backend already extracts the canonical title
  // (`data.title`) from inside the DOCX, so we don't try to recover it from
  // content[i] indices anymore — those are fragile across authoring
  // conventions ("Module N —" vs "Épisode N —" vs nothing). We simply walk
  // the blocks, capture the first few header paragraphs as moduleInfo /
  // cursusInfo / epochInfo, and then dispatch by section/heading marker.
  if (!content || !Array.isArray(content)) {
    return { moduleInfo: '', thinkerName: authoritativeTitle, epochInfo: '', sections: [] }
  }

  // Normalize the authoritative title so we can detect & drop its duplicate
  // copy when it appears as the very first paragraph (the author often
  // writes the name as a bold-only line at the top of the DOCX).
  const titleNorm = authoritativeTitle.trim().toLowerCase().replace(/\s+/g, ' ')

  let moduleInfo = ''
  let cursusInfo = ''
  let epochInfo = ''
  let tagline = ''
  let sawSection = false
  const sections = []
  let currentSection = null
  let headerSlot = 0 // how many header lines we've absorbed before the first section

  for (let i = 0; i < content.length; i++) {
    const block = content[i]
    const text = (block.text || '').trim()
    if (!text) continue
    const normalized = text.toLowerCase().replace(/\s+/g, ' ')

    // Detect & drop the duplicate of the article title at the top of the body.
    if (!sawSection && headerSlot < 4 && titleNorm && normalized === titleNorm) {
      headerSlot++
      continue
    }

    // First, check whether this block is a top-level section heading.
    // (Either flagged by the backend as `type==='heading'`, or whose text
    // matches one of our known section labels.)
    const isHeadingType = block.type === 'heading'
    const matchesSection = SECTION_TITLES.some(t =>
      normalized === t.toLowerCase() ||
      normalized.startsWith(t.toLowerCase() + ' ') ||
      // accept "Contexte dynastique et historique" when SECTION_TITLES has "Contexte dynastique"
      normalized.startsWith(t.toLowerCase())
    )
    if (isHeadingType || matchesSection) {
      if (currentSection?.content.length > 0) sections.push(currentSection)
      const properTitle = SECTION_TITLES.find(t =>
        normalized === t.toLowerCase() || normalized.startsWith(t.toLowerCase())
      ) || text
      // Prefer the longer authored variant if it adds context (e.g. "et historique").
      currentSection = { title: text.length > properTitle.length ? text : properTitle, content: [] }
      sawSection = true
      continue
    }

    // Pre-section header lines. We absorb up to 3 lines as cursusInfo / epochInfo / tagline.
    if (!sawSection) {
      if (headerSlot === 0 && /^(module|épisode|episode)\s+\d/i.test(text)) {
        moduleInfo = text
      } else if (headerSlot === 0 && (text.startsWith('Cursus') || /\bcursus\b/i.test(text))) {
        cursusInfo = text
      } else if (!epochInfo && (text.includes('·') || /(\d{3,4})\s*[–-]\s*(\d{3,4})/.test(text) || /époque/i.test(text))) {
        epochInfo = text
      } else if (!tagline) {
        tagline = text
      } else {
        // Anything else before sections lands in an "Introduction" pseudo-section.
        if (!currentSection) currentSection = { title: 'Introduction', content: [] }
        currentSection.content.push(block)
      }
      headerSlot++
      continue
    }

    // Inside a section — preserve the block (paragraph / subheading / list_item / methodology_note)
    if (currentSection) currentSection.content.push(block)
  }
  if (currentSection?.content.length > 0) sections.push(currentSection)

  return { moduleInfo: moduleInfo || cursusInfo, thinkerName: authoritativeTitle, epochInfo, tagline, sections }
}

  return { moduleInfo, thinkerName, epochInfo, sections }
}

export default function ResourceViewer() {
  const { type, resourceId } = useParams()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [fontSizeIdx, setFontSizeIdx] = useState(0)

  const fontSize = FONT_SIZES[fontSizeIdx]

  useEffect(() => {
    const handleErr = (err) => {
      const msg = String(err?.message || '')
      if (msg.includes('401') || msg.includes('403')) setDenied(true)
    }
    if (type === 'fiche') {
      getResourceContent(resourceId)
        .then(d => setData(d))
        .catch(handleErr)
        .finally(() => setLoading(false))
    } else if (type === 'biblio') {
      getBibliographies()
        .then(bibs => {
          const found = bibs.find(b => b.id === resourceId)
          if (found && found.locked) { setDenied(true); return }
          setData(found || null)
        })
        .catch(handleErr)
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [type, resourceId])

  if (loading) return <div className="loading">Chargement...</div>
  if (denied) {
    return (
      <div data-testid="resource-viewer-paywall" className="rv-page">
        <section className="rv-container" style={{ textAlign: 'center', padding: '64px 24px' }}>
          <div className="rv-top-bar">
            <Link to={-1} className="course-back" data-testid="rv-back-btn">&#8592; Retour</Link>
          </div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: 3,
            textTransform: 'uppercase', color: '#C9A84C', margin: '32px 0 16px',
          }}>Contenu réservé aux abonnés</div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--text-muted)', maxWidth: 520, margin: '0 auto 24px', lineHeight: 1.6 }}>
            Cette ressource est accessible avec un abonnement Sijill — 7&nbsp;€/mois ou 84&nbsp;€/an.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to={user ? '/pre-inscription' : '/inscription'} className="btn-accent">{user ? "Activer mon abonnement" : "Je m'abonne"}</Link>
            {!user && <Link to="/connexion" className="btn-outline">J'ai déjà un compte</Link>}
          </div>
        </section>
      </div>
    )
  }
  if (!data) return <div className="loading">Ressource introuvable</div>

  const color = getCursusColor(`cursus-${
    data.cursus_letter === 'A' ? 'falsafa' :
    data.cursus_letter === 'B' ? 'theologie' :
    data.cursus_letter === 'C' ? 'sciences-islamiques' :
    data.cursus_letter === 'D' ? 'arts' : 'spiritualites'
  }`)

  const cycleFontSize = () => setFontSizeIdx((fontSizeIdx + 1) % FONT_SIZES.length)

  // Context resource view — wrapped in the cream "prestige" paper theme
  // (same chrome as the blog & bibliography articles) so it shares the
  // visual language while keeping its own typography (rv-thinker-name,
  // rv-section, etc.). The thinker name now comes from the *inside* of the
  // DOCX (e.g. "Al-Kindī (v. 801–873)") thanks to backend
  // `_extract_contexte_title`, with thinkerName from the parser as a
  // fall-back when the parser identifies a richer header line.
  if (type === 'fiche' && Array.isArray(data.content)) {
    const { moduleInfo, thinkerName, epochInfo, tagline, sections } = parseContextContent(data.content, data.title || data.subject || '')
    const displayName = thinkerName || data.subject || data.title
    return (
      <div data-testid="resource-viewer-page" className="cra cra-prestige rv-page-prestige">
        <article className="cra-article rv-article" data-testid="contexte-article">
          <div aria-hidden className="cra-grain" />
          <div className="cra-inner">
            <div className="rv-top-bar">
              <Link to={-1} className="cra-back" data-testid="rv-back-btn" style={{ color }}>&larr; Retour</Link>
              <button className="rv-font-btn" onClick={cycleFontSize} data-testid="rv-font-size-btn" style={{ borderColor: `${color}55`, color }}>{FONT_LABELS[fontSizeIdx]}</button>
            </div>

            <div className="rv-eyebrow" style={{ color }}>CONTEXTE HISTORIQUE</div>
            {moduleInfo && <div className="rv-module-info" style={{ color }}>{moduleInfo}</div>}
            <h1 className="rv-thinker-name">{displayName}</h1>
            {epochInfo && <p className="rv-epoch-info">{epochInfo}</p>}
            {tagline && <p className="rv-tagline" style={{ color }}>{tagline}</p>}

            <div className="rv-divider">
              <span className="rv-divider-line" />
              <span className="rv-divider-diamond" style={{ backgroundColor: color }} />
              <span className="rv-divider-line" />
            </div>

            {sections.map((section, si) => (
              <div key={si} className="rv-section" data-testid={`rv-section-${si}`}>
                {section.title !== 'Introduction' && (
                  <div className="rv-section-header">
                    <span className="rv-section-bar" style={{ backgroundColor: color }} />
                    <h2 className="rv-section-title" style={{ color }}>{section.title}</h2>
                  </div>
                )}
                <div className="rv-section-content">
                  {section.content.map((block, bi) => {
                    if (block.type === 'methodology_note') return (
                      <aside key={bi} className="rv-method-note" data-testid="rv-method-note">
                        <div className="rv-method-note-label" style={{ color }}>
                          {(block.label || 'Note méthodologique').toUpperCase()}
                        </div>
                        <p className="rv-method-note-text" style={{ fontSize: Math.max(15, fontSize - 2) }}>
                          {block.text}
                        </p>
                      </aside>
                    )
                    if (block.type === 'subheading') return (
                      <h3 key={bi} className="rv-subheading-bold" data-testid="rv-subheading-bold" style={{ color }}>
                        {block.text}
                      </h3>
                    )
                    if (block.type === 'heading') return <h3 key={bi} className="rv-subheading">{block.text}</h3>
                    if (block.type === 'list_item') return (
                      <div key={bi} className="rv-list-item">
                        <span className="rv-list-bullet" style={{ color }}>&#8226;</span>
                        <span className="rv-list-text" style={{ fontSize }}>{block.text}</span>
                      </div>
                    )
                    return <p key={bi} className="rv-paragraph" style={{ fontSize }}>{block.text}</p>
                  })}
                </div>
              </div>
            ))}

            <div className="rv-footer">
              <div className="rv-footer-line" />
              <span className="rv-footer-text">Sijill Project — Sciences Islamiques</span>
            </div>
          </div>
        </article>
      </div>
    )
  }

  // Bibliography view — filtered + italic annotations + font size
  if (type === 'biblio') {
    const title = data.title || `Bibliographie — Module ${data.module_number}`
    const { lines, noteIndex } = filterBiblioContent(data.content)

    return (
      <div data-testid="resource-viewer-page" className="rv-page">
        <section className="rv-container">
          <div className="rv-top-bar">
            <Link to={-1} className="course-back" data-testid="rv-back-btn">&#8592; Retour</Link>
            <button className="rv-font-btn" onClick={cycleFontSize} data-testid="rv-font-size-btn">{FONT_LABELS[fontSizeIdx]}</button>
          </div>

          <div className="rv-eyebrow" style={{ color: '#C9A84C' }}>BIBLIOGRAPHIE</div>

          <div className="rv-title-block">
            <span className="rv-title-accent" style={{ backgroundColor: color }} />
            <h1 className="rv-biblio-title">{title}</h1>
          </div>

          <div className="rv-divider">
            <span className="rv-divider-line" style={{ backgroundColor: `${color}4D` }} />
            <span className="rv-divider-diamond" style={{ backgroundColor: color }} />
            <span className="rv-divider-line" style={{ backgroundColor: `${color}4D` }} />
          </div>

          <div className="rv-biblio-content">
            {lines.map((line, i) => {
              const isAfterNote = noteIndex >= 0 && i > noteIndex
              const isHeading = line.startsWith('##')
              const headingText = line.replace(/^#+\s*/, '')

              if (isHeading) {
                return (
                  <div key={i} className="rv-biblio-heading-block">
                    {i > 0 && <div className="rv-biblio-heading-divider" style={{ borderColor: `${color}33` }} />}
                    <h3 className="rv-biblio-heading" style={{ color: '#C9A84C' }}>{headingText}</h3>
                  </div>
                )
              }

              return (
                <p key={i}
                   className={`rv-biblio-para${isAfterNote ? ' rv-annotation' : ''}`}
                   style={{ fontSize }}>
                  {line}
                </p>
              )
            })}
          </div>

          <div className="rv-footer">
            <div className="rv-footer-line" />
            <span className="rv-footer-text">Sijill Project — Sciences Islamiques</span>
          </div>
        </section>
      </div>
    )
  }

  // Fallback
  const title = data.title || data.subject || resourceId
  return (
    <div data-testid="resource-viewer-page" className="rv-page">
      <section className="rv-container">
        <div className="rv-top-bar">
          <Link to={-1} className="course-back" data-testid="rv-back-btn">&#8592; Retour</Link>
          <button className="rv-font-btn" onClick={cycleFontSize} data-testid="rv-font-size-btn">{FONT_LABELS[fontSizeIdx]}</button>
        </div>
        <div className="rv-eyebrow" style={{ color }}>{type === 'biblio' ? 'BIBLIOGRAPHIE' : 'FICHE CONTEXTUELLE'}</div>
        <h1 className="rv-thinker-name">{title}</h1>
        <div className="rv-divider">
          <span className="rv-divider-line" />
          <span className="rv-divider-diamond" style={{ backgroundColor: color }} />
          <span className="rv-divider-line" />
        </div>
        <div className="resource-body" style={{ fontSize }} dangerouslySetInnerHTML={{ __html: data.content || '' }} />
      </section>
    </div>
  )
}
