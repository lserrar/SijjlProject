import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { getAdminPreregistrations } from '../api'
import { useNavigate } from 'react-router-dom'

export default function AdminPanel() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [preinscriptions, setPreinscriptions] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      navigate('/login')
    }
  }, [user, loading, navigate])

  useEffect(() => {
    if (user && user.role === 'admin') {
      getAdminPreregistrations()
        .then(data => setPreinscriptions(data || []))
        .catch(err => setError("Erreur de chargement"))
        .finally(() => setLoadingData(false))
    }
  }, [user])

  if (loading || !user) return null

  return (
    <div className="admin-panel" data-testid="admin-panel">
      <div className="admin-header">
        <h1 className="admin-title">Administration</h1>
      </div>

      {/* Pre-registrations */}
      <section className="admin-section" data-testid="admin-prereg-section">
        <div className="admin-section-header">
          <h2 className="admin-section-title">
            Liste d'attente
            <span className="admin-badge" data-testid="prereg-count">{preinscriptions.length}</span>
          </h2>
        </div>

        {error && <div className="admin-error">{error}</div>}

        {loadingData ? (
          <p style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-body)' }}>Chargement...</p>
        ) : preinscriptions.length === 0 ? (
          <p style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-body)' }}>Aucune inscription pour le moment.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table" data-testid="prereg-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Pr&eacute;nom</th>
                  <th>Email</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {preinscriptions.map((p, i) => (
                  <tr key={p.email} data-testid={`prereg-row-${i}`}>
                    <td className="admin-td-num">{i + 1}</td>
                    <td>{p.prenom}</td>
                    <td><a href={`mailto:${p.email}`}>{p.email}</a></td>
                    <td className="admin-td-date">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
