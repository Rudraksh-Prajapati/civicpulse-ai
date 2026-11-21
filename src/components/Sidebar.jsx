
import { useState } from 'react'

const navigation = [
  { name: 'City Reports', icon: '▤' },
  { name: 'Overview', icon: '◫' },
  { name: 'Report an Issue', icon: '＋' },
  { name: 'My Reports', icon: '▧' },
  { name: 'Map View', icon: '⌖' },
]

const support = [
  { name: 'Settings', icon: '⚙' },
  { name: 'Help & Support', icon: '?' },
]

function Sidebar({
  activePage,
  setActivePage,
  isAdmin = false,
  user = null,
  onLogout,
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const navigate = (page) => {
    setActivePage(page)
    setMobileOpen(false)
  }

  const renderNavItem = (item) => (
    <button
      key={item.name}
      onClick={() => navigate(item.name)}
      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${
        activePage === item.name
          ? 'border border-orange-500/20 bg-orange-500/10 text-orange-400'
          : 'text-stone-400 hover:bg-white/5 hover:text-orange-200'
      }`}
    >
      <span className="text-lg">{item.icon}</span>
      {item.name}
    </button>
  )

  const accountName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'User'

  const accountRole = isAdmin ? 'Administrator' : 'Citizen'

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={mobileOpen}
        className="fixed left-4 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-xl border border-orange-500/30 bg-[#211d18] text-xl text-orange-400 shadow-lg md:hidden"
      >
        ☰
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-[min(288px,85vw)] shrink-0 flex-col overflow-y-auto border-r border-orange-500/10 bg-[#151311] p-5 transition-transform duration-300 ease-in-out md:sticky md:top-0 md:z-30 md:flex md:h-screen md:w-64 md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="mb-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-400/30 bg-gradient-to-br from-orange-600 to-amber-700 text-xl font-bold text-white shadow-lg shadow-orange-950/40">
              C
            </div>

            <div>
              <h1 className="text-lg font-bold text-white">
                CivicPulse <span className="text-orange-400">AI</span>
              </h1>
              <p className="text-xs text-stone-500">
                Smart Civic Platform
              </p>
            </div>
          </div>

          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
            className="rounded-lg px-3 py-2 text-xl text-stone-400 hover:bg-white/10 hover:text-white md:hidden"
          >
            ×
          </button>
        </div>

        {/* Workspace */}
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-500">
          Workspace
        </p>

        <nav className="space-y-2">
          {navigation.map(renderNavItem)}

          {!user &&
            renderNavItem({ name: 'Citizen Login', icon: '♙' })}
        </nav>

        {/* Administration */}
        <div className="mt-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-500">
            Administration
          </p>

          {isAdmin
            ? renderNavItem({ name: 'Admin Dashboard', icon: '🛡' })
            : renderNavItem({ name: 'Admin Login', icon: '🛡' })}
        </div>

        {/* Preferences */}
        <div className="mt-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-500">
            Preferences
          </p>

          <nav className="space-y-2">
            {support.map(renderNavItem)}
          </nav>
        </div>

        {/* Account and system status */}
        <div className="mt-auto space-y-4 pt-8">
          {user && (
            <div className="rounded-xl border border-orange-500/15 bg-[#201c18] p-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-orange-400/20 bg-orange-500/10 text-lg font-bold text-orange-400">
                  {accountName.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {accountName}
                  </p>
                  <p className="truncate text-xs text-stone-500">
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs text-stone-400">
                  Account Type
                </span>
                <span className="rounded-full bg-orange-500/10 px-2 py-1 text-xs text-orange-400">
                  {accountRole}
                </span>
              </div>

              <button
                onClick={onLogout}
                className="w-full rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/15"
              >
                ↪ Sign Out
              </button>
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-[#201c18] p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">
                System Online
              </span>
            </div>
            <p className="text-xs text-stone-500">
              CivicPulse AI v1.0
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
