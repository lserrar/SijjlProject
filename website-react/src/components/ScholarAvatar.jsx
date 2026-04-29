import { useState } from 'react'

function getInitials(name) {
  if (!name) return '?'
  return name.split(/[\s·-]+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('')
}

/**
 * Avatar rond pour un scholar.
 * Affiche la photo si elle existe et charge correctement, sinon les initiales en doré.
 * Robuste : utilise onError pour fallback automatique sur erreur de chargement,
 * et un état React pour éviter les flashes / boucles.
 */
export default function ScholarAvatar({ scholar, size = 64, color = '#C9A84C' }) {
  const [errored, setErrored] = useState(false)
  // Accept either field — old admin sync writes 'photo', new sync writes 'photo_url'
  const photoSrc = scholar?.photo_url || scholar?.photo
  const showImg = photoSrc && !errored

  const baseStyle = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    border: `1px solid ${color}`,
    backgroundColor: 'var(--bg-card)',
  }

  if (showImg) {
    return (
      <img
        src={scholar.photo_url}
        alt={scholar.name}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setErrored(true)}
        style={{ ...baseStyle, objectFit: 'cover' }}
        data-testid={`scholar-avatar-img-${scholar.id || ''}`}
      />
    )
  }

  return (
    <div
      style={{
        ...baseStyle,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-display)',
        fontSize: size * 0.34,
        color,
      }}
      data-testid={`scholar-avatar-initials-${scholar?.id || ''}`}
    >
      {getInitials(scholar?.name)}
    </div>
  )
}
