import { useState } from 'react'
import { supabase } from '../lib/supabase'

const ADMIN_ID = 'e6eebbc8-9037-4cc5-bae9-873a16f66e42'

function AdminLogin({ onLogin, onBack }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user.id !== ADMIN_ID) {
        await supabase.auth.signOut()
        throw new Error('Access denied. Admin account required.')
      }

      onLogin(data.user)
    } catch (err) {
      setError(err.message || 'Admin authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-[#171512] text-[#f6eee3]">

      {/* CITY BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">

        <div className="absolute inset-0 bg-gradient-to-b from-[#30251d] via-[#211b15] to-[#10110e]" />

        <div className="absolute -left-40 top-0 h-[450px] w-[450px] rounded-full bg-[#bd7043]/20 blur-[120px] sm:h-[650px] sm:w-[650px]" />

        <div className="absolute right-[10%] top-[5%] h-[300px] w-[300px] rounded-full bg-[#d39a5b]/15 blur-[100px] sm:h-[450px] sm:w-[450px] sm:blur-[130px]" />

        {/* Moon glow */}
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

        {/* Skyline */}
        <div className="absolute bottom-[20%] flex h-[35%] w-full items-end justify-around opacity-50 sm:h-[42%]">
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
          <div className="h-64 w-20 border border-[#c28a5a]/30 bg-gradient-to-b from-[#403328] to-[#191713]">
            <div className="grid grid-cols-3 gap-2 p-3">
              {Array.from({ length: 24 }).map((_, i) => (
                <span key={i} className="h-3 bg-[#e3aa70]/50" />
              ))}
            </div>
          </div>

          <div className="h-48 w-24 border border-[#c28a5a]/30 bg-gradient-to-b from-[#51402e] to-[#191713]">
            <div className="grid grid-cols-3 gap-2 p-3">
              {Array.from({ length: 18 }).map((_, i) => (
                <span key={i} className="h-3 bg-[#e3aa70]/40" />
              ))}
            </div>
          </div>

          <div className="h-72 w-16 border border-[#c28a5a]/30 bg-gradient-to-b from-[#51402e] to-[#191713]">
            <div className="grid grid-cols-2 gap-2 p-2">
              {Array.from({ length: 24 }).map((_, i) => (
                <span key={i} className="h-3 bg-[#e3aa70]/40" />
              ))}
            </div>
          </div>
        </div>

        {/* Elevated road */}
        <div className="absolute bottom-[17%] left-[-5%] h-5 w-[110%] -rotate-2 border-y border-[#d19a66]/40 bg-[#29231c] shadow-[0_0_35px_rgba(199,127,76,0.2)]" />

        {/* Street lights */}
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

        <div className="absolute bottom-0 h-[15%] w-full bg-gradient-to-b from-[#171712] to-[#0b0d0a]" />

        {/* Final overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#15130f]/65 via-[#17140f]/30 to-[#15130f]/75" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#10110e]/90 via-transparent to-[#171512]/25" />
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 pb-8 pt-20 sm:px-6 sm:py-12">

        {/* Back navigation */}
        <button
          type="button"
          onClick={onBack}
          className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-[#d69b68]/25 bg-[#211b15]/75 px-4 py-2.5 text-xs font-medium text-[#d6b89b] backdrop-blur-xl transition hover:border-[#e6a16c]/60 hover:text-white sm:left-10 sm:top-7 sm:px-5 sm:py-3 sm:text-sm"
        >
          <span className="text-lg">←</span>
          Citizen Login
        </button>

        {/* Branding */}
        <div className="mb-6 mt-2 flex items-center gap-3 sm:mb-8 sm:mt-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#e6aa78]/50 bg-gradient-to-br from-[#edb17e] to-[#a95632] text-2xl font-black text-[#27160e] shadow-[0_0_35px_rgba(210,130,77,0.25)] sm:h-12 sm:w-12">
            C
          </div>

          <div>
            <h1 className="text-xl font-bold text-white">
              CivicPulse <span className="text-[#e9a36e]">AI</span>
            </h1>
            <p className="text-[9px] uppercase tracking-[3px] text-[#c3ad95]">
              Administration Portal
            </p>
          </div>
        </div>

        {/* Admin card */}
        <div className="w-full max-w-[460px] rounded-2xl border border-[#e3ad82]/25 bg-[#211d18]/95 p-5 shadow-[0_30px_100px_rgba(0,0,0,0.65)] backdrop-blur-2xl sm:rounded-[30px] sm:p-10">

          {/* Security icon */}
          <div className="mb-5 flex justify-center sm:mb-7">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-[22px] border border-[#e3ad82]/30 bg-gradient-to-br from-[#b9754c]/25 to-[#563a27]/30 shadow-[0_0_40px_rgba(207,130,78,0.12)] sm:h-20 sm:w-20 sm:rounded-[25px]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-9 w-9 text-[#e9a16e] sm:h-10 sm:w-10"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="m9 12 2 2 4-4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#211d18] bg-[#91a879]" />
            </div>
          </div>

          {/* Heading */}
          <div className="mb-6 text-center sm:mb-8">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[3px] text-[#e4a477]">
              RESTRICTED ACCESS
            </p>

            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-4xl">
              Admin Portal
            </h2>

            <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[#aaa095]">
              Authorized administrators can sign in to manage civic reports,
              monitor operations, and oversee city services.
            </p>
          </div>

          {/* Security notice */}
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-[#d69b68]/20 bg-[#d69b68]/[0.07] p-3 sm:mb-7 sm:p-4">
            <span className="text-xl text-[#e6a16c]">◆</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#e9b58e]">
                Secure administrator access
              </p>
              <p className="mt-1 text-[10px] leading-4 text-[#a99b8a]">
                Only authorized admin accounts are permitted.
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 break-words rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Login form */}
          <form onSubmit={handleLogin} className="space-y-5">

            <div>
              <label className="mb-2 block text-sm font-medium text-[#e4d9cb]">
                Administrator email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                autoComplete="username"
                required
                className="w-full min-w-0 rounded-xl border border-white/10 bg-[#12110e]/90 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-[#777066] focus:border-[#d28a5b] focus:ring-2 focus:ring-[#d28a5b]/10 sm:py-4"
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
                  placeholder="Enter administrator password"
                  autoComplete="current-password"
                  required
                  className="w-full min-w-0 rounded-xl border border-white/10 bg-[#12110e]/90 px-4 py-3.5 pr-16 text-sm text-white outline-none transition placeholder:text-[#777066] focus:border-[#d28a5b] focus:ring-2 focus:ring-[#d28a5b]/10 sm:py-4"
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

            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#efb17f] via-[#dc8c5b] to-[#bd6d45] py-3.5 text-sm font-bold tracking-[1px] text-[#21150e] shadow-xl shadow-[#a54d29]/20 transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:py-4"
            >
              {loading ? 'VERIFYING ACCESS...' : 'SIGN IN AS ADMIN'}
              {!loading && (
                <span className="text-lg transition-transform group-hover:translate-x-1">
                  →
                </span>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-7 border-t border-white/[0.08] pt-5 text-center sm:mt-8 sm:pt-6">
            <div className="flex items-center justify-center gap-2 text-[#a99b8a]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#91a879]" />
              <span className="text-[9px] uppercase tracking-[1.5px] sm:text-[10px] sm:tracking-[2px]">
                Protected Administration Area
              </span>
            </div>

            <p className="mt-4 text-[11px] text-[#777066]">
              CivicPulse AI · Authorized Personnel Only
            </p>
          </div>
        </div>

        <p className="mt-7 text-center text-[9px] uppercase tracking-[2px] text-[#9d8e7d] sm:mt-8 sm:text-[10px] sm:tracking-[3px]">
          Intelligent Civic Management System
        </p>
      </div>
    </main>
  )
}

export default AdminLogin