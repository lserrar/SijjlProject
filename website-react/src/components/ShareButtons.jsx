const SITE_URL = 'https://sijill.com'

export default function ShareButtons({ title, url, description }) {
  const fullUrl = `${SITE_URL}${url}`
  const encodedUrl = encodeURIComponent(fullUrl)
  const encodedTitle = encodeURIComponent(title)
  const encodedDesc = encodeURIComponent(description || '')

  const links = [
    {
      name: 'Facebook',
      icon: 'fab fa-facebook-f',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: '#1877F2',
    },
    {
      name: 'X',
      icon: 'fab fa-twitter',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      color: '#1DA1F2',
    },
    {
      name: 'LinkedIn',
      icon: 'fab fa-linkedin-in',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: '#0A66C2',
    },
    {
      name: 'WhatsApp',
      icon: 'fab fa-whatsapp',
      href: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
      color: '#25D366',
    },
  ]

  return (
    <div className="share-bar" data-testid="share-buttons">
      <span className="share-label">Partager</span>
      <div className="share-icons">
        {links.map(l => (
          <a
            key={l.name}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="share-btn"
            title={`Partager sur ${l.name}`}
            data-testid={`share-${l.name.toLowerCase()}`}
            style={{ '--share-color': l.color }}
          >
            <i className={l.icon} />
          </a>
        ))}
      </div>
    </div>
  )
}
