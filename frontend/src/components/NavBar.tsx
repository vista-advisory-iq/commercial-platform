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
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-primary">VAP Commercial</span>
          <nav className="flex gap-4 text-sm">
            {isBD && (
              <Link to="/deals" className="text-muted-foreground hover:text-foreground transition-colors">
                My Deals
              </Link>
            )}
            {canAssess && (
              <>
                <Link to="/queue" className="text-muted-foreground hover:text-foreground transition-colors">
                  Queue
                </Link>
                <Link to="/all-deals" className="text-muted-foreground hover:text-foreground transition-colors">
                  All Deals
                </Link>
                <Link to="/edit-requests" className="text-muted-foreground hover:text-foreground transition-colors">
                  Edit Requests
                </Link>
              </>
            )}
            {user.role === 'IC_MEMBER' && (
              <>
                <Link to="/queue" className="text-muted-foreground hover:text-foreground transition-colors">
                  Pipeline
                </Link>
                <Link to="/all-deals" className="text-muted-foreground hover:text-foreground transition-colors">
                  All Deals
                </Link>
              </>
            )}
            {user.role === 'ADMIN' && (
              <>
                <Link to="/queue" className="text-muted-foreground hover:text-foreground transition-colors">
                  Queue
                </Link>
                <Link to="/all-deals" className="text-muted-foreground hover:text-foreground transition-colors">
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
          <span className="text-sm text-muted-foreground">{user.full_name || user.email}</span>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
