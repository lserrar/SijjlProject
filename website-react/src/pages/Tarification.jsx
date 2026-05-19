import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { apiFetch } from '../api'

/**
 * Page Tarification — 3 cartes : Standard / Fondateur / Cadeau.
 *
 * Phase B (Fév 2026) — vraies subscriptions Stripe avec engagement 12 mois.
 * - Choix mensuel (12 prélèvements) ou annuel (paiement unique).
 * - Engagement strict 12 mois : annulation refusée HTTP 400 si < 12 mensualités.
 * - Cartes cadeaux toujours en one-shot via /cadeau.
 */
export default function Tarification() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [billing, setBilling] = useState('yearly') // 'monthly' | 'yearly'
  const [error, setError] = useState(null)

  useEffect(() => { document.title = 'Abonnements · Sijill Project' }, [])

  async function subscribe(planFamily) {
    setError(null)
    if (!user) {
      navigate('/connexion?next=/tarification')
      return
    }
    const planId = `${planFamily}_${billing}` // founder_monthly | founder_yearly | standard_monthly | standard_yearly
    setLoadingPlan(planId)
    try {
      const res = await apiFetch('/subscription/checkout', {
        method: 'POST',
        body: JSON.stringify({
          plan_id: planId,
          origin_url: window.location.origin + '/api/site',
        }),
      })
      if (res?.url) window.location.href = res.url
      else setError('Réponse Stripe inattendue.')
    } catch (e) {
      setError(e?.message || 'Erreur lors de la création du paiement.')
    } finally {
      setLoadingPlan(null)
    }
  }

  // Prix dynamiques selon le cycle de facturation
  const prices = {
    standard: billing === 'yearly'
      ? { price: '120 €', period: 'par an', equivalent: 'soit 10 €/mois · engagement 12 mois', planId: 'standard_yearly' }
      : { price: '12 €',  period: 'par mois', equivalent: 'engagement 12 mois (144 € sur l\'année)', planId: 'standard_monthly' },
    founder: billing === 'yearly'
      ? { price: '84 €',  period: 'par an', equivalent: 'soit 7 €/mois · engagement 12 mois', planId: 'founder_yearly' }
      : { price: '7 €',   period: 'par mois', equivalent: 'engagement 12 mois (84 € sur l\'année)', planId: 'founder_monthly' },
  }

  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '70px 24px 100px' }} data-testid="tarification-page">
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <p style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--brand-secondary)' }}>
          Abonnements · engagement 12 mois
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(38px, 5vw, 56px)', margin: '12px 0 18px', lineHeight: 1.1 }}>
          Choisissez votre formule
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: 1.6, maxWidth: 680, margin: '0 auto' }}>
          Accès illimité à l'intégralité du catalogue Sijill — vidéos, podcasts, bibliographies, glossaires et frises chronologiques.
          Tous nos abonnements engagent sur 12 mois, prélevés mensuellement ou réglés en une fois.
        </p>
      </div>

      {/* Toggle Mensuel / Annuel */}
      <div data-testid="billing-toggle" style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
        <div style={{
          display: 'inline-flex', background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border-subtle)', borderRadius: 999, padding: 4,
        }}>
          <button
            type="button"
            data-testid="billing-toggle-monthly"
            onClick={() => setBilling('monthly')}
            style={{
              background: billing === 'monthly' ? 'var(--brand-secondary)' : 'transparent',
              color: billing === 'monthly' ? '#0d0c0a' : 'var(--text-muted)',
              border: 'none', padding: '10px 22px', borderRadius: 999,
              fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700,
              cursor: 'pointer', transition: 'background 0.2s, color 0.2s',
            }}
          >Mensuel · 12 mois</button>
          <button
            type="button"
            data-testid="billing-toggle-yearly"
            onClick={() => setBilling('yearly')}
            style={{
              background: billing === 'yearly' ? 'var(--brand-secondary)' : 'transparent',
              color: billing === 'yearly' ? '#0d0c0a' : 'var(--text-muted)',
              border: 'none', padding: '10px 22px', borderRadius: 999,
              fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700,
              cursor: 'pointer', transition: 'background 0.2s, color 0.2s',
            }}
          >Annuel · paiement unique</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 24, alignItems: 'stretch', paddingTop: 18 }}>
        {/* ──────────── STANDARD ──────────── */}
        <PlanCard
          testid="plan-standard"
          name="Standard"
          tagline="Accès complet"
          price={prices.standard.price}
          period={prices.standard.period}
          equivalent={prices.standard.equivalent}
          highlight={false}
          features={[
            'Accès illimité aux 22 cours du catalogue Mai 2026',
            'Enregistrements audio de chaque épisode (40 min) en streaming',
            'Scripts des cours en téléchargement',
            'Bibliographies, glossaires et frises chronologiques',
            'Accès à tous les nouveaux cours déployés pendant 12 mois',
          ]}
          ctaLabel="S'abonner Standard"
          ctaLoading={loadingPlan === prices.standard.planId}
          onCta={() => subscribe('standard')}
        />

        {/* ──────────── FONDATEUR (mis en avant) ──────────── */}
        <PlanCard
          testid="plan-fondateur"
          name="Fondateur"
          tagline="200 places uniquement · Offre de lancement"
          price={prices.founder.price}
          period={prices.founder.period}
          equivalent={prices.founder.equivalent}
          highlight={true}
          badge="Le plus choisi"
          features={[
            'Tout l\'abonnement Standard inclus',
            'Accès immédiat à tous les cours dès leur mise en ligne — pour toujours',
            'Tarif Fondateur garanti à vie (jamais d\'augmentation)',
            'Accès anticipé aux nouveaux cours avant tout le monde',
            'Votre nom dans le générique des cours (optionnel)',
            'Newsletter trimestrielle de Sijill Project',
          ]}
          ctaLabel="Devenir Fondateur"
          ctaLoading={loadingPlan === prices.founder.planId}
          onCta={() => subscribe('founder')}
        />

        {/* ──────────── CADEAU ──────────── */}
        <PlanCard
          testid="plan-cadeau"
          name="Cadeau"
          tagline="Offrir un abonnement"
          price="84 €"
          period="par an"
          equivalent="ou paiement échelonné"
          highlight={false}
          icon="🎁"
          features={[
            'Offrez 12 mois d\'accès complet au tarif Fondateur',
            'Accès à tous les cours déployés pendant la durée de l\'abonnement',
            'Carte cadeau personnalisable (nom + message)',
            'Livraison immédiate ou programmée par email',
            'Le destinataire active son code sur son compte',
            'Idéal pour anniversaires, fêtes, aïd, Noël',
          ]}
          ctaLabel="Offrir un abonnement"
          ctaLoading={false}
          onCta={() => navigate('/cadeau')}
          asLink
        />
      </div>

      {error && (
        <div data-testid="tarification-error" style={{
          marginTop: 32, padding: '14px 20px', maxWidth: 600, marginInline: 'auto',
          background: 'rgba(220,90,90,0.1)', border: '1px solid #a04545',
          color: '#ff9999', borderRadius: 4, fontSize: 14, textAlign: 'center',
        }}>{error}</div>
      )}

      <div style={{ textAlign: 'center', marginTop: 64, padding: '24px 0', borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: 13 }}>
        <p style={{ marginBottom: 8 }}>
          Paiement 100 % sécurisé par Stripe. Aucune donnée bancaire stockée par Sijill.
        </p>
        <p>
          Une question ? <Link to="/a-propos" style={{ color: 'var(--brand-secondary)' }}>Contactez-nous</Link>
          {' · '}<Link to="/cgu" style={{ color: 'var(--brand-secondary)' }}>Conditions générales</Link>
        </p>
      </div>
    </section>
  )
}

function PlanCard({ testid, name, tagline, price, period, equivalent, highlight, badge, icon, features, ctaLabel, ctaLoading, onCta, asLink }) {
  return (
    <div
      data-testid={testid}
      style={{
        position: 'relative',
        background: highlight ? 'linear-gradient(180deg, rgba(31,174,107,0.07) 0%, rgba(31,174,107,0.02) 100%)' : 'var(--bg-secondary, #131210)',
        border: highlight ? '1.5px solid var(--brand-secondary)' : '1px solid var(--border-subtle)',
        borderRadius: 8,
        padding: '36px 28px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
        transform: 'none',
        boxShadow: highlight ? '0 18px 48px -16px rgba(31,174,107,0.25)' : 'none',
        transition: 'transform 0.2s ease',
      }}
    >
      {badge && (
        <div data-testid={`${testid}-badge`} style={{
          position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--brand-secondary)', color: '#0d0c0a',
          padding: '5px 14px', borderRadius: 999, fontSize: 10.5,
          letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700,
        }}>{badge}</div>
      )}

      <header style={{ textAlign: 'center' }}>
        {icon && <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>}
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 4, color: highlight ? 'var(--brand-secondary)' : 'var(--text)' }}>{name}</h3>
        <p style={{ fontSize: 11.5, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-muted)' }}>{tagline}</p>
      </header>

      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 52, lineHeight: 1, color: highlight ? 'var(--brand-secondary)' : 'var(--text)' }}>
          {price}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>{period}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>{equivalent}</div>
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        {features.map((f, i) => (
          <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, lineHeight: 1.5, color: 'var(--text)' }}>
            <span style={{ color: 'var(--brand-secondary)', flexShrink: 0, marginTop: 2 }}>✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onCta}
        disabled={ctaLoading}
        data-testid={`${testid}-cta`}
        style={{
          background: highlight ? '#1FAE6B' : (asLink ? 'transparent' : '#f3ede1'),
          color: highlight ? '#0d0c0a' : (asLink ? '#1FAE6B' : '#0d0c0a'),
          border: asLink ? '1px solid #1FAE6B' : 'none',
          padding: '15px 22px',
          borderRadius: 4,
          fontSize: 12.5,
          letterSpacing: 2.5,
          textTransform: 'uppercase',
          fontWeight: 700,
          cursor: ctaLoading ? 'progress' : 'pointer',
          opacity: ctaLoading ? 0.6 : 1,
          marginTop: 4,
          boxShadow: highlight ? '0 4px 14px rgba(31,174,107,0.4)' : 'none',
        }}
      >
        {ctaLoading ? 'Préparation…' : ctaLabel}
      </button>
    </div>
  )
}
