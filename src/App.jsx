
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

function App() {
  const [activePage, setActivePage] = useState('City Reports')
  const [selectedReportId, setSelectedReportId] = useState(null)

  const [selectedCity, setSelectedCity] = useState(
    () => localStorage.getItem('civicpulse-city') || ''
  )

  const [showCityPicker, setShowCityPicker] = useState(
    () => !localStorage.getItem('civicpulse-city')
  )

  const [cityQuery, setCityQuery] = useState(
    () => localStorage.getItem('civicpulse-city') || ''
  )
  const [citySuggestions, setCitySuggestions] = useState([])
  const [cityLoading, setCityLoading] = useState(false)
  const [cityError, setCityError] = useState('')

  const [adminUser, setAdminUser] = useState(null)
  const [citizenUser, setCitizenUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authScreen, setAuthScreen] = useState('citizen')
  const [returnTo, setReturnTo] = useState('City Reports')

  useEffect(() => {
    const query = cityQuery.trim()

    if (query.length < 2 || (selectedCity && query === selectedCity)) {
      setCitySuggestions([])
      setCityLoading(false)
      setCityError('')
      return
    }

    const controller = new AbortController()

    const timer = setTimeout(async () => {
      setCityLoading(true)
      setCityError('')
      setCitySuggestions([])

      try {
        const params = new URLSearchParams({
          q: query,
          limit: '20',
          lang: 'en',
          lat: '22.5',
          lon: '79.0',
        })

        const response = await fetch(
          `https://photon.komoot.io/api/?${params.toString()}`,
          { signal: controller.signal }
        )

        if (!response.ok) {
          throw new Error('City search is temporarily unavailable.')
        }

        const result = await response.json()

        const allowedPlaceTypes = [
          'city',
          'town',
          'village',
          'municipality',
          'hamlet',
          'locality',
          'suburb',
        ]

        const places = (result.features || [])
          .filter((feature) => {
            const properties = feature.properties || {}

            return (
              properties.country?.toLowerCase() === 'india' &&
              allowedPlaceTypes.includes(properties.osm_value)
            )
          })
          .map((feature) => {
            const properties = feature.properties || {}

            return {
              name: properties.name || properties.city || '',
              state:
                properties.state ||
                properties.county ||
                properties.district ||
                '',
              type: properties.osm_value || 'place',
            }
          })
          .filter((place) => place.name.trim() !== '')

        const uniquePlaces = places.filter(
          (place, index, array) =>
            array.findIndex(
              (item) =>
                item.name.toLowerCase() === place.name.toLowerCase() &&
                item.state.toLowerCase() === place.state.toLowerCase()
            ) === index
        )

        setCitySuggestions(uniquePlaces)
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('City search error:', error)
          setCityError(
            'Unable to search cities right now. Please try again.'
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setCityLoading(false)
        }
      }
    }, 450)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [cityQuery, selectedCity])

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

  const handleCitySuggestionSelect = (place) => {
    setSelectedCity(place.name)
    setCityQuery(place.name)
    setCitySuggestions([])
    setCityError('')
  }

  const handleCitySelect = (city) => {
    if (!city) return

    localStorage.setItem('civicpulse-city', city)

    setSelectedCity(city)
    setCityQuery(city)
    setCitySuggestions([])
    setCityError('')
    setShowCityPicker(false)
    setActivePage('City Reports')
  }

  const handleChangeCity = () => {
    setCityQuery('')
    setSelectedCity('')
    setCitySuggestions([])
    setCityError('')
    setShowCityPicker(true)
  }

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

  const handleCitizenLogin = (user) => {
    setCitizenUser(user)
    setAdminUser(null)
    setAuthScreen('citizen')
    setActivePage(returnTo || 'City Reports')
  }

  const handleAdminLogin = (user) => {
    setAdminUser(user)
    setCitizenUser(null)
    setActivePage('Admin Dashboard')
  }

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

  const handleContinueToSignIn = () => {
    if (!selectedCity) return

    localStorage.setItem('civicpulse-city', selectedCity)

    setShowCityPicker(false)
    setReturnTo('City Reports')
    setAuthScreen('citizen')
    setActivePage('Citizen Login')
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#171512] text-[#e9a16e]">
        Checking your CivicPulse session...
      </div>
    )
  }

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

          <label
            htmlFor="city-search"
            className="mb-3 block text-sm font-medium text-[#e4d9cb]"
          >
            Search your city or town
          </label>

          <div className="relative">
            <div className="relative">
              <input
                id="city-search"
                type="text"
                value={cityQuery}
                onChange={(e) => {
                  setCityQuery(e.target.value)
                  setSelectedCity('')
                  setCityError('')
                }}
                placeholder="Type a city name..."
                autoComplete="off"
                className="w-full rounded-xl border border-white/10 bg-[#12110e] px-4 py-4 pr-12 text-sm text-white outline-none transition placeholder:text-[#777067] focus:border-[#d28a5b]"
              />

              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#e9a16e]">
                {cityLoading ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#e9a16e] border-t-transparent" />
                ) : (
                  '⌕'
                )}
              </span>
            </div>

            {citySuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-[#211d18] shadow-2xl">
                {citySuggestions.map((place, index) => (
                  <button
                    key={`${place.name}-${place.state}-${index}`}
                    type="button"
                    onClick={() => handleCitySuggestionSelect(place)}
                    className={`flex w-full items-center justify-between gap-3 border-b border-white/5 px-4 py-3 text-left transition last:border-b-0 hover:bg-[#d28a5b]/10 ${
                      selectedCity === place.name
                        ? 'bg-[#d28a5b]/10'
                        : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">
                        {place.name}
                      </p>

                      <p className="mt-1 text-xs text-[#aaa095]">
                        {place.state
                          ? `${place.state}, India`
                          : 'India'}
                      </p>
                    </div>

                    <span className="shrink-0 text-[#e9a16e]">
                      →
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {cityLoading && (
            <p className="mt-3 text-xs text-[#e9a16e]">
              Searching Indian cities and towns...
            </p>
          )}

          {cityError && (
            <p className="mt-3 text-xs text-red-400">
              {cityError}
            </p>
          )}

          {!cityLoading &&
            !cityError &&
            cityQuery.trim().length >= 2 &&
            citySuggestions.length === 0 &&
            !selectedCity && (
              <p className="mt-3 text-xs text-[#aaa095]">
                No matching Indian locations found. Try another spelling.
              </p>
            )}

          {selectedCity && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#d28a5b]/30 bg-[#d28a5b]/10 px-4 py-3">
              <span className="text-[#e9a16e]">✓</span>

              <p className="text-sm text-white">
                Selected city:
                <span className="ml-1 font-semibold text-[#e9a16e]">
                  {selectedCity}
                </span>
              </p>
            </div>
          )}

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
            onClick={handleContinueToSignIn}
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
            {/* Keep global notifications */}
            {citizenUser && (
              <Notifications
                user={citizenUser}
                onNavigate={handleNavigate}
              />
            )}

            {/* Direct account settings shortcut */}
            {(citizenUser || adminUser) && (
              <button
                type="button"
                onClick={() => handleNavigate('Settings')}
                title="Account Settings"
                aria-label="Open Account Settings"
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition ${
                  activePage === 'Settings'
                    ? 'border-orange-400 bg-orange-500/20 text-orange-300'
                    : 'border-orange-500/30 bg-orange-500/10 text-orange-400 hover:border-orange-400 hover:bg-orange-500/20'
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M5 21a7 7 0 0 1 14 0" />
                </svg>
              </button>
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

        {activePage === 'City Reports' && (
          <CityReports city={selectedCity} />
        )}

        {activePage === 'Overview' && (
          <Dashboard city={selectedCity} />
        )}

        {activePage === 'Report an Issue' && (citizenUser || adminUser) && (
          <ReportIssue city={selectedCity} />
        )}

        {activePage === 'My Reports' && (citizenUser || adminUser) && (
          <MyReports selectedReportId={selectedReportId} />
        )}

        {activePage === 'Map View' && (
          <MapView city={selectedCity} />
        )}

        {/* Supabase authenticated user passed to Settings */}
        {activePage === 'Settings' && (citizenUser || adminUser) && (
          <Settings user={adminUser || citizenUser} />
        )}

        {activePage === 'Help & Support' && (
          <HelpSupport />
        )}

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
