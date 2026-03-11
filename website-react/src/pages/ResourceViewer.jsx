import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getResourceContent, getBibliographies } from '../api'
import { getCursusColor } from '../constants'

const SECTION_TITLES = ['Contexte dynastique', 'Contexte intellectuel', 'Chronologie biographique']

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

function parseContextContent(content) {
  if (!content || !Array.isArray(content)) return { moduleInfo: '', thinkerName: '', epochInfo: '', sections: [] }

  let moduleInfo = ''
  let thinkerName = ''
  let epochInfo = ''
  const sections = []
  let currentSection = null

  for (let i = 0; i < content.length; i++) {
    const block = content[i]
    const text = (block.text || '').trim()

    if (i === 0 && text.startsWith('Module')) { moduleInfo = text; continue }
    if (i === 1) { thinkerName = text; continue }
    if (i === 2 && (text.includes('·') || text.toLowerCase().includes('époque'))) { epochInfo = text; continue }

    const normalized = text.toLowerCase().trim()
    const isSectionTitle = SECTION_TITLES.some(t => normalized === t.toLowerCase())

    if (isSectionTitle) {
      if (currentSection?.content.length > 0) sections.push(currentSection)
      const properTitle = SECTION_TITLES.find(t => t.toLowerCase() === normalized) || text
      currentSection = { title: properTitle, content: [] }
    } else if (currentSection) {
      currentSection.content.push(block)
    } else {
      currentSection = { title: 'Introduction', content: [block] }
    }
  }
  if (currentSection?.content.length > 0) sections.push(currentSection)

  return { moduleInfo, thinkerName, epochInfo, sections }
}

export default function ResourceViewer() {
  const { type, resourceId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fontSizeIdx, setFontSizeIdx] = useState(0)

  const fontSize = FONT_SIZES[fontSizeIdx]

  useEffect(() => {
    if (type === 'fiche') {
      getResourceContent(resourceId)
        .then(d => setData(d))
        .catch(() => {})
        .finally(() => setLoading(false))
    } else if (type === 'biblio') {
      getBibliographies()
        .then(bibs => {
          const found = bibs.find(b => b.id === resourceId)
          setData(found || null)
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [type, resourceId])

  if (loading) return <div className="loading">Chargement...</div>
  if (!data) return <div className="loading">Ressource introuvable</div>

  const color = getCursusColor(`cursus-${
    data.cursus_letter === 'A' ? 'falsafa' :
    data.cursus_letter === 'B' ? 'theologie' :
    data.cursus_letter === 'C' ? 'sciences-islamiques' :
    data.cursus_letter === 'D' ? 'arts' : 'spiritualites'
  }`)

  const cycleFontSize = () => setFontSizeIdx((fontSizeIdx + 1) % FONT_SIZES.length)

  // Context resource view
  if (type === 'fiche' && Array.isArray(data.content)) {
    const { moduleInfo, thinkerName, epochInfo, sections } = parseContextContent(data.content)
    return (
      <div data-testid="resource-viewer-page" className="rv-page">
        <section className="rv-container">
          <div className="rv-top-bar">
            <Link to={-1} className="course-back" data-testid="rv-back-btn">&#8592; Retour</Link>
            <button className="rv-font-btn" onClick={cycleFontSize} data-testid="rv-font-size-btn">{FONT_LABELS[fontSizeIdx]}</button>
          </div>

          <div className="rv-eyebrow" style={{ color }}>CONTEXTE HISTORIQUE</div>
          {moduleInfo && <div className="rv-module-info" style={{ color }}>{moduleInfo}</div>}
          <h1 className="rv-thinker-name">{thinkerName || data.subject || data.title}</h1>
          {epochInfo && <p className="rv-epoch-info">{epochInfo}</p>}

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
        </section>
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
