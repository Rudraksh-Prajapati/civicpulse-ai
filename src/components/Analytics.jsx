
import { useEffect, useMemo, useState } from 'react'
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

const COLORS = [
  '#D28A5B',
  '#E9A16E',
  '#D6A75D',
  '#B76E43',
  '#A88B70',
  '#E6C49A',
  '#8D7967',
]

const normalize = (value) =>
  String(value || '').toLowerCase().trim()

function StatCard({ title, value, subtitle, icon }) {
  return (
    <article className="min-w-0 rounded-2xl border border-orange-500/10 bg-[#211d18] p-4 transition duration-200 hover:border-orange-400/30 sm:p-5">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <p className="break-words text-xs leading-5 text-stone-400 sm:text-sm">
          {title}
        </p>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 sm:h-10 sm:w-10">
          {icon}
        </div>
      </div>

      <h3 className="mt-4 break-words text-2xl font-bold text-white sm:mt-5 sm:text-3xl">
        {value}
      </h3>

      <p className="mt-2 break-words text-[10px] leading-5 text-stone-500 sm:text-xs">
        {subtitle}
      </p>
    </article>
  )
}

function Analytics({ city }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Fetch city-specific analytics
  useEffect(() => {
    let active = true

    const fetchAnalytics = async () => {
      setLoading(true)
      setError('')

      if (!city) {
        setReports([])
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('reports')
        .select('id, category, area, city, status, created_at')
        .eq('city', city)
        .order('created_at', { ascending: false })

      if (!active) return

      if (error) {
        setError(error.message)
        setReports([])
      } else {
        setReports(data || [])
      }

      setLoading(false)
    }

    fetchAnalytics()

    return () => {
      active = false
    }
  }, [city])

  // Calculate analytics
  const analytics = useMemo(() => {
    const now = new Date()

    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    )

    const lastWeek = new Date(today)
    lastWeek.setDate(today.getDate() - 6)

    const recentReports = reports.filter((report) => {
      const date = new Date(report.created_at)
      return date >= lastWeek && date <= now
    })

    const resolved = reports.filter((report) =>
      ['resolved', 'completed', 'closed'].includes(
        normalize(report.status)
      )
    ).length

    const pending = reports.filter((report) =>
      ['pending', 'submitted', 'open'].includes(
        normalize(report.status)
      )
    ).length

    const weeklyData = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(lastWeek)
      date.setDate(lastWeek.getDate() + index)

      const count = reports.filter((report) => {
        const reportDate = new Date(report.created_at)

        return (
          reportDate.getDate() === date.getDate() &&
          reportDate.getMonth() === date.getMonth() &&
          reportDate.getFullYear() === date.getFullYear()
        )
      }).length

      return {
        day: date.toLocaleDateString('en-IN', {
          weekday: 'short',
        }),
        reports: count,
      }
    })

    const categoryCounts = reports.reduce((acc, report) => {
      const category = report.category || 'Other'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {})

    const categoryData = Object.entries(categoryCounts)
      .map(([name, value], index) => ({
        name,
        value,
        color: COLORS[index % COLORS.length],
        percentage: reports.length
          ? Math.round((value / reports.length) * 100)
          : 0,
      }))
      .sort((a, b) => b.value - a.value)

    const areaCounts = reports.reduce((acc, report) => {
      const area = report.area || 'Area not specified'
      acc[area] = (acc[area] || 0) + 1
      return acc
    }, {})

    const hotspots = Object.entries(areaCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const busiestCategory = categoryData[0]

    const busiestDay = [...weeklyData].sort(
      (a, b) => b.reports - a.reports
    )[0]

    const resolutionRate = reports.length
      ? Math.round((resolved / reports.length) * 100)
      : 0

    return {
      recentReports,
      resolved,
      pending,
      weeklyData,
      categoryData,
      hotspots,
      busiestCategory,
      busiestDay,
      resolutionRate,
    }
  }, [reports])

  // Loading state
  if (loading) {
    return (
      <div className="mt-6 flex min-h-64 items-center justify-center rounded-2xl border border-orange-500/10 bg-[#211d18] p-6 sm:mt-8 sm:min-h-72">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-orange-500/20 border-t-orange-400" />

          <p className="mt-4 text-sm text-stone-400">
            Analyzing {city} civic data...
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="mt-6 break-words rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-sm leading-6 text-red-400 sm:mt-8 sm:p-6">
        Unable to load {city} analytics: {error}
      </div>
    )
  }

  return (
    <section className="mt-6 min-w-0 space-y-5 sm:mt-8 sm:space-y-6">

      {/* HEADER */}
      <header className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />

            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-orange-400 sm:text-xs sm:tracking-[0.2em]">
              Civic Intelligence Center
            </span>
          </div>

          <h2 className="mt-2 break-words text-2xl font-bold text-white sm:text-3xl">
            {city} Insights
          </h2>

          <p className="mt-1 text-xs leading-6 text-stone-400 sm:text-sm">
            Civic activity and complaint analysis for {city}.
          </p>
        </div>

        <div className="w-fit max-w-full rounded-xl border border-white/10 bg-[#211d18] px-3 py-2 text-[10px] text-stone-400 sm:px-4 sm:text-xs">
          <span className="mr-2 text-emerald-400">●</span>
          Live database snapshot
        </div>
      </header>

      {/* STATISTICS */}
      <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          title="Total Reports"
          value={reports.length.toLocaleString('en-IN')}
          subtitle={`All reports in ${city}`}
          icon="▤"
        />

        <StatCard
          title="Last 7 Days"
          value={analytics.recentReports.length}
          subtitle="Recently submitted reports"
          icon="◷"
        />

        <StatCard
          title="Resolved Issues"
          value={analytics.resolved}
          subtitle={`${analytics.resolutionRate}% resolution rate`}
          icon="✓"
        />

        <StatCard
          title="Pending Issues"
          value={analytics.pending}
          subtitle="Awaiting action or resolution"
          icon="◉"
        />
      </div>

      {/* CHARTS */}
      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-3">

        {/* WEEKLY ACTIVITY */}
        <article className="min-w-0 overflow-hidden rounded-2xl border border-orange-500/10 bg-[#211d18] p-4 sm:p-6 xl:col-span-2">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-white">
                Report Activity
              </h3>

              <p className="mt-1 text-[10px] leading-5 text-stone-500 sm:text-xs">
                Daily submissions over the last 7 days
              </p>
            </div>

            <span className="shrink-0 rounded-lg bg-orange-500/10 px-2.5 py-1.5 text-[10px] text-orange-400 sm:px-3 sm:text-xs">
              Weekly trend
            </span>
          </div>

          <div className="mt-5 h-56 min-w-0 sm:mt-6 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={analytics.weeklyData}
                margin={{
                  top: 8,
                  right: 8,
                  left: -18,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient
                    id="civicCopperGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#D28A5B"
                      stopOpacity={0.35}
                    />

                    <stop
                      offset="95%"
                      stopColor="#D28A5B"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  stroke="#393027"
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="day"
                  stroke="#8D8174"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                  minTickGap={8}
                />

                <YAxis
                  stroke="#8D8174"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tick={{ fontSize: 10 }}
                  width={35}
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: '#211d18',
                    border: '1px solid #5D4030',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="reports"
                  name="Reports"
                  stroke="#D28A5B"
                  strokeWidth={2.5}
                  fill="url(#civicCopperGradient)"
                  activeDot={{ r: 5, fill: '#E9A16E' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* CATEGORY DISTRIBUTION */}
        <article className="min-w-0 overflow-hidden rounded-2xl border border-orange-500/10 bg-[#211d18] p-4 sm:p-6">
          <h3 className="font-semibold text-white">
            Issue Categories
          </h3>

          <p className="mt-1 text-[10px] leading-5 text-stone-500 sm:text-xs">
            Distribution across reported issues
          </p>

          {analytics.categoryData.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-center text-sm text-stone-500 sm:h-64">
              No category data available.
            </div>
          ) : (
            <>
              <div className="relative mt-4 h-48 min-w-0 sm:h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.categoryData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="52%"
                      outerRadius="78%"
                      paddingAngle={4}
                      stroke="none"
                    >
                      {analytics.categoryData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={entry.color}
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#211d18',
                        border: '1px solid #5D4030',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {reports.length}
                  </span>

                  <span className="text-[10px] text-stone-500">
                    TOTAL
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-3">
                {analytics.categoryData.slice(0, 5).map((item) => (
                  <div
                    key={item.name}
                    className="flex min-w-0 items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex min-w-0 items-center gap-2 text-stone-400">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />

                      <span className="truncate">
                        {item.name}
                      </span>
                    </div>

                    <span className="shrink-0 font-semibold text-white">
                      {item.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </article>
      </div>

      {/* HOTSPOTS AND CIVIC SIGNALS */}
      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">

        {/* AREA HOTSPOTS */}
        <article className="min-w-0 overflow-hidden rounded-2xl border border-orange-500/10 bg-[#211d18] p-4 sm:p-6">
          <h3 className="font-semibold text-white">
            Area Hotspots
          </h3>

          <p className="mt-1 text-[10px] leading-5 text-stone-500 sm:text-xs">
            Areas with the most recorded reports
          </p>

          {analytics.hotspots.length === 0 ? (
            <p className="py-12 text-center text-sm text-stone-500">
              Location data is not available yet.
            </p>
          ) : (
            <div className="mt-6 space-y-5">
              {analytics.hotspots.map((item, index) => {
                const max = analytics.hotspots[0].count

                const percentage = Math.round(
                  (item.count / max) * 100
                )

                return (
                  <div key={item.name}>
                    <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-xs font-bold text-orange-400">
                          {index + 1}
                        </span>

                        <span className="min-w-0 break-words text-sm text-stone-300">
                          {item.name}
                        </span>
                      </div>

                      <span className="shrink-0 text-sm font-semibold text-white">
                        {item.count}
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-[#393027]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#A95632] to-[#E9A16E] transition-all duration-700"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </article>

        {/* CIVIC SIGNALS */}
        <article className="min-w-0 overflow-hidden rounded-2xl border border-orange-500/20 bg-gradient-to-br from-[#39261c] via-[#211d18] to-[#211d18] p-4 sm:p-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-xl text-orange-300">
              ✦
            </div>

            <div className="min-w-0">
              <h3 className="font-semibold text-white">
                Civic Signals
              </h3>

              <p className="break-words text-[10px] leading-5 text-orange-200/60 sm:text-xs">
                Observations from {city} report data
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3 sm:mt-6 sm:space-y-4">

            <div className="min-w-0 rounded-xl border border-white/[0.07] bg-black/20 p-3 sm:p-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-orange-300 sm:text-xs">
                Most reported category
              </p>

              <p className="mt-2 break-words text-base font-semibold text-white sm:text-lg">
                {analytics.busiestCategory?.name || 'Not enough data'}
              </p>

              <p className="mt-1 break-words text-xs leading-5 text-stone-400">
                {analytics.busiestCategory
                  ? `${analytics.busiestCategory.value} reports (${analytics.busiestCategory.percentage}% of total)`
                  : 'Submit reports to generate category insights.'}
              </p>
            </div>

            <div className="min-w-0 rounded-xl border border-white/[0.07] bg-black/20 p-3 sm:p-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-amber-300 sm:text-xs">
                Busiest reporting day
              </p>

              <p className="mt-2 break-words text-base font-semibold text-white sm:text-lg">
                {analytics.busiestDay?.reports > 0
                  ? analytics.busiestDay.day
                  : 'No activity yet'}
              </p>

              <p className="mt-1 break-words text-xs leading-5 text-stone-400">
                {analytics.busiestDay?.reports || 0} reports recorded on this day.
              </p>
            </div>

            <div className="min-w-0 rounded-xl border border-white/[0.07] bg-black/20 p-3 sm:p-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-300 sm:text-xs">
                Resolution performance
              </p>

              <p className="mt-2 text-base font-semibold text-white sm:text-lg">
                {analytics.resolutionRate}%
              </p>

              <p className="mt-1 break-words text-xs leading-5 text-stone-400">
                Share of reports marked resolved, completed or closed.
              </p>
            </div>

          </div>

          <p className="mt-4 text-[10px] leading-5 text-stone-500">
            These are descriptive statistics, not AI predictions.
          </p>
        </article>
      </div>
    </section>
  )
}

export default Analytics
