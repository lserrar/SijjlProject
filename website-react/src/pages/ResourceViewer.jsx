import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getResourceContent, getBibliographies } from '../api'
import { getCursusColor } from '../constants'

const SECTION_TITLES = ['Contexte dynastique', 'Contexte intellectuel', 'Chronologie biographique']

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

function renderMarkdown(md) {
  if (!md) return ''
  return md
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^[-–] (.*$)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')
}

export default function ResourceViewer() {
  const { type, resourceId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

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

  // Context resource view (matches mobile app)
  if (type === 'fiche' && Array.isArray(data.content)) {
    const { moduleInfo, thinkerName, epochInfo, sections } = parseContextContent(data.content)
    return (
      <div data-testid="resource-viewer-page" className="rv-page">
        <section className="rv-container">
          <Link to={-1} className="course-back" data-testid="rv-back-btn">&#8592; Retour</Link>

          {/* Eyebrow */}
          <div className="rv-eyebrow" style={{ color }}>CONTEXTE HISTORIQUE</div>

          {/* Module Info */}
          {moduleInfo && <div className="rv-module-info" style={{ color }}>{moduleInfo}</div>}

          {/* Thinker Name */}
          <h1 className="rv-thinker-name">{thinkerName || data.subject || data.title}</h1>
          {epochInfo && <p className="rv-epoch-info">{epochInfo}</p>}

          {/* Diamond Divider */}
          <div className="rv-divider">
            <span className="rv-divider-line" />
            <span className="rv-divider-diamond" style={{ backgroundColor: color }} />
            <span className="rv-divider-line" />
          </div>

          {/* Sections */}
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
                      <span className="rv-list-text">{block.text}</span>
                    </div>
                  )
                  return <p key={bi} className="rv-paragraph">{block.text}</p>
                })}
              </div>
            </div>
          ))}

          {/* Footer */}
          <div className="rv-footer">
            <div className="rv-footer-line" />
            <span className="rv-footer-text">Sijill Project — Sciences Islamiques</span>
          </div>
        </section>
      </div>
    )
  }

  // Bibliography view (matches mobile app)
  if (type === 'biblio') {
    const title = data.title || `Bibliographie — Module ${data.module_number}`
    return (
      <div data-testid="resource-viewer-page" className="rv-page">
        <section className="rv-container">
          <Link to={-1} className="course-back" data-testid="rv-back-btn">&#8592; Retour</Link>

          {/* Eyebrow */}
          <div className="rv-eyebrow" style={{ color: '#C9A84C' }}>BIBLIOGRAPHIE</div>

          {/* Title Block */}
          <div className="rv-title-block">
            <span className="rv-title-accent" style={{ backgroundColor: color }} />
            <h1 className="rv-biblio-title">{title}</h1>
          </div>

          {/* Diamond Divider */}
          <div className="rv-divider">
            <span className="rv-divider-line" style={{ backgroundColor: `${color}4D` }} />
            <span className="rv-divider-diamond" style={{ backgroundColor: color }} />
            <span className="rv-divider-line" style={{ backgroundColor: `${color}4D` }} />
          </div>

          {/* Content */}
          <div className="resource-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(data.content) }} />

          {/* Footer */}
          <div className="rv-footer">
            <div className="rv-footer-line" />
            <span className="rv-footer-text">Sijill Project — Sciences Islamiques</span>
          </div>
        </section>
      </div>
    )
  }

  // Fallback for string content
  const title = data.title || data.subject || resourceId
  const content = typeof data.content === 'string' ? renderMarkdown(data.content) : ''
  return (
    <div data-testid="resource-viewer-page" className="rv-page">
      <section className="rv-container">
        <Link to={-1} className="course-back" data-testid="rv-back-btn">&#8592; Retour</Link>
        <div className="rv-eyebrow" style={{ color }}>{type === 'biblio' ? 'BIBLIOGRAPHIE' : 'FICHE CONTEXTUELLE'}</div>
        <h1 className="rv-thinker-name">{title}</h1>
        <div className="rv-divider">
          <span className="rv-divider-line" />
          <span className="rv-divider-diamond" style={{ backgroundColor: color }} />
          <span className="rv-divider-line" />
        </div>
        <div className="resource-body" dangerouslySetInnerHTML={{ __html: content }} />
      </section>
    </div>
  )
}
