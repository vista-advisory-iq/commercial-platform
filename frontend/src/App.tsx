import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/pages/LoginPage'
import { MyDealsPage } from '@/pages/MyDealsPage'
import { DealFormPage } from '@/pages/DealFormPage'
import { DealDetailPage } from '@/pages/DealDetailPage'
import { AnalystQueuePage } from '@/pages/AnalystQueuePage'
import { AllDealsPage } from '@/pages/AllDealsPage'
import { EditRequestsPage } from '@/pages/EditRequestsPage'
import { AgentsPage } from '@/pages/AgentsPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

function RootRedirect() {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'BD' ? '/deals' : '/queue'} replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/deals"
              element={
                <ProtectedRoute allowedRoles={['BD']}>
                  <Layout><MyDealsPage /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/deals/new"
              element={
                <ProtectedRoute allowedRoles={['BD']}>
                  <Layout><DealFormPage /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/deals/:id/edit"
              element={
                <ProtectedRoute allowedRoles={['BD']}>
                  <Layout><DealFormPage /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/deals/:id"
              element={
                <ProtectedRoute>
                  <Layout><DealDetailPage /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/queue"
              element={
                <ProtectedRoute allowedRoles={['ANALYST', 'MANAGER', 'ADMIN']}>
                  <Layout><AnalystQueuePage /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/all-deals"
              element={
                <ProtectedRoute allowedRoles={['ANALYST', 'MANAGER', 'ADMIN']}>
                  <Layout><AllDealsPage /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/edit-requests"
              element={
                <ProtectedRoute allowedRoles={['ANALYST', 'MANAGER']}>
                  <Layout><EditRequestsPage /></Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/agents"
              element={
                <ProtectedRoute>
                  <Layout><AgentsPage /></Layout>
                </ProtectedRoute>
              }
            />

            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
