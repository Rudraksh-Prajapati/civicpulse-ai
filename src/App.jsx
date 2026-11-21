
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'

import CityReports from './components/CityReports'
import AdminDashboard from './components/AdminDashboard'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import ReportIssue from './components/ReportIssue'
import MyReports from './components/MyReports'
import MapView from './components/MapView'
import Settings from './components/Settings'
import HelpSupport from './components/HelpSupport'
import AdminLogin from './components/AdminLogin'
import CitizenAuth from './components/CitizenAuth'
import Notifications from './components/Notifications'

const ADMIN_ID = 'e6eebbc8-9037-4cc5-bae9-873a16f66e42'

const CITIES = [
  'Chandigarh',
  'New Delhi',
  'Delhi',
  'Mumbai',
  'Bengaluru',
  'Hyderabad',
  'Pune',
  'Chennai',
  'Kolkata',
  'Jaipur',
  'Lucknow',
  'Kaithal',
  'Gurugram',
  'Noida',
  'Dehradun',
  'Amritsar',
]

function App() {
  const [activePage, setActivePage] = useState('City Reports')
  const [selectedReportId, setSelectedReportId] = useState(null)

  const [selectedCity, setSelectedCity] = useState(
    () => localStorage.getItem('civicpulse-city') || ''
  )

  const [showCityPicker, setShowCityPicker] = useState(
    () => !localStorage.getItem('civicpulse-city')
  )

  const [adminUser, setAdminUser] = useState(null)
  const [citizenUser, setCitizenUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authScreen, setAuthScreen] = useState('citizen')
  const [returnTo, setReturnTo] = useState('City Reports')

  // Restore authentication session
  useEffect(() => {
    let mounted = true

    async function checkSession() {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Session error:', error.message)
        }

        if (!mounted) return

        const user = data?.session?.user

        if (user?.id === ADMIN_ID) {
          setAdminUser(user)
          setCitizenUser(null)
          setActivePage('Admin Dashboard')
        } else if (user) {
          setCitizenUser(user)
          setAdminUser(null)
          setActivePage('City Reports')
        } else {
          setAdminUser(null)
          setCitizenUser(null)
          setActivePage('City Reports')
        }
      } catch (error) {
        console.error('Authentication error:', error)
      } finally {
        if (mounted) {
          setAuthLoading(false)
        }
      }
    }

    checkSession()

    const { data: authListener } =
      supabase.auth.onAuthStateChange((event, session) => {
        const user = session?.user

        if (user?.id === ADMIN_ID) {
          setAdminUser(user)
          setCitizenUser(null)

          if (event === 'SIGNED_IN') {
            setActivePage('Admin Dashboard')
          }
        } else if (user) {
          setCitizenUser(user)
          setAdminUser(null)
        } else {
          setAdminUser(null)
          setCitizenUser(null)

          if (event === 'SIGNED_OUT') {
            setActivePage('City Reports')
            setReturnTo('City Reports')
            setAuthScreen('citizen')
          }
        }
      })

    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  // Select and save city
  const handleCitySelect = (city) => {
    if (!city) return

    localStorage.setItem('civicpulse-city', city)

    setSelectedCity(city)
    setShowCityPicker(false)
    setActivePage('City Reports')
  }

  // Change city
  const handleChangeCity = () => {
    setShowCityPicker(true)
  }

  // Navigation and access protection
  const handleNavigate = (page, reportId = null) => {
    if (reportId) {
      setSelectedReportId(reportId)
    }

    if (
      ['Report an Issue', 'My Reports', 'Settings'].includes(page) &&
      !citizenUser &&
      !adminUser
    ) {
      setReturnTo(page)
      setAuthScreen('citizen')
      setActivePage('Citizen Login')
      return
    }

    if (page === 'Admin Dashboard' && !adminUser) {
      setAuthScreen('admin')
      setActivePage('Admin Login')
      return
    }

    setActivePage(page)
  }

  // Citizen login
  const handleCitizenLogin = (user) => {
    setCitizenUser(user)
    setAdminUser(null)
    setAuthScreen('citizen')
    setActivePage(returnTo || 'City Reports')
  }

  // Admin login
  const handleAdminLogin = (user) => {
    setAdminUser(user)
    setCitizenUser(null)
    setActivePage('Admin Dashboard')
  }

  // Logout
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Logout failed:', error.message)
      return
    }

    setAdminUser(null)
    setCitizenUser(null)
    setAuthScreen('citizen')
    setReturnTo('City Reports')
    setActivePage('City Reports')
  }

  // Authentication loading screen
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#171512] text-[#e9a16e]">
        Checking your CivicPulse session...
      </div>
    )
  }

  // City selection
  if (!selectedCity || showCityPicker) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#171512] px-5 py-12 text-white">

        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-[#bd7043]/20 blur-[130px]" />

        <div className="absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-[#d39a5b]/15 blur-[130px]" />

        <div className="relative z-10 w-full max-w-[560px] rounded-[30px] border border-[#e3ad82]/20 bg-[#211d18]/95 p-7 shadow-2xl backdrop-blur-2xl sm:p-10">

          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#edb17e] to-[#a95632] text-2xl font-black text-[#27160e]">
              C
            </div>

            <div>
              <h1 className="text-xl font-bold">
                CivicPulse <span className="text-[#e9a16e]">AI</span>
              </h1>

              <p className="text-[10px] uppercase tracking-[3px] text-[#b9a995]">
                Smarter Cities. Better Living.
              </p>
            </div>
          </div>

          <div className="mb-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[3px] text-[#e4a477]">
              YOUR CITY, YOUR COMMUNITY
            </p>

            <h2 className="text-3xl font-semibold sm:text-4xl">
              Choose your city.
            </h2>

            <p className="mt-3 text-sm leading-7 text-[#aaa095]">
              Explore civic complaints, city statistics, public reports
              and local developments in your selected city.
              No account is required to browse.
            </p>
          </div>

          <label className="mb-3 block text-sm font-medium text-[#e4d9cb]">
            Select your city
          </label>

          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#12110e] px-4 py-4 text-sm text-white outline-none focus:border-[#d28a5b]"
          >
            <option value="">Choose a city</option>

            {CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>

          <button
            onClick={() => handleCitySelect(selectedCity)}
            disabled={!selectedCity}
            className="mt-5 w-full rounded-xl bg-gradient-to-r from-[#efb17f] to-[#bd6d45] py-4 text-sm font-bold tracking-wide text-[#21150e] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            EXPLORE MY CITY →
          </button>

          <div className="my-7 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />

            <span className="text-[10px] uppercase tracking-[2px] text-[#92887c]">
              OR
            </span>

            <div className="h-px flex-1 bg-white/10" />
          </div>

          <button
            disabled={!selectedCity}
            onClick={() => {
              if (!selectedCity) return

              localStorage.setItem('civicpulse-city', selectedCity)
              setShowCityPicker(false)
              setReturnTo('City Reports')
              setAuthScreen('citizen')
              setActivePage('Citizen Login')
            }}
            className="w-full rounded-xl border border-[#d28a5b]/40 py-3.5 text-sm font-semibold text-[#e9b58e] transition hover:bg-[#d28a5b]/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue to Citizen Sign In
          </button>

          <p className="mt-6 text-center text-xs text-[#898176]">
            Public city information is available without an account.
          </p>
        </div>
      </main>
    )
  }

  // Citizen login page
  if (activePage === 'Citizen Login' && !citizenUser && !adminUser) {
    return (
      <div className="relative min-h-screen bg-[#171512]">

        <button
          onClick={() => {
            setReturnTo('City Reports')
            setAuthScreen('citizen')
            setActivePage('City Reports')
          }}
          className="absolute left-5 top-5 z-50 flex items-center gap-2 rounded-xl border border-[#d28a5b]/40 bg-[#211d18]/90 px-5 py-3 text-sm font-semibold text-[#e9b58e] shadow-lg transition hover:border-[#e9a16e] hover:bg-[#30251d]"
        >
          <span className="text-lg">←</span>
          Back to City Reports
        </button>

        <CitizenAuth
          onLogin={handleCitizenLogin}
          onAdminLogin={() => {
            setAuthScreen('admin')
            setActivePage('Admin Login')
          }}
        />

      </div>
    )
  }

  // Admin login page
  if (activePage === 'Admin Login' && !adminUser) {
    return (
      <AdminLogin
        onLogin={handleAdminLogin}
        onBack={() => {
          setActivePage('City Reports')
          setAuthScreen('citizen')
        }}
      />
    )
  }

  return (
    <div className="flex min-h-screen bg-[#171512]">

      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        setActivePage={handleNavigate}
        isAdmin={!!adminUser}
        user={adminUser || citizenUser}
        onLogout={handleLogout}
      />

      <div className="min-w-0 flex-1 pt-16 md:pt-0">

        {/* Main toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-500/10 bg-[#171512] px-5 py-4 text-white sm:px-8">

          <div>
            <p className="text-[10px] uppercase tracking-[2px] text-[#a99b8a]">
              Currently exploring
            </p>

            <div className="mt-1 flex items-center gap-2">
              <span className="text-[#e9a16e]">◎</span>
              <span className="font-semibold">{selectedCity}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">

            {/* GLOBAL CITIZEN NOTIFICATIONS */}
            {citizenUser && (
              <Notifications
                user={citizenUser}
                onNavigate={handleNavigate}
              />
            )}

            {!citizenUser && !adminUser && (
              <button
                onClick={() => {
                  setReturnTo('City Reports')
                  setAuthScreen('citizen')
                  setActivePage('Citizen Login')
                }}
                className="rounded-lg border border-[#d28a5b]/40 px-4 py-2 text-xs font-semibold text-[#e9b58e] hover:bg-[#d28a5b]/10"
              >
                Citizen Sign In
              </button>
            )}

            <button
              onClick={handleChangeCity}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              Change City
            </button>
          </div>
        </div>

        {/* PUBLIC CITY REPORTS */}
        {activePage === 'City Reports' && (
          <CityReports city={selectedCity} />
        )}

        {/* PUBLIC CITY OVERVIEW */}
        {activePage === 'Overview' && (
          <Dashboard city={selectedCity} />
        )}

        {/* REPORT SUBMISSION */}
        {activePage === 'Report an Issue' && (citizenUser || adminUser) && (
          <ReportIssue city={selectedCity} />
        )}

        {/* PERSONAL REPORTS */}
        {activePage === 'My Reports' && (citizenUser || adminUser) && (
          <MyReports selectedReportId={selectedReportId} />
        )}

        {/* PUBLIC CITY MAP */}
        {activePage === 'Map View' && (
          <MapView city={selectedCity} />
        )}

        {/* PERSONAL SETTINGS */}
        {activePage === 'Settings' && (citizenUser || adminUser) && (
          <Settings />
        )}

        {/* HELP AND SUPPORT */}
        {activePage === 'Help & Support' && (
          <HelpSupport />
        )}

        {/* ACCOUNT */}
        {activePage === 'Citizen Login' && (citizenUser || adminUser) && (
          <main className="p-8 text-white">
            <h1 className="text-3xl font-bold">Account</h1>

            <p className="mt-3 text-stone-400">
              Signed in as {(adminUser || citizenUser)?.email}
            </p>

            <button
              onClick={handleLogout}
              className="mt-6 rounded-xl bg-red-600 px-5 py-3 text-white hover:bg-red-500"
            >
              Sign Out
            </button>
          </main>
        )}

        {/* ADMIN DASHBOARD */}
        {activePage === 'Admin Dashboard' && adminUser && (
          <AdminDashboard />
        )}

        {activePage === 'Admin Dashboard' && !adminUser && (
          <div className="p-8 text-white">
            <p className="text-red-400">Admin access required.</p>

            <button
              onClick={() => handleNavigate('Admin Dashboard')}
              className="mt-4 rounded-xl bg-[#bd7045] px-5 py-3 text-white"
            >
              Go to Admin Login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
