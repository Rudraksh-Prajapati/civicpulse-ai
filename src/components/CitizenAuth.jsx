
import { useState } from 'react'
import { supabase, setRememberMe } from '../lib/supabase'

function CitizenAuth({ onLogin, onAdminLogin }) {
  const [isRegister, setIsRegister] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMeState] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
          },
        })

        if (error) throw error

        if (data.session) {
          onLogin(data.user)
        } else {
          setMessage('Account created! Verify your email, then sign in.')
          setIsRegister(false)
        }
      } else {
        setRememberMe(rememberMe)

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error
        onLogin(data.user)
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (register) => {
    setIsRegister(register)
    setError('')
    setMessage('')
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#171512] text-[#f6eee3]">
      {/* BACKGROUND ENVIRONMENT */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#30251d] via-[#211b15] to-[#10110e]" />

        <div className="absolute -left-40 top-0 h-[450px] w-[450px] rounded-full bg-[#bd7043]/20 blur-[120px] sm:h-[650px] sm:w-[650px] sm:blur-[140px]" />

        <div className="absolute right-[10%] top-[5%] h-[300px] w-[300px] rounded-full bg-[#d39a5b]/15 blur-[100px] sm:h-[450px] sm:w-[450px] sm:blur-[130px]" />

        <div className="absolute right-[17%] top-[10%] h-20 w-20 rounded-full bg-[#e6bd8d]/10 shadow-[0_0_80px_rgba(225,173,116,0.12)] blur-sm sm:h-28 sm:w-28" />

        {/* Stars */}
        {Array.from({ length: 55 }).map((_, i) => (
          <span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-[#e8c49b]/50"
            style={{
              left: `${(i * 37) % 100}%`,
              top: `${(i * 19) % 48}%`,
              opacity: 0.2 + ((i * 13) % 7) / 10,
            }}
          />
        ))}

        {/* Distant skyline */}
        <div className="absolute bottom-[20%] flex h-[42%] w-full items-end justify-around opacity-50">
          {Array.from({ length: 27 }).map((_, i) => (
            <div
              key={i}
              className="relative border border-[#a77a51]/30 bg-gradient-to-b from-[#51402e] to-[#211d17]"
              style={{
                width: `${3 + (i % 3)}%`,
                height: `${35 + ((i * 31) % 65)}%`,
              }}
            >
              <div className="grid h-full grid-cols-2 gap-1 p-1 sm:gap-2 sm:p-2">
                {Array.from({ length: 12 }).map((_, j) => (
                  <span
                    key={j}
                    className="rounded-[1px] bg-[#e9ae70]/40 shadow-[0_0_7px_rgba(233,174,112,0.2)]"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Landmark buildings */}
        <div className="absolute bottom-[20%] right-[9%] hidden items-end gap-3 opacity-65 md:flex">
          <div className="relative h-64 w-20 border border-[#c28a5a]/30 bg-gradient-to-b from-[#403328] to-[#191713]">
            <div className="absolute -top-5 left-1/2 h-5 w-px bg-[#d6a36d]" />
            <div className="grid grid-cols-3 gap-2 p-3">
              {Array.from({ length: 24 }).map((_, i) => (
                <span key={i} className="h-3 bg-[#e3aa70]/50" />
              ))}
            </div>
          </div>

          <div className="relative h-48 w-24 border border-[#c28a5a]/30 bg-gradient-to-b from-[#51402e] to-[#191713]">
            <div className="grid grid-cols-3 gap-2 p-3">
              {Array.from({ length: 18 }).map((_, i) => (
                <span key={i} className="h-3 bg-[#e3aa70]/40" />
              ))}
            </div>
          </div>

          <div className="relative h-72 w-16 border border-[#c28a5a]/30 bg-gradient-to-b from-[#51402e] to-[#191713]">
            <div className="grid grid-cols-2 gap-2 p-2">
              {Array.from({ length: 24 }).map((_, i) => (
                <span key={i} className="h-3 bg-[#e3aa70]/40" />
              ))}
            </div>
          </div>
        </div>

        {/* Elevated road */}
        <div className="absolute bottom-[17%] left-[-5%] h-5 w-[110%] -rotate-2 border-y border-[#d19a66]/40 bg-[#29231c] shadow-[0_0_35px_rgba(199,127,76,0.2)]" />
        <div className="absolute bottom-[16.8%] left-0 h-px w-full bg-[#e6b37e]/40" />

        {/* Street lamps */}
        {[7, 23, 44, 68, 87].map((position) => (
          <div
            key={position}
            className="absolute bottom-[17%] h-28 w-px bg-[#a98a68]/70"
            style={{ left: `${position}%` }}
          >
            <div className="absolute -left-2 top-0 h-3 w-5 rounded-full bg-[#efbd80] shadow-[0_0_25px_9px_rgba(239,189,128,0.4)]" />
          </div>
        ))}

        {/* Trees */}
        {[2, 13, 76, 91, 98].map((position) => (
          <div
            key={position}
            className="absolute bottom-[13%]"
            style={{ left: `${position}%` }}
          >
            <div className="h-28 w-1 bg-[#151810]" />
            <div className="absolute -left-12 -top-16 h-24 w-24 rounded-full bg-[#20271c] shadow-[0_0_35px_rgba(0,0,0,0.6)]" />
            <div className="absolute -left-7 -top-10 h-16 w-16 rounded-full bg-[#303a27]" />
          </div>
        ))}

        {/* Road */}
        <div className="absolute bottom-0 h-[15%] w-full bg-gradient-to-b from-[#171712] to-[#0b0d0a]" />

        <div className="absolute bottom-[5%] left-0 flex w-full justify-around opacity-30">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="h-[2px] w-12 bg-[#d8b48b]" />
          ))}
        </div>

        {/* Indian tricolour accent */}
        <div className="absolute bottom-[7%] left-[8%] flex h-1 w-36 overflow-hidden rounded-full opacity-80">
          <div className="flex-1 bg-[#e99b58]" />
          <div className="flex-1 bg-[#f0e4ce]" />
          <div className="flex-1 bg-[#82966e]" />
        </div>

        {/* Cinematic overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#15130f]/65 via-[#17140f]/30 to-[#15130f]/75" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#10110e]/90 via-transparent to-[#171512]/25" />
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1500px] grid-cols-1 items-center gap-8 px-4 py-6 sm:gap-10 sm:px-6 sm:py-10 md:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:px-16">

        {/* LOGIN CARD - FIRST ON MOBILE */}
        <section className="order-1 flex w-full items-center justify-center lg:order-2 lg:justify-end">
          <div className="w-full max-w-[460px] rounded-2xl border border-[#e3ad82]/25 bg-[#211d18]/95 p-5 shadow-[0_30px_100px_rgba(0,0,0,0.65)] backdrop-blur-2xl sm:rounded-[30px] sm:p-8 md:p-10">

            {/* Card heading */}
            <div className="mb-6 sm:mb-8">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[2px] text-[#e4a477] sm:tracking-[3px]">
                  CIVICPULSE ACCESS
                </span>

                <span className="rounded-full border border-[#d69b68]/25 bg-[#d69b68]/10 px-3 py-1 text-[10px] text-[#e9b58e]">
                  SECURE PORTAL
                </span>
              </div>

              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {isRegister ? 'Create account.' : 'Welcome back.'}
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#aaa095]">
                {isRegister
                  ? 'Join your community and make a difference.'
                  : 'Sign in to stay connected with your city.'}
              </p>
            </div>

            {/* Citizen and Admin tabs */}
            <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-white/[0.07] bg-black/25 p-1.5 sm:mb-8">
              <button
                type="button"
                onClick={() => switchMode(false)}
                className="rounded-lg bg-gradient-to-r from-[#e9a875] to-[#bf7045] px-2 py-3 text-xs font-semibold text-[#21150e] shadow-lg transition sm:text-sm"
              >
                Citizen Login
              </button>

              <button
                type="button"
                onClick={onAdminLogin}
                className="rounded-lg px-2 py-3 text-xs font-semibold text-[#aaa095] transition hover:bg-white/5 hover:text-white sm:text-sm"
              >
                Admin Portal
              </button>
            </div>

            {/* Feedback messages */}
            {error && (
              <div className="mb-5 break-words rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {message && (
              <div className="mb-5 break-words rounded-xl border border-green-400/20 bg-green-500/10 p-3 text-sm text-green-300">
                {message}
              </div>
            )}

            {/* Authentication form */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">

              {isRegister && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#e4d9cb]">
                    Full name
                  </label>

                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    required
                    className="w-full rounded-xl border border-white/10 bg-[#12110e]/90 px-4 py-3.5 text-base text-white outline-none transition placeholder:text-[#777066] focus:border-[#d28a5b] focus:ring-2 focus:ring-[#d28a5b]/10 sm:py-4 sm:text-sm"
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-[#e4d9cb]">
                  Email address
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  className="w-full rounded-xl border border-white/10 bg-[#12110e]/90 px-4 py-3.5 text-base text-white outline-none transition placeholder:text-[#777066] focus:border-[#d28a5b] focus:ring-2 focus:ring-[#d28a5b]/10 sm:py-4 sm:text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#e4d9cb]">
                  Password
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                    minLength={6}
                    required
                    className="w-full rounded-xl border border-white/10 bg-[#12110e]/90 px-4 py-3.5 pr-16 text-base text-white outline-none transition placeholder:text-[#777066] focus:border-[#d28a5b] focus:ring-2 focus:ring-[#d28a5b]/10 sm:py-4 sm:text-sm"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#e6a16f] hover:text-[#f5c49c]"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {!isRegister && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[#b8afa2]">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMeState(e.target.checked)}
                      className="h-4 w-4 accent-[#d58b5c]"
                    />
                    Remember me
                  </label>

                  <span className="text-xs text-[#8e8478]">
                    Protected sign in
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#efb17f] via-[#dc8c5b] to-[#bd6d45] px-3 py-3.5 text-xs font-bold tracking-[1px] text-[#21150e] shadow-xl shadow-[#a54d29]/20 transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:py-4 sm:text-sm"
              >
                {loading
                  ? 'PLEASE WAIT...'
                  : isRegister
                    ? 'CREATE ACCOUNT'
                    : 'SIGN IN TO CIVICPULSE'}

                {!loading && (
                  <span className="text-lg transition-transform group-hover:translate-x-1">
                    →
                  </span>
                )}
              </button>
            </form>

            {/* Registration switch */}
            <div className="my-6 flex items-center gap-4 sm:my-7">
              <div className="h-px flex-1 bg-white/10" />

              <span className="text-[10px] uppercase tracking-[2px] text-[#92887c]">
                OR
              </span>

              <div className="h-px flex-1 bg-white/10" />
            </div>

            <button
              type="button"
              onClick={() => switchMode(!isRegister)}
              className="w-full rounded-xl border border-[#d28a5b]/40 bg-[#d28a5b]/[0.06] px-3 py-3.5 text-xs font-semibold text-[#e9b58e] transition hover:border-[#e9a16d] hover:bg-[#d28a5b]/[0.13] sm:text-sm"
            >
              {isRegister
                ? 'Already have an account? Sign in'
                : 'Create a Citizen Account'}
            </button>

            {/* Footer */}
            <div className="mt-7 border-t border-white/[0.08] pt-5 text-center sm:mt-8">
              <p className="text-[11px] leading-5 text-[#898176]">
                CivicPulse AI · Making every citizen voice count.
              </p>
            </div>
          </div>
        </section>

        {/* BRANDING - SECOND ON MOBILE */}
        <section className="order-2 flex flex-col justify-center pb-6 lg:order-1 lg:pb-0">

          {/* Brand logo */}
          <div className="mb-6 flex items-center gap-3 sm:mb-9 sm:gap-4">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-[#e6aa78]/50 bg-gradient-to-br from-[#edb17e] to-[#a95632] text-2xl font-black text-[#27160e] shadow-[0_0_35px_rgba(210,130,77,0.25)] sm:h-14 sm:w-14 sm:rounded-2xl sm:text-3xl">
              C
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#211a14] bg-[#f5c58f]" />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                CivicPulse <span className="text-[#e9a36e]">AI</span>
              </h1>

              <p className="mt-1 text-[9px] uppercase tracking-[2px] text-[#c3ad95] sm:text-[10px] sm:tracking-[3px]">
                Smarter Cities. Better Living.
              </p>
            </div>
          </div>

          {/* Information panels */}
          <div className="mb-6 grid max-w-xl grid-cols-3 gap-2 sm:mb-8 sm:gap-3">
            <div className="rounded-xl border border-[#d69b68]/20 bg-[#211b15]/75 p-3 backdrop-blur-xl sm:rounded-2xl sm:p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#b9a995] sm:text-xs">
                  Smart reporting
                </span>
                <span className="text-[#e6a16c]">✦</span>
              </div>

              <p className="mt-2 text-xl font-bold text-white sm:mt-3 sm:text-2xl">
                AI
              </p>

              <p className="mt-1 text-[9px] text-[#c69b75] sm:text-[10px]">
                Intelligent assistance
              </p>
            </div>

            <div className="rounded-xl border border-[#d69b68]/20 bg-[#211b15]/75 p-3 backdrop-blur-xl sm:rounded-2xl sm:p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#b9a995] sm:text-xs">
                  Live tracking
                </span>

                <span className="h-2 w-2 rounded-full bg-[#91a879] shadow-[0_0_10px_#91a879]" />
              </div>

              <p className="mt-2 text-xl font-bold text-white sm:mt-3 sm:text-2xl">
                24/7
              </p>

              <p className="mt-1 text-[9px] text-[#c69b75] sm:text-[10px]">
                Report visibility
              </p>
            </div>

            <div className="rounded-xl border border-[#d69b68]/20 bg-[#211b15]/75 p-3 backdrop-blur-xl sm:rounded-2xl sm:p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#b9a995] sm:text-xs">
                  Built for citizens
                </span>
                <span className="text-[#e6a16c]">◎</span>
              </div>

              <p className="mt-2 text-xl font-bold text-white sm:mt-3 sm:text-2xl">
                India
              </p>

              <p className="mt-1 text-[9px] text-[#c69b75] sm:text-[10px]">
                Community focused
              </p>
            </div>
          </div>

          {/* Main heading */}
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#d69b68]/30 bg-[#9b5d37]/15 px-3 py-2 backdrop-blur-md sm:mb-6 sm:gap-3 sm:px-5 sm:py-2.5">
              <span className="h-2 w-2 rounded-full bg-[#e7a16c] shadow-[0_0_12px_#e7a16c]" />

              <span className="text-[9px] font-semibold uppercase tracking-[1px] text-[#e8b78f] sm:text-xs sm:tracking-[2px]">
                Intelligent Civic Management
              </span>
            </div>

            <h2 className="text-4xl font-semibold leading-[1.12] tracking-tight text-white sm:text-6xl xl:text-7xl">
              A Smarter,
              <br />
              Cleaner,
              <br />
              <span className="bg-gradient-to-r from-[#f5c79f] via-[#e69b69] to-[#bc7048] bg-clip-text text-transparent">
                Better City.
              </span>
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-7 text-[#d0c4b5] sm:mt-6 sm:text-lg sm:leading-8">
              AI-powered civic reporting that connects citizens
              with their communities. Report problems, track
              resolutions, and help create meaningful change.
            </p>
          </div>

          {/* Feature cards */}
          <div className="mt-6 grid max-w-xl grid-cols-3 gap-2 sm:mt-9 sm:gap-5">
            {[
              { icon: '◎', title: 'Report', desc: 'Raise local issues' },
              { icon: '◷', title: 'Track', desc: 'Live progress' },
              { icon: '✦', title: 'Improve', desc: 'Make an impact' },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-white/10 bg-[#201c17]/65 p-3 backdrop-blur-md sm:rounded-2xl sm:p-4"
              >
                <span className="text-xl text-[#e8a16c] sm:text-2xl">
                  {item.icon}
                </span>

                <h3 className="mt-2 text-xs font-bold text-white sm:mt-3 sm:text-sm">
                  {item.title}
                </h3>

                <p className="mt-1 text-[9px] text-[#b7a998] sm:text-[11px]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-8 hidden text-[10px] uppercase tracking-[3px] text-[#a99a87] lg:block">
            Every voice matters. Every issue deserves attention.
          </p>
        </section>
      </div>
    </main>
  )
}

export default CitizenAuth
