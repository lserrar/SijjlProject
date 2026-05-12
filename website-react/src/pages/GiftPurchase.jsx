import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { purchaseGiftCard, getPreregistrationCount } from '../api'

export default function GiftPurchase() {
  const [plan, setPlan] = useState('founder_yearly')
  const [form, setForm] = useState({
    purchaser_name: '', purchaser_email: '',
    recipient_name: '', recipient_email: '',
    personal_message: '', deliver_at: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { document.title = 'Offrir un abonnement · Sijill Project' }, [])

  const planInfo = plan === 'founder_yearly'
    ? { price: '84 €', label: '12 mois', save: '— soit 7 € / mois' }
    : { price: '7 €', label: '1 mois', save: 'Idéal pour découvrir' }

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (!form.purchaser_name.trim() || !form.purchaser_email.trim() ||
        !form.recipient_name.trim() || !form.recipient_email.trim()) {
      setError('Tous les noms et emails sont requis.')
      return
    }
    setSubmitting(true)
    try {
      const res = await purchaseGiftCard({
        ...form,
        plan_id: plan,
        origin_url: window.location.origin + '/api/site',
      })
      if (res?.url) window.location.href = res.url
      else setError('Réponse Stripe inattendue.')
    } catch (e2) {
      setError(e2?.message || 'Erreur lors de la création du paiement.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '60px 24px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <Link to="/" data-testid="gift-back-home" style={{ color: 'var(--brand-secondary)', fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase' }}>← Retour</Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 38, marginTop: 18, marginBottom: 4 }}>Offrir un abonnement Sijill</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.6 }}>
          Un cadeau qui ouvre les portes des grandes pensées de l'islam classique. Idéal pour un anniversaire,
          un mariage, l'aïd ou simplement pour partager une passion. Le destinataire reçoit un code par email
          qu'il active sur son compte Sijill.
        </p>

        <form onSubmit={submit} style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 24 }} data-testid="gift-form">
          <section>
            <label className="cra-label" style={labelStyle}>Formule</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                ['founder_yearly', 'Annuel', '84 €', '12 mois'],
                ['founder_monthly', 'Mensuel', '7 €', '1 mois'],
              ].map(([id, name, price, dur]) => (
                <button type="button" key={id} onClick={() => setPlan(id)} data-testid={`plan-${id}`}
                        style={{
                          padding: '20px 18px', borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                          border: `1px solid ${plan === id ? 'var(--brand-secondary)' : 'var(--border-subtle)'}`,
                          background: plan === id ? 'rgba(31,174,107,0.10)' : 'transparent',
                          transition: 'all 0.2s',
                        }}>
                  <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--text-muted)' }}>{name}</div>
                  <div style={{ fontSize: 30, fontFamily: 'var(--font-display)', marginTop: 4, color: 'var(--text)' }}>{price}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{dur}</div>
                </button>
              ))}
            </div>
            <p style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>{planInfo.save}</p>
          </section>

          <section>
            <h3 style={sectionTitle}>De votre part</h3>
            <div style={twoCols}>
              <Field label="Votre nom" value={form.purchaser_name} onChange={v => setForm({ ...form, purchaser_name: v })} testid="purchaser-name" />
              <Field label="Votre email" type="email" value={form.purchaser_email} onChange={v => setForm({ ...form, purchaser_email: v })} testid="purchaser-email" />
            </div>
          </section>

          <section>
            <h3 style={sectionTitle}>Pour qui ?</h3>
            <div style={twoCols}>
              <Field label="Nom du destinataire" value={form.recipient_name} onChange={v => setForm({ ...form, recipient_name: v })} testid="recipient-name" />
              <Field label="Email du destinataire" type="email" value={form.recipient_email} onChange={v => setForm({ ...form, recipient_email: v })} testid="recipient-email" />
            </div>
            <label style={labelStyle}>Message personnel (facultatif, 500 caractères max)</label>
            <textarea data-testid="personal-message" value={form.personal_message} onChange={e => setForm({ ...form, personal_message: e.target.value.slice(0, 500) })}
                      style={{ ...inputStyle, minHeight: 80, resize: 'vertical', fontFamily: 'EB Garamond, Georgia, serif', fontSize: 16 }}
                      placeholder="Joyeux anniversaire, profite bien de Sijill !" />
            <label style={labelStyle}>Date de livraison (laisser vide pour envoyer maintenant)</label>
            <input type="date" data-testid="deliver-at" value={form.deliver_at} onChange={e => setForm({ ...form, deliver_at: e.target.value })} style={inputStyle} min={new Date().toISOString().slice(0, 10)} />
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6 }}>
              Programmez la livraison pour un anniversaire, l'aïd ou Noël. Vous recevrez de toute façon une confirmation immédiate par email.
            </p>
          </section>

          {error && <div data-testid="gift-error" style={{ color: '#ff8888', fontSize: 13.5, padding: '10px 14px', border: '1px solid #5a3a3a', borderRadius: 4 }}>{error}</div>}
          <button type="submit" disabled={submitting} data-testid="gift-submit"
                  style={{
                    background: 'var(--brand-secondary)', color: '#0d0c0a', border: 'none',
                    padding: '16px 32px', borderRadius: 3, fontSize: 13, letterSpacing: 2.5,
                    textTransform: 'uppercase', fontWeight: 600, cursor: submitting ? 'progress' : 'pointer',
                    opacity: submitting ? 0.6 : 1, marginTop: 6,
                  }}>
            {submitting ? 'Préparation…' : `Offrir pour ${planInfo.price}`}
          </button>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
            Paiement sécurisé par Stripe. Le code cadeau reste valable 1 an à compter de l'achat.
          </p>
        </form>
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text-muted)', marginTop: 14, marginBottom: 6 }
const inputStyle = { width: '100%', background: 'var(--bg-tertiary, #1a1a1a)', border: '1px solid var(--border-subtle)', color: 'var(--text)', padding: '10px 14px', borderRadius: 4, fontSize: 14 }
const twoCols = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }
const sectionTitle = { fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 12, color: 'var(--text)' }

function Field({ label, value, onChange, type = 'text', testid }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} style={inputStyle} data-testid={testid} required />
    </div>
  )
}
