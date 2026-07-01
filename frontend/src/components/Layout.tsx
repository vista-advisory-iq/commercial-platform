import { NavBar } from './NavBar'

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  )
}
