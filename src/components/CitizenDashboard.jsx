
import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { supabase } from '../lib/supabase'
import Notifications from './Notifications'

const INTELLIGENCE_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#A78BFA',
  '#06B6D4',
  '#EC4899',
  '#64748B',
]

function CitizenDashboard({ user, onNavigate }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [cityIntelligence, setCityIntelligence] = useState(null)
  const [intelligenceLoading, setIntelligenceLoading] = useState(true)
  const [intelligenceError, setIntelligenceError] = useState('')

  const fetchReports = async () => {
    if (!user?.id) return

    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setReports(data || [])
    } catch (err) {
      console.error('Citizen dashboard error:', err)
      setError(err.message || 'Unable to load your reports.')
    } finally {
      setLoading(false)
    }
  }

  const fetchCityIntelligence = async () => {
    setIntelligenceLoading(true)
    setIntelligenceError('')

    try {
      const { data, error } = await supabase.rpc(
        'get_civic_intelligence'
      )

      if (error) throw error

      setCityIntelligence(data)
    } catch (err) {
      console.error('City intelligence error:', err)
      setIntelligenceError(err.message || 'Unable to load city intelligence.')
    } finally {
      setIntelligenceLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id) {
      fetchReports()
    }
  }, [user?.id])

  useEffect(() => {
    fetchCityIntelligence()
  }, [])

  const pending = reports.filter(
    (report) => report.status?.toLowerCase() === 'pending'
  ).length

  const inProgress = reports.filter(
    (report) => report.status?.toLowerCase() === 'in progress'
  ).length

  const resolved = reports.filter(
    (report) =>
      ['resolved', 'completed', 'closed'].includes(
        report.status?.toLowerCase()
      )
  ).length

  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'Citizen'

  const stats = [
    {
      title: 'Total Reports',
      value: reports.length,
      icon: '📋',
      color: 'text-blue-400',
    },
    {
      title: 'Pending',
      value: pending,
      icon: '⏳',
      color: 'text-amber-400',
    },
    {
      title: 'In Progress',
      value: inProgress,
      icon: '🔄',
      color: 'text-sky-400',
    },
    {
      title: 'Resolved',
      value: resolved,
      icon: '✓',
      color: 'text-emerald-400',
    },
  ]

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'resolved':
      case 'completed':
      case 'closed':
        return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'

      case 'in progress':
        return 'border-blue-500/20 bg-blue-500/10 text-blue-400'

      default:
        return 'border-amber-500/20 bg-amber-500/10 text-amber-400'
    }
  }

  const formatDate = (date) => {
    if (!date) return 'Date unavailable'

    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <main className="min-h-screen min-w-0 flex-1 bg-slate-950 px-5 py-8 text-white md:px-8">
      <div className="mx-auto w-full max-w-7xl">

        {/* HEADER */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium tracking-wider text-blue-400">
              CITIZEN PORTAL
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Welcome back, {firstName} 👋
            </h1>

            <p className="mt-2 text-slate-400">
              Track your civic reports and help make your city better.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Notifications user={user} onNavigate={onNavigate} />

            <button
              onClick={() => onNavigate('Report an Issue')}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              + Report an Issue
            </button>
          </div>
        </div>

        {/* PERSONAL STATISTICS */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.title}
              className="rounded-2xl border border-white/10 bg-slate-900 p-5 transition hover:border-blue-500/30"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  {stat.title}
                </p>

                <span className="text-xl">{stat.icon}</span>
              </div>

              <h2 className={`mt-4 text-3xl font-bold ${stat.color}`}>
                {loading ? '—' : stat.value}
              </h2>

              <p className="mt-2 text-xs text-slate-500">
                Your account activity
              </p>
            </div>
          ))}
        </div>

        {/* PERSONAL REPORT PROGRESS - FULL WIDTH */}
        <section className="mb-8 rounded-2xl border border-white/10 bg-slate-900 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">
              Report Progress
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Overview of your submitted issues
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-slate-400">
              Loading report progress...
            </p>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  label: 'Pending',
                  count: pending,
                  color: 'bg-amber-400',
                  textColor: 'text-amber-400',
                },
                {
                  label: 'In Progress',
                  count: inProgress,
                  color: 'bg-blue-400',
                  textColor: 'text-blue-400',
                },
                {
                  label: 'Resolved',
                  count: resolved,
                  color: 'bg-emerald-400',
                  textColor: 'text-emerald-400',
                },
              ].map((item) => {
                const percentage = reports.length
                  ? (item.count / reports.length) * 100
                  : 0

                return (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm text-slate-300">
                        {item.label}
                      </span>

                      <span className={`text-sm font-semibold ${item.textColor}`}>
                        {item.count} reports
                      </span>
                    </div>

                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${item.color}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <p className="mt-2 text-right text-xs text-slate-500">
                      {Math.round(percentage)}%
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* CITY INTELLIGENCE CENTER */}
        <section className="mb-8 space-y-6">

          {/* SECTION HEADER */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />

                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
                  Public Data Intelligence
                </p>
              </div>

              <h2 className="mt-2 text-2xl font-bold text-white">
                City Intelligence Center
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Understand civic issues across your city.
              </p>
            </div>

            <span className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-xs text-cyan-300">
              City-wide statistics
            </span>
          </div>

          {intelligenceLoading ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-10 text-center text-slate-400">
              Loading city intelligence...
            </div>
          ) : intelligenceError ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-400">
              Unable to load city intelligence: {intelligenceError}
            </div>
          ) : cityIntelligence ? (
            <>
              {/* CITY STATISTICS */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    title: 'City Reports',
                    value: cityIntelligence.total_reports ?? 0,
                    icon: '▤',
                    color: 'text-blue-400',
                  },
                  {
                    title: 'Pending',
                    value: cityIntelligence.pending ?? 0,
                    icon: '◷',
                    color: 'text-amber-400',
                  },
                  {
                    title: 'In Progress',
                    value: cityIntelligence.in_progress ?? 0,
                    icon: '↻',
                    color: 'text-cyan-400',
                  },
                  {
                    title: 'Resolved',
                    value: cityIntelligence.resolved ?? 0,
                    icon: '✓',
                    color: 'text-emerald-400',
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/[0.07] bg-[#111827] p-5 transition hover:border-blue-500/30"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-400">
                        {item.title}
                      </p>

                      <span className={`text-xl ${item.color}`}>
                        {item.icon}
                      </span>
                    </div>

                    <h3 className={`mt-4 text-3xl font-bold ${item.color}`}>
                      {Number(item.value).toLocaleString('en-IN')}
                    </h3>

                    <p className="mt-2 text-xs text-slate-500">
                      City-wide recorded data
                    </p>
                  </div>
                ))}
              </div>

              {/* CITY CHARTS */}
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

                {/* WEEKLY ACTIVITY */}
                <div className="min-w-0 rounded-2xl border border-white/[0.07] bg-[#111827] p-5 sm:p-6 xl:col-span-2">
                  <h3 className="font-semibold text-white">
                    City Report Activity
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Report submissions during the last seven days
                  </p>

                  <div className="mt-6 h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cityIntelligence.weekly_activity || []}>
                        <defs>
                          <linearGradient
                            id="cityActivityGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                          </linearGradient>
                        </defs>

                        <CartesianGrid
                          stroke="#263449"
                          strokeDasharray="3 3"
                          vertical={false}
                        />

                        <XAxis
                          dataKey="day"
                          stroke="#64748B"
                          tickLine={false}
                          axisLine={false}
                        />

                        <YAxis
                          stroke="#64748B"
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                        />

                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0B1220',
                            border: '1px solid #263449',
                            borderRadius: '12px',
                            color: '#fff',
                          }}
                        />

                        <Area
                          type="monotone"
                          dataKey="reports"
                          name="Reports"
                          stroke="#06B6D4"
                          strokeWidth={3}
                          fill="url(#cityActivityGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* CATEGORY DISTRIBUTION */}
                <div className="min-w-0 rounded-2xl border border-white/[0.07] bg-[#111827] p-5 sm:p-6">
                  <h3 className="font-semibold text-white">
                    Issue Distribution
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    City-wide issue categories
                  </p>

                  {cityIntelligence.category_counts?.length > 0 ? (
                    <>
                      <div className="mt-4 h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={cityIntelligence.category_counts}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={58}
                              outerRadius={88}
                              paddingAngle={4}
                              stroke="none"
                            >
                              {cityIntelligence.category_counts.map((item, index) => (
                                <Cell
                                  key={item.name}
                                  fill={
                                    INTELLIGENCE_COLORS[
                                      index % INTELLIGENCE_COLORS.length
                                    ]
                                  }
                                />
                              ))}
                            </Pie>

                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#0B1220',
                                border: '1px solid #263449',
                                borderRadius: '12px',
                                color: '#fff',
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="space-y-3">
                        {cityIntelligence.category_counts.slice(0, 5).map((item, index) => (
                          <div
                            key={item.name}
                            className="flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex min-w-0 items-center gap-2 text-slate-400">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{
                                  backgroundColor:
                                    INTELLIGENCE_COLORS[
                                      index % INTELLIGENCE_COLORS.length
                                    ],
                                }}
                              />

                              <span className="truncate">{item.name}</span>
                            </div>

                            <span className="font-semibold text-white">
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="py-16 text-center text-sm text-slate-500">
                      No category data available.
                    </p>
                  )}
                </div>
              </div>

              {/* CIVIC ISSUE HOTSPOTS */}
              <div className="rounded-2xl border border-white/[0.07] bg-[#111827] p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white">
                      Civic Issue Hotspots
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Locations with repeated reported issues
                    </p>
                  </div>

                  <span className="rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs text-rose-400">
                    Top affected areas
                  </span>
                </div>

                {cityIntelligence.area_hotspots?.length > 0 ? (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {cityIntelligence.area_hotspots.map((item, index) => (
                      <div
                        key={`${item.city}-${item.area}`}
                        className="min-w-0 rounded-xl border border-white/[0.06] bg-slate-950 p-5 transition hover:border-rose-500/30"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">
                            HOTSPOT 0{index + 1}
                          </span>

                          <span className="text-lg text-rose-400">⌖</span>
                        </div>

                        <h4 className="mt-4 break-words font-semibold text-white">
                          {item.area}
                        </h4>

                        <p className="mt-1 truncate text-xs text-slate-500">
                          {item.city}
                        </p>

                        <p className="mt-4 text-3xl font-bold text-rose-400">
                          {item.reports}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Recorded reports
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-10 text-center text-sm text-slate-500">
                    No areas have reached the minimum hotspot threshold yet.
                  </p>
                )}
              </div>

              <p className="text-right text-[10px] text-slate-600">
                Aggregated statistics only · Individual citizen reports remain private
              </p>
            </>
          ) : null}
        </section>

        {/* RECENT PERSONAL REPORTS */}
        <section className="rounded-2xl border border-white/10 bg-slate-900 p-5 md:p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                Recent Reports
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Your latest submitted civic issues
              </p>
            </div>

            <button
              onClick={() => onNavigate('My Reports')}
              className="text-sm font-medium text-blue-400 hover:text-blue-300"
            >
              View All →
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {loading ? (
            <p className="py-8 text-center text-sm text-slate-400">
              Loading your reports...
            </p>
          ) : !error && reports.length === 0 ? (
            <div className="py-10 text-center">
              <div className="mb-3 text-4xl">📋</div>

              <h3 className="font-semibold">No reports yet</h3>

              <p className="mt-2 text-sm text-slate-400">
                Your submitted reports will appear here.
              </p>

              <button
                onClick={() => onNavigate('Report an Issue')}
                className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500"
              >
                Report Your First Issue
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.slice(0, 5).map((report) => (
                <div
                  key={report.id}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-white/5 bg-slate-950 p-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-blue-400">
                      {report.id}
                    </p>

                    <h3 className="mt-1 truncate font-medium text-white">
                      {report.title}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      {report.category} · {report.area}, {report.city}
                      {' · '}
                      {formatDate(report.created_at)}
                    </p>
                  </div>

                  <span
                    className={`w-fit shrink-0 rounded-full border px-3 py-1 text-xs ${getStatusStyle(report.status)}`}
                  >
                    {report.status || 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* REFRESH BUTTONS */}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            onClick={fetchCityIntelligence}
            disabled={intelligenceLoading}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-400 transition hover:border-cyan-500/30 hover:text-cyan-400 disabled:opacity-50"
          >
            ↻ Refresh City Data
          </button>

          <button
            onClick={fetchReports}
            disabled={loading}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-400 transition hover:text-white disabled:opacity-50"
          >
            ↻ Refresh My Reports
          </button>
        </div>

      </div>
    </main>
  )
}

export default CitizenDashboard
