import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getResourceContent, getBibliographies } from '../api'
import { getCursusColor } from '../constants'

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

function renderResourceContent(content) {
  if (!content) return ''
  if (typeof content === 'string') return renderMarkdown(content)
  if (Array.isArray(content)) {
    return content.map(block => {
      if (block.type === 'heading') return `<h3>${block.text}</h3>`
      if (block.type === 'subheading') return `<h4>${block.text}</h4>`
      if (block.type === 'list_item') return `<li>${block.text}</li>`
      return `<p>${block.text || ''}</p>`
    }).join('')
  }
  return ''
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

  const title = data.title || data.subject || resourceId
  const content = type === 'biblio'
    ? renderMarkdown(data.content)
    : renderResourceContent(data.content)

  return (
    <div data-testid="resource-viewer-page">
      <section className="section" style={{ paddingTop: 140, maxWidth: 800, margin: '0 auto' }}>
        <Link to={-1} className="course-back" style={{ marginBottom: 32 }}>
          &#8592; Retour
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{
            padding: '4px 12px', border: `1px solid ${color}66`,
            fontFamily: 'var(--font-display)', fontSize: 9, letterSpacing: 3,
            textTransform: 'uppercase', color,
          }}>
            {type === 'biblio' ? 'Bibliographie' : 'Fiche contextuelle'}
          </div>
          {data.module_number && (
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: 9, letterSpacing: 2,
              textTransform: 'uppercase', color: 'var(--text-dim)',
            }}>
              Module {data.module_number}
            </span>
          )}
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 3vw, 40px)',
          fontWeight: 400, lineHeight: 1.2, marginBottom: 40,
        }}>
          {title}
        </h1>

        <div className="resource-body" dangerouslySetInnerHTML={{ __html: content }} />
      </section>
    </div>
  )
}
