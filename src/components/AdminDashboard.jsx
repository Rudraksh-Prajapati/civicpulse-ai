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
  BarChart,
  Bar,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { generateCivicInsights } from '../lib/ai'

const COLORS = ['#3B82F6', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#F43F5E']

const SLA_HOURS = {
  Critical: 3,
  High: 12,
  Medium: 24,
  Low: 72,
}

const statusStyles = {
  Pending: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  'In Progress': 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  Resolved: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
}

const priorityStyles = {
  Low: 'text-slate-400 bg-slate-400/10',
  Medium: 'text-blue-400 bg-blue-400/10',
  High: 'text-orange-400 bg-orange-400/10',
  Critical: 'text-red-400 bg-red-400/10',
}

function AdminDashboard() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [activeTab, setActiveTab] = useState('Overview')
  const [aiInsights, setAiInsights] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [currentTime, setCurrentTime] = useState(Date.now())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [])

  async function fetchReports() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setReports(data || [])

    setLoading(false)
  }

  useEffect(() => {
    fetchReports()

    const channel = supabase
      .channel('admin-live-reports')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reports',
        },
        (payload) => {
          console.log('LIVE DATABASE EVENT:', payload.eventType, payload.new)

          if (payload.eventType === 'INSERT') {
            setReports(previous => [
              payload.new,
              ...previous.filter(report => report.id !== payload.new.id),
            ])
          }

          if (payload.eventType === 'UPDATE') {
            setReports(previous =>
              previous.map(report =>
                report.id === payload.new.id
                  ? { ...report, ...payload.new }
                  : report
              )
            )
          }

          if (payload.eventType === 'DELETE') {
            setReports(previous =>
              previous.filter(report => report.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe((status, err) => {
        console.log('CivicPulse Realtime status:', status)
        if (err) console.error('Realtime error:', err)
      })

    return () => supabase.removeChannel(channel)
  }, [])

  const updateReport = async (id, field, value) => {
    setUpdatingId(id)
    setError('')

    const previousReport = reports.find(report => report.id === id)
    const oldValue = previousReport?.[field] ?? ''

    const { error: updateError } = await supabase
      .from('reports')
      .update({ [field]: value })
      .eq('id', id)

    if (updateError) {
      setError(updateError.message)
      setUpdatingId(null)
      return
    }

    setReports(previous =>
      previous.map(report =>
        report.id === id ? { ...report, [field]: value } : report
      )
    )

    console.log('AUDIT LOG: Starting insert', {
      reportId: id,
      field,
      oldValue,
      newValue: value,
    })

    const { error: logError } = await supabase
      .from('admin_activity_logs')
      .insert({
        report_id: String(id),
        action: field === 'status' ? 'STATUS_UPDATED' : 'PRIORITY_UPDATED',
        old_value: String(oldValue),
        new_value: String(value),
        admin_id: 'e6eebbc8-9037-4cc5-bae9-873a16f66e42',
      })

    console.log('AUDIT LOG RESULT:', { logError })

    if (logError) {
      console.error('Audit log error:', logError.message)
      setError(`Report updated, but activity logging failed: ${logError.message}`)
    } else {
      console.log('AUDIT LOG SUCCESS!')
    }

    setUpdatingId(null)
  }

  const handleGenerateInsights = async () => {
    setAiLoading(true)
    setAiError('')
    setAiInsights(null)

    try {
      const safeReports = reports.map(report => ({
        status: report.status,
        priority: report.priority,
        category: report.category,
        city: report.city,
        area: report.area,
      }))

      const result = await generateCivicInsights(safeReports)
      setAiInsights(result)
    } catch (err) {
      setAiError(err.message || 'Unable to generate AI insights.')
    } finally {
      setAiLoading(false)
    }
  }

  const getSLAInfo = (report) => {
    const hours = SLA_HOURS[report.priority] || SLA_HOURS.Medium
    const createdAt = new Date(report.created_at).getTime()
    const deadline = createdAt + hours * 60 * 60 * 1000
    const remaining = deadline - currentTime
    const isResolved = report.status === 'Resolved'
    const overdue = !isResolved && remaining <= 0

    const atRisk =
      !isResolved &&
      !overdue &&
      remaining <= hours * 60 * 60 * 1000 * 0.25

    const elapsedHours = Math.max(
      0,
      (currentTime - createdAt) / (1000 * 60 * 60)
    )

    const ageScore = Math.min((elapsedHours / hours) * 60, 60)

    const priorityScore = {
      Critical: 40,
      High: 30,
      Medium: 20,
      Low: 10,
    }[report.priority] || 20

    const urgencyScore = isResolved
      ? 0
      : Math.min(100, Math.round(priorityScore + ageScore))

    return {
      hours,
      deadline,
      remaining,
      overdue,
      urgencyScore,
      isResolved,
      atRisk,
    }
  }

  const formatRemainingTime = (milliseconds) => {
    const absolute = Math.abs(milliseconds)
    const hours = Math.floor(absolute / (1000 * 60 * 60))
    const minutes = Math.floor(
      (absolute % (1000 * 60 * 60)) / (1000 * 60)
    )

    return milliseconds < 0
      ? `${hours}h ${minutes}m overdue`
      : `${hours}h ${minutes}m remaining`
  }

  const stats = useMemo(() => {
    const total = reports.length
    const pending = reports.filter(r => r.status === 'Pending').length
    const inProgress = reports.filter(r => r.status === 'In Progress').length
    const resolved = reports.filter(r => r.status === 'Resolved').length
    const critical = reports.filter(r => r.priority === 'Critical').length

    return {
      total,
      pending,
      inProgress,
      resolved,
      critical,
      resolutionRate: total ? Math.round((resolved / total) * 100) : 0,
    }
  }, [reports])

  const categoryData = useMemo(() => {
    const counts = {}

    reports.forEach(report => {
      const category = report.category || 'Other'
      counts[category] = (counts[category] || 0) + 1
    })

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [reports])

  const weeklyData = useMemo(() => {
    const days = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)

      const key = date.toLocaleDateString('en-CA')

      const count = reports.filter(report => {
        if (!report.created_at) return false
        return new Date(report.created_at).toLocaleDateString('en-CA') === key
      }).length

      days.push({
        day: date.toLocaleDateString('en-IN', { weekday: 'short' }),
        reports: count,
      })
    }

    return days
  }, [reports])

  const hotspots = useMemo(() => {
    const areas = {}

    reports.forEach(report => {
      const area = [report.area, report.city].filter(Boolean).join(', ')
      if (!area) return
      areas[area] = (areas[area] || 0) + 1
    })

    return Object.entries(areas)
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [reports])

  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const query = search.toLowerCase()

      const matchesSearch = [
        report.id,
        report.title,
        report.city,
        report.area,
        report.category,
        report.description,
      ].some(value =>
        String(value || '').toLowerCase().includes(query)
      )

      const matchesStatus =
        statusFilter === 'All' || report.status === statusFilter

      const matchesPriority =
        priorityFilter === 'All' || report.priority === priorityFilter

      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [reports, search, statusFilter, priorityFilter])

  const statCards = [
    {
      label: 'Total Reports',
      value: stats.total,
      icon: '▤',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      detail: 'All submitted complaints',
    },
    {
      label: 'Pending Issues',
      value: stats.pending,
      icon: '◷',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      detail: 'Awaiting action',
    },
    {
      label: 'In Progress',
      value: stats.inProgress,
      icon: '◈',
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
      detail: 'Currently being handled',
    },
    {
      label: 'Resolved Issues',
      value: stats.resolved,
      icon: '✓',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      detail: 'Successfully completed',
    },
  ]

  const tabs = ['Overview', 'Reports', 'Analytics']

  return (
    <main className="relative min-w-0 flex-1 min-h-screen overflow-x-hidden bg-[radial-gradient(ellipse_at_top_left,_rgba(37,99,235,0.16),_transparent_38%),radial-gradient(ellipse_at_top_right,_rgba(6,182,212,0.10),_transparent_32%),#080D19] px-3 py-5 text-white sm:px-5 sm:py-7 lg:px-8 lg:py-8">
      <header className="mb-6 flex min-w-0 flex-col justify-between gap-4 sm:mb-8 sm:gap-5 xl:flex-row xl:items-center">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
              CivicPulse Intelligence Platform
            </span>
          </div>

          <h1 className="break-words text-2xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Operations
            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent">
              {' '}Command Center
            </span>
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            Monitor civic activity, investigate issues and manage city operations.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <div className="w-full rounded-xl border border-white/10 bg-[#111A2B] px-4 py-3 sm:w-auto">
            <p className="text-xs text-slate-500">SYSTEM STATUS</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-medium text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Operational
            </p>
          </div>

          <button
            onClick={fetchReports}
            disabled={loading}
            className="w-full rounded-xl border border-blue-500/30 bg-blue-500/10 px-5 py-3 text-sm font-semibold text-blue-300 transition hover:bg-blue-500/20 disabled:opacity-50 sm:w-auto"
          >
            {loading ? 'Refreshing...' : '↻ Refresh Data'}
          </button>
        </div>
      </header>

      <div className="mb-6 flex min-w-0 gap-2 overflow-x-auto border-b border-white/10 pb-3 sm:mb-7">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 whitespace-nowrap rounded-lg px-4 py-2.5 text-xs font-medium transition sm:px-5 sm:text-sm ${
              activeTab === tab
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25 ring-1 ring-blue-300/20'
                : 'border border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            {tab === 'Overview' ? '◫ ' : tab === 'Reports' ? '▤ ' : '▥ '}
            {tab}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-[#111A2B] p-16 text-center text-slate-400">
          Loading command center data...
        </div>
      ) : (
        <>
          {activeTab === 'Overview' && (
            <>
              <section className="mb-6 grid min-w-0 grid-cols-2 gap-3 sm:mb-7 sm:gap-4 xl:grid-cols-4">
                {statCards.map(stat => (
                  <div
                    key={stat.label}
                    className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#17243A]/95 via-[#111C30]/95 to-[#0B1424] p-4 shadow-lg shadow-black/20 transition-all duration-300 sm:p-6 hover:-translate-y-1 hover:border-blue-400/40 hover:shadow-xl hover:shadow-blue-500/10"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-400">{stat.label}</p>
                      <span className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-110 ${stat.bg} ${stat.color}`}>
                        {stat.icon}
                      </span>
                    </div>
                    <h2 className="mt-5 text-3xl font-bold tracking-tight">
                      {stat.value.toLocaleString('en-IN')}
                    </h2>
                    <p className="mt-2 text-xs text-slate-500">{stat.detail}</p>
                  </div>
                ))}
              </section>

              <section className="mb-6 grid min-w-0 gap-4 sm:mb-7 sm:gap-5 xl:grid-cols-3">
                <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#152238] to-[#0D1729] p-4 shadow-xl sm:p-6 shadow-black/20 transition-all duration-300 hover:border-blue-500/25 xl:col-span-2">
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">Civic Activity</h2>
                      <p className="mt-1 text-xs text-slate-500">
                        Reports submitted over the last seven days
                      </p>
                    </div>
                    <span className="rounded-lg bg-blue-500/10 px-3 py-2 text-xs text-blue-400">
                      Last 7 days
                    </span>
                  </div>

                  <div className="h-56 w-full sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weeklyData}>
                        <defs>
                          <linearGradient id="adminActivity" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#253149" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="day" stroke="#64748B" tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} stroke="#64748B" tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ background: '#111A2B', border: '1px solid #334155', borderRadius: 12, color: '#fff' }} />
                        <Area type="monotone" dataKey="reports" stroke="#3B82F6" strokeWidth={3} fill="url(#adminActivity)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#152238] to-[#0D1729] p-4 shadow-xl sm:p-6 shadow-black/20 transition-all duration-300 hover:border-blue-500/25">
                  <h2 className="font-semibold">Resolution Performance</h2>
                  <p className="mt-1 text-xs text-slate-500">Resolved reports / all reports</p>

                  <div className="relative mx-auto mt-7 h-48 w-full max-w-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Resolved', value: stats.resolved },
                            { name: 'Remaining', value: Math.max(stats.total - stats.resolved, 0) },
                          ]}
                          dataKey="value"
                          innerRadius={65}
                          outerRadius={85}
                          paddingAngle={4}
                          stroke="none"
                        >
                          <Cell fill="#10B981" />
                          <Cell fill="#263449" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold">{stats.resolutionRate}%</span>
                      <span className="mt-1 text-xs text-slate-500">Resolved</span>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-between border-t border-white/10 pt-4 text-sm">
                    <span className="text-slate-400">Resolved</span>
                    <span className="font-semibold text-emerald-400">{stats.resolved}</span>
                  </div>
                  <div className="mt-3 flex justify-between text-sm">
                    <span className="text-slate-400">Unresolved</span>
                    <span className="font-semibold text-slate-300">{stats.total - stats.resolved}</span>
                  </div>
                </div>
              </section>

              <section className="mb-6 grid min-w-0 gap-4 sm:mb-7 sm:gap-5 xl:grid-cols-2">
                <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#152238] via-[#111C30] to-[#0D1729] p-6 shadow-xl shadow-black/20 transition-all duration-300 hover:border-blue-500/25">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold">Issue Categories</h2>
                      <p className="mt-1 text-xs text-slate-500">Distribution by complaint type</p>
                    </div>
                    <span className="text-xs text-slate-500">{categoryData.length} categories</span>
                  </div>

                  {categoryData.length === 0 ? (
                    <p className="py-12 text-center text-sm text-slate-500">No category data available.</p>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={90} innerRadius={55} paddingAngle={3}>
                            {categoryData.map((entry, index) => (
                              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ background: '#111A2B', border: '1px solid #334155', borderRadius: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="mt-2 grid grid-cols-2 gap-3">
                    {categoryData.slice(0, 6).map((item, index) => (
                      <div key={item.name} className="flex items-center gap-2 text-xs">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="truncate text-slate-400">{item.name}</span>
                        <span className="ml-auto font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#152238] via-[#111C30] to-[#0D1729] p-6 shadow-xl shadow-black/20 transition-all duration-300 hover:border-blue-500/25">
                  <div className="mb-5">
                    <h2 className="font-semibold">Geographic Hotspots</h2>
                    <p className="mt-1 text-xs text-slate-500">Areas with the highest report counts</p>
                  </div>

                  {hotspots.length === 0 ? (
                    <p className="py-12 text-center text-sm text-slate-500">No location data available.</p>
                  ) : (
                    <div className="space-y-5">
                      {hotspots.map(item => (
                        <div key={item.area}>
                          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                            <span className="truncate text-slate-300">{item.area}</span>
                            <span className="shrink-0 font-semibold text-blue-400">{item.count} reports</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400"
                              style={{ width: `${Math.max((item.count / hotspots[0].count) * 100, 3)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {(() => {
                const activeReports = reports.filter(r => r.status !== 'Resolved')
                const overdueReports = activeReports.filter(r => getSLAInfo(r).overdue)

                const urgentReports = activeReports
                  .map(report => ({ ...report, sla: getSLAInfo(report) }))
                  .sort((a, b) => b.sla.urgencyScore - a.sla.urgencyScore)
                  .slice(0, 5)

                return (
                  <section className="relative mb-6 min-w-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#17243A] via-[#111C30] to-[#0B1424] p-6 shadow-xl shadow-black/20">
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl text-orange-400">◷</span>
                          <h2 className="text-lg font-bold">SLA & Escalation Center</h2>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Monitor deadlines and identify complaints requiring attention.
                        </p>
                      </div>
                      <span className="rounded-lg border border-orange-400/20 bg-orange-400/10 px-3 py-2 text-xs text-orange-300">
                        {overdueReports.length} overdue
                      </span>
                    </div>

                    <div className="mb-6 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-white/5 bg-[#0B1424] p-4">
                        <p className="text-xs text-slate-500">Active Complaints</p>
                        <p className="mt-2 text-2xl font-bold">{activeReports.length}</p>
                      </div>

                      <div className="rounded-xl border border-red-500/15 bg-red-500/5 p-4">
                        <p className="text-xs text-slate-500">Overdue Complaints</p>
                        <p className="mt-2 text-2xl font-bold text-red-400">{overdueReports.length}</p>
                      </div>

                      <div className="rounded-xl border border-orange-500/15 bg-orange-500/5 p-4">
                        <p className="text-xs text-slate-500">Critical Priority</p>
                        <p className="mt-2 text-2xl font-bold text-orange-400">
                          {activeReports.filter(r => r.priority === 'Critical').length}
                        </p>
                      </div>
                    </div>

                    <h3 className="mb-3 text-sm font-semibold text-slate-300">
                      Highest Urgency Complaints
                    </h3>

                    {urgentReports.length === 0 ? (
                      <p className="rounded-xl bg-[#0B1424] p-6 text-center text-sm text-slate-500">
                        No active complaints to monitor.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {urgentReports.map(report => (
                          <div key={report.id} className="rounded-xl border border-white/5 bg-[#0B1424] p-4">
                            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{report.title}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {report.city || 'Unknown city'}
                                  {report.area ? ` · ${report.area}` : ''}
                                  {' · '}
                                  {report.priority || 'Medium'} priority
                                </p>
                              </div>

                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                report.sla.overdue
                                  ? 'bg-red-500/10 text-red-400'
                                  : report.sla.atRisk
                                    ? 'bg-orange-500/10 text-orange-400'
                                    : 'bg-emerald-500/10 text-emerald-400'
                              }`}>
                                {report.sla.overdue
                                  ? 'OVERDUE'
                                  : report.sla.atRisk
                                    ? 'AT RISK'
                                    : 'ON TRACK'}
                              </span>
                            </div>

                            <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs">
                              <span className={report.sla.overdue ? 'text-red-400' : 'text-slate-400'}>
                                {formatRemainingTime(report.sla.remaining)}
                              </span>
                              <span className="text-slate-500">
                                Target: {report.sla.hours} hours
                              </span>
                            </div>

                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                              <div
                                className={`h-full rounded-full ${
                                  report.sla.overdue ? 'bg-red-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${report.sla.urgencyScore}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="mt-5 border-t border-white/5 pt-4 text-[11px] leading-5 text-slate-500">
                      SLA targets: Critical 3h · High 12h · Medium 24h · Low 72h.
                      Deadlines are calculated from report submission time.
                      Urgency scores are rule-based estimates, not AI predictions.
                    </p>
                  </section>
                )
              })()}

              <section className="mb-6 grid min-w-0 gap-4 sm:mb-7 sm:gap-5 md:grid-cols-2">
                <div className="group rounded-2xl border border-red-400/20 bg-gradient-to-br from-red-500/15 via-[#172033] to-[#0B1424] p-6 shadow-xl shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:border-red-400/40">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/15 text-xl text-red-400">!</span>
                    <div>
                      <h3 className="font-semibold">Critical Issues</h3>
                      <p className="text-xs text-slate-400">Reports marked as critical priority</p>
                    </div>
                  </div>
                  <p className="mt-5 text-4xl font-bold text-red-400">{stats.critical}</p>
                  <p className="mt-2 text-xs text-slate-500">Review these reports for urgent action.</p>
                  <button
                    onClick={() => {
                      setPriorityFilter('Critical')
                      setActiveTab('Reports')
                    }}
                    className="mt-5 rounded-lg border border-red-400/20 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-400/10"
                  >
                    Review critical reports →
                  </button>
                </div>

                <div className="group rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/15 via-[#17243A] to-[#0B1424] p-6 shadow-xl shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:border-blue-400/40">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/15 text-xl text-blue-400">✦</span>
                    <div>
                      <h3 className="font-semibold">Civic Intelligence</h3>
                      <p className="text-xs text-slate-400">Operational indicators from submitted reports</p>
                    </div>
                  </div>
                  <div className="mt-5 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Most reported category</span>
                      <span className="font-medium text-blue-300">{categoryData[0]?.name || 'No data'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Highest report area</span>
                      <span className="max-w-[55%] truncate font-medium text-blue-300">{hotspots[0]?.area || 'No data'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Resolution rate</span>
                      <span className="font-medium text-emerald-400">{stats.resolutionRate}%</span>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-slate-500">These indicators are calculated from report records, not AI predictions.</p>
                </div>
              </section>

              <section className="relative mb-6 min-w-0 overflow-hidden rounded-2xl border border-blue-400/25 bg-gradient-to-br from-[#172B4A] via-[#111D33] to-[#0A1425] shadow-2xl shadow-blue-950/30">
                <div className="flex flex-col justify-between gap-5 border-b border-white/10 p-5 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-2xl text-blue-400">
                      ✦
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
                        Powered by Gemini AI
                      </p>
                      <h2 className="mt-1 text-xl font-bold">AI Civic Intelligence</h2>
                      <p className="mt-1 text-xs text-slate-400">
                        Analyze complaint patterns and generate administrative recommendations.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateInsights}
                    disabled={aiLoading || reports.length === 0}
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {aiLoading ? '✦ Analyzing Reports...' : '✦ Generate AI Insights'}
                  </button>
                </div>

                <div className="p-4 sm:p-5">
                  {!aiInsights && !aiLoading && !aiError && (
                    <div className="py-8 text-center">
                      <div className="text-4xl text-blue-400">✧</div>
                      <h3 className="mt-3 font-semibold">Ready to analyze civic activity</h3>
                      <p className="mx-auto mt-2 max-w-lg text-sm text-slate-400">
                        Generate an AI-powered report to identify complaint patterns,
                        operational priorities and areas that may need attention.
                      </p>
                    </div>
                  )}

                  {aiLoading && (
                    <div className="py-10 text-center">
                      <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-blue-400/20 border-t-blue-400" />
                      <p className="mt-4 text-sm text-blue-300">
                        Gemini is analyzing your civic reports...
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        This may take a few seconds.
                      </p>
                    </div>
                  )}

                  {aiError && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                      {aiError}
                    </div>
                  )}

                  {aiInsights && (
                    <div className="space-y-6">
                      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                          Executive Summary
                        </p>
                        <p className="mt-3 text-sm leading-7 text-slate-200">
                          {aiInsights.executive_summary}
                        </p>
                      </div>

                      <div>
                        <h3 className="mb-4 font-semibold">Key AI Insights</h3>
                        <div className="grid gap-3 md:grid-cols-2">
                          {(aiInsights.key_insights || []).map((item, index) => (
                            <div key={index} className="rounded-xl border border-white/10 bg-[#0B1424] p-4">
                              <div className="flex items-center justify-between gap-3">
                                <h4 className="text-sm font-semibold">{item.title}</h4>
                                <span className="shrink-0 rounded-full bg-amber-400/10 px-2.5 py-1 text-[10px] text-amber-400">
                                  {item.severity || 'Info'}
                                </span>
                              </div>
                              <p className="mt-2 text-sm leading-6 text-slate-400">
                                {item.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="mb-4 font-semibold">Recommended Actions</h3>
                        <div className="space-y-3">
                          {(aiInsights.recommendations || []).map((item, index) => (
                            <div key={index} className="flex gap-3 rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                                {index + 1}
                              </span>
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-sm font-semibold">{item.title}</h4>
                                  <span className="text-[10px] text-emerald-400">
                                    {item.priority || 'Normal'} Priority
                                  </span>
                                </div>
                                <p className="mt-2 text-sm leading-6 text-slate-400">
                                  {item.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="mb-4 font-semibold">Areas Requiring Attention</h3>
                        {(aiInsights.risk_areas || []).length === 0 ? (
                          <p className="text-sm text-slate-500">No specific areas identified.</p>
                        ) : (
                          <div className="grid gap-3 md:grid-cols-2">
                            {aiInsights.risk_areas.map((item, index) => (
                              <div key={index} className="rounded-xl border border-orange-500/15 bg-orange-500/5 p-4">
                                <p className="text-sm font-semibold text-orange-300">
                                  {item.location}
                                </p>
                                <p className="mt-2 text-sm leading-6 text-slate-400">
                                  {item.reason}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <p className="border-t border-white/10 pt-4 text-xs text-slate-500">
                        AI-generated recommendations are decision-support suggestions.
                        Administrators should verify findings before taking action.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section className="min-w-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#152238] via-[#111C30] to-[#0B1424] shadow-xl shadow-black/20">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
                  <div>
                    <h2 className="font-semibold">Latest Reports</h2>
                    <p className="mt-1 text-xs text-slate-500">Most recently submitted civic issues</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('Reports')}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300"
                  >
                    View all reports →
                  </button>
                </div>

                {reports.slice(0, 5).map(report => (
                  <div key={report.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 p-4 last:border-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{report.title || 'Untitled report'}</p>
                      <p className="mt-1 text-xs text-slate-500">{report.category} · {report.city}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs ${statusStyles[report.status] || statusStyles.Pending}`}>
                      {report.status || 'Pending'}
                    </span>
                  </div>
                ))}

                {reports.length === 0 && (
                  <p className="p-8 text-center text-sm text-slate-500">No reports yet.</p>
                )}
              </section>
            </>
          )}

          {activeTab === 'Reports' && (
            <section>
              <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                  <h2 className="text-xl font-bold">Report Management</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Investigate complaints and manage their status and priority.
                  </p>
                </div>
                <span className="rounded-lg border border-white/10 bg-[#111A2B] px-4 py-2 text-sm text-slate-400">
                  {filteredReports.length} matching reports
                </span>
              </div>

              <div className="mb-5 grid min-w-0 gap-3 lg:grid-cols-3">
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search ID, title, city, area..."
                  className="w-full min-w-0 rounded-xl border border-white/10 bg-[#152238] px-4 py-3 text-sm text-white shadow-inner shadow-black/10 outline-none transition-all duration-200 placeholder:text-slate-500 hover:border-white/20 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                />

                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full min-w-0 rounded-xl border border-white/10 bg-[#111A2B] px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                >
                  <option value="All">All statuses</option>
                  <option>Pending</option>
                  <option>In Progress</option>
                  <option>Resolved</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={e => setPriorityFilter(e.target.value)}
                  className="w-full min-w-0 rounded-xl border border-white/10 bg-[#111A2B] px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                >
                  <option value="All">All priorities</option>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
              </div>

              {filteredReports.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#111A2B] p-8 text-center text-sm text-slate-400 sm:p-14">
                  No reports match your filters.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReports.map(report => (
                    <article
                      key={report.id}
                      className="group min-w-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#152238] via-[#111C30] to-[#0B1424] shadow-lg shadow-black/20 transition-all duration-300 hover:border-blue-400/30 hover:shadow-xl hover:shadow-blue-500/5"
                    >
                      <div className="p-4 sm:p-5">
                        <div className="flex flex-col gap-5 xl:flex-row xl:justify-between">
                          <div className="flex min-w-0 flex-col gap-4 sm:flex-row">
                            {report.image_url && (
                              <a href={report.image_url} target="_blank" rel="noreferrer" className="h-32 w-full shrink-0 overflow-hidden rounded-xl border border-white/10 sm:w-40">
                                <img src={report.image_url} alt={report.title || 'Report attachment'} className="h-full w-full object-cover transition hover:scale-105" />
                              </a>
                            )}

                            <div className="min-w-0">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold text-blue-400">{report.id}</span>
                                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${priorityStyles[report.priority] || priorityStyles.Medium}`}>
                                  {report.priority || 'Medium'} Priority
                                </span>
                              </div>

                              <h3 className="break-words text-base font-semibold sm:text-lg">{report.title || 'Untitled report'}</h3>
                              <p className="mt-1 text-sm text-slate-400">
                                {report.category || 'Uncategorized'} · {report.city || 'Unknown city'}
                                {report.area ? `, ${report.area}` : ''}
                              </p>

                              <p className="mt-3 max-w-3xl break-words text-sm leading-6 text-slate-300">
                                {report.description || 'No description provided.'}
                              </p>

                              <p className="mt-3 text-xs text-slate-500">
                                Submitted: {report.created_at ? new Date(report.created_at).toLocaleString('en-IN') : 'Unknown'}
                              </p>

                              {report.latitude != null && report.longitude != null && (
                                <a
                                  href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-3 inline-block text-xs font-medium text-blue-400 hover:text-blue-300"
                                >
                                  View GPS Location ↗
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="grid min-w-0 shrink-0 gap-3 sm:grid-cols-2 xl:w-56 xl:grid-cols-1">
                            <div>
                              <label className="mb-2 block text-xs text-slate-400">Report Status</label>
                              <select
                                value={report.status || 'Pending'}
                                disabled={updatingId === report.id}
                                onChange={e => updateReport(report.id, 'status', e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-[#080D19] px-3 py-3 text-sm text-white outline-none focus:border-blue-500 disabled:opacity-50"
                              >
                                <option>Pending</option>
                                <option>In Progress</option>
                                <option>Resolved</option>
                              </select>
                            </div>

                            <div>
                              <label className="mb-2 block text-xs text-slate-400">Priority Level</label>
                              <select
                                value={report.priority || 'Medium'}
                                disabled={updatingId === report.id}
                                onChange={e => updateReport(report.id, 'priority', e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-[#080D19] px-3 py-3 text-sm text-white outline-none focus:border-blue-500 disabled:opacity-50"
                              >
                                <option>Low</option>
                                <option>Medium</option>
                                <option>High</option>
                                <option>Critical</option>
                              </select>
                            </div>

                            {updatingId === report.id && (
                              <p className="text-xs text-blue-400 sm:col-span-2 xl:col-span-1">
                                Saving changes...
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'Analytics' && (
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-bold">Advanced Analytics</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Explore trends and patterns calculated from civic reports.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                <div className="rounded-2xl border border-white/10 bg-[#111A2B] p-5">
                  <p className="text-sm text-slate-400">Resolution Rate</p>
                  <p className="mt-3 text-3xl font-bold text-emerald-400">{stats.resolutionRate}%</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#111A2B] p-5">
                  <p className="text-sm text-slate-400">Critical Reports</p>
                  <p className="mt-3 text-3xl font-bold text-red-400">{stats.critical}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#111A2B] p-5">
                  <p className="text-sm text-slate-400">Tracked Categories</p>
                  <p className="mt-3 text-3xl font-bold text-blue-400">{categoryData.length}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#111A2B] p-5">
                <h3 className="font-semibold">Category Comparison</h3>
                <p className="mt-1 text-xs text-slate-500">Number of reports by category</p>

                {categoryData.length === 0 ? (
                  <p className="py-12 text-center text-sm text-slate-500">No category data available.</p>
                ) : (
                  <div className="mt-5 h-64 sm:mt-6 sm:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                        <CartesianGrid stroke="#253149" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748B" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={55} />
                        <YAxis allowDecimals={false} stroke="#64748B" tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ background: '#111A2B', border: '1px solid #334155', borderRadius: 12 }} />
                        <Bar dataKey="value" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#111A2B] p-5">
                <h3 className="font-semibold">Seven-Day Report Trend</h3>
                <p className="mt-1 text-xs text-slate-500">Daily report submissions</p>

                <div className="mt-5 h-60 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyData}>
                      <defs>
                        <linearGradient id="analyticsActivity" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#253149" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="day" stroke="#64748B" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} stroke="#64748B" tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: '#111A2B', border: '1px solid #334155', borderRadius: 12 }} />
                      <Area type="monotone" dataKey="reports" stroke="#8B5CF6" strokeWidth={3} fill="url(#analyticsActivity)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Analytics are calculated from the reports currently returned by Supabase.
                Trends are descriptive, not predictions.
              </p>
            </section>
          )}
        </>
      )}
    </main>
  )
}

export default AdminDashboard