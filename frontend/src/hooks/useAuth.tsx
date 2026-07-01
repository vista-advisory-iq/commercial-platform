import { createContext, useContext, useEffect, useState } from 'react'
import { getMe } from '@/api/me'
import { logout as apiLogout } from '@/api/auth'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  isLoading: boolean
  logout: () => void
  refetch: () => void
}

const AuthContext = createContext<AuthState>({
  user: null,
  isLoading: true,
  logout: () => {},
  refetch: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetch = () => {
    if (!localStorage.getItem('access')) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => { fetch() }, [])

  const logout = () => {
    apiLogout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, logout, refetch: fetch }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
