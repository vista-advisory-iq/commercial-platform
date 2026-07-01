import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { Role } from '@/types'

interface Props {
  children: React.ReactNode
  allowedRoles?: Role[]
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading…</div>
  }

  if (!user) return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const redirect = user.role === 'BD' ? '/deals' : '/queue'
    return <Navigate to={redirect} replace />
  }

  return <>{children}</>
}
