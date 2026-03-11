import { createContext, useContext, useState, useEffect } from 'react'
import { getMe } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('sijill_token')
    if (token) {
      getMe()
        .then(data => setUser(data.user || data))
        .catch(() => localStorage.removeItem('sijill_token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const loginUser = (token, userData) => {
    localStorage.setItem('sijill_token', token)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('sijill_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
