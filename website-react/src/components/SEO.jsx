import { Helmet } from 'react-helmet-async'

const SITE_URL = 'https://sijillproject.com'

export default function SEO({ title, description, path = '/', type = 'website', article = null }) {
  const fullTitle = title ? `${title} | Sijill Project` : 'Sijill Project — Plateforme académique · Sciences islamiques'
  const desc = description || 'Parcours académiques en sciences islamiques. Philosophie, théologie, droit, littérature et spiritualité.'
  const url = `${SITE_URL}${path}`
  const imageUrl = article?.image_url || `${SITE_URL}/api/blog/image/${article?.id || ''}`

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content="Sijill Project" />
      <meta property="og:locale" content="fr_FR" />
      {article && <meta property="og:image" content={imageUrl} />}

      <meta name="twitter:card" content={article ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      {article && <meta name="twitter:image" content={imageUrl} />}

      {type === 'article' && article && (
        <>
          <meta property="article:published_time" content={article.published_at} />
          <meta property="article:author" content={article.author || 'Sijill Project'} />
          {(article.tags || []).map((tag, i) => (
            <meta key={i} property="article:tag" content={tag} />
          ))}
        </>
      )}
    </Helmet>
  )
}
