import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { NotificationMenu } from '@/components/NotificationMenu'
import { Bell, MessageCircle, LogOut } from 'lucide-react'

export function NavBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (!user) return null

  const isBD = user.role === 'BD'
  const canAssess = user.role === 'ANALYST' || user.role === 'MANAGER'

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-[#083060] via-[#0A3A74] to-[#0B4FA3] text-white shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-3">
            <span className="flex items-center rounded-lg bg-white px-2 py-1">
              <img src="/del-logo.png" alt="DEL" className="h-7" />
            </span>
            <span className="leading-tight">
              <span className="block font-semibold tracking-wide">DEL Commercial Platform</span>
              <span className="block text-[11px] text-blue-200/80">Decentralised Energy Limited</span>
            </span>
          </span>
          <nav className="flex gap-4 text-sm">
            {isBD && (
              <Link to="/deals" className="font-medium text-blue-100 transition-colors hover:text-white">
                My Deals
              </Link>
            )}
            <Link to="/agents" className="font-medium text-blue-100 transition-colors hover:text-white">
              Sales Agents
            </Link>
            {canAssess && (
              <>
                <Link to="/queue" className="font-medium text-blue-100 transition-colors hover:text-white">
                  Queue
                </Link>
                <Link to="/all-deals" className="font-medium text-blue-100 transition-colors hover:text-white">
                  All Deals
                </Link>
                <Link to="/edit-requests" className="font-medium text-blue-100 transition-colors hover:text-white">
                  Edit Requests
                </Link>
              </>
            )}
            {user.role === 'ADMIN' && (
              <>
                <Link to="/queue" className="font-medium text-blue-100 transition-colors hover:text-white">
                  Queue
                </Link>
                <Link to="/all-deals" className="font-medium text-blue-100 transition-colors hover:text-white">
                  All Deals
                </Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <NotificationMenu
            channel="messages"
            filter={{ kind: 'DEAL_COMMENT' }}
            icon={MessageCircle}
            title="Messages"
            emptyText="No messages."
            badgeClass="bg-blue-600"
          />
          <NotificationMenu
            channel="alerts"
            filter={{ excludeKind: 'DEAL_COMMENT' }}
            icon={Bell}
            title="Notifications"
            emptyText="No notifications."
          />
          <span className="text-sm text-blue-100">{user.full_name || user.email}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            title="Logout"
            className="text-blue-100 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
