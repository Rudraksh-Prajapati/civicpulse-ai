
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const ADMIN_ID = 'e6eebbc8-9037-4cc5-bae9-873a16f66e42'

function MyReports({ selectedReportId }) {
  const [reports, setReports] = useState([])
  const [statusHistory, setStatusHistory] = useState({})
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [realtimeStatus, setRealtimeStatus] = useState('Connecting')

  const fetchHistory = async (reportIds, isActive = () => true) => {
    if (!reportIds.length) {
      if (isActive()) setStatusHistory({})
      return
    }

    const { data, error: historyError } = await supabase
      .from('report_status_history')
      .select('*')
      .in('report_id', reportIds)
      .order('changed_at', { ascending: true })

    if (historyError) {
      console.error('Status history error:', historyError.message)
      return
    }

    if (!isActive()) return

    const grouped = {}

    ;(data || []).forEach((item) => {
      if (!grouped[item.report_id]) grouped[item.report_id] = []
      grouped[item.report_id].push(item)
    })

    setStatusHistory((previous) => ({
      ...previous,
      ...grouped,
    }))
  }

  const fetchReports = async (isActive = () => true, knownUser = null) => {
    setLoading(true)
    setError('')

    try {
      let user = knownUser

      if (!user) {
        const {
          data: { user: currentUser },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) throw userError
        user = currentUser
      }

      if (!isActive()) return

      if (!user) {
        setReports([])
        setStatusHistory({})
        setError('Please log in to view your reports.')
        return
      }

      let query = supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })

      if (user.id !== ADMIN_ID) {
        query = query.eq('user_id', user.id)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      if (!isActive()) return

      const reportData = data || []
      setReports(reportData)

      await fetchHistory(
        reportData.map((report) => String(report.id)),
        isActive
      )
    } catch (err) {
      console.error('My Reports error:', err)

      if (isActive()) {
        setError(err.message || 'Unable to load reports.')
      }
    } finally {
      if (isActive()) setLoading(false)
    }
  }

  // Realtime subscriptions
  useEffect(() => {
    let isMounted = true
    let channel = null

    const setupRealtime = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (!isMounted) return
        if (userError) throw userError

        if (!user) {
          setReports([])
          setError('Please log in to view your reports.')
          setLoading(false)
          setRealtimeStatus('Disconnected')
          return
        }

        channel = supabase.channel(
          `my-reports-${user.id}-${Date.now()}`
        )

        const reportConfig = {
          event: '*',
          schema: 'public',
          table: 'reports',
        }

        if (user.id !== ADMIN_ID) {
          reportConfig.filter = `user_id=eq.${user.id}`
        }

        channel
          .on('postgres_changes', reportConfig, async (payload) => {
            if (!isMounted) return

            if (payload.eventType === 'INSERT') {
              setReports((previous) => [
                payload.new,
                ...previous.filter(
                  (report) => report.id !== payload.new.id
                ),
              ])

              await fetchHistory(
                [String(payload.new.id)],
                () => isMounted
              )
            }

            if (payload.eventType === 'UPDATE') {
              setReports((previous) =>
                previous.map((report) =>
                  report.id === payload.new.id
                    ? { ...report, ...payload.new }
                    : report
                )
              )

              await fetchHistory(
                [String(payload.new.id)],
                () => isMounted
              )
            }

            if (payload.eventType === 'DELETE') {
              const deletedId = String(payload.old.id)

              setReports((previous) =>
                previous.filter(
                  (report) => report.id !== payload.old.id
                )
              )

              setStatusHistory((previous) => {
                const updated = { ...previous }
                delete updated[deletedId]
                return updated
              })
            }
          })
          .subscribe((status, err) => {
            if (!isMounted) return

            console.log('My Reports Realtime:', status)

            if (status === 'SUBSCRIBED') {
              setRealtimeStatus('Connected')
            } else if (
              status === 'CHANNEL_ERROR' ||
              status === 'TIMED_OUT' ||
              status === 'CLOSED'
            ) {
              setRealtimeStatus('Disconnected')
              if (err) console.error('Realtime error:', err)
            }
          })

        await fetchReports(() => isMounted, user)
      } catch (err) {
        console.error('Realtime setup error:', err)

        if (isMounted) {
          setError(err.message || 'Unable to connect to your reports.')
          setLoading(false)
          setRealtimeStatus('Disconnected')
        }
      }
    }

    setupRealtime()

    return () => {
      isMounted = false

      if (channel) {
        supabase.removeChannel(channel)
        channel = null
      }
    }
  }, [])

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const searchText = search.toLowerCase()

      const matchesSearch = [
        report.title,
        report.id,
        report.area,
        report.city,
      ].some((value) =>
        String(value || '').toLowerCase().includes(searchText)
      )

      const matchesCategory =
        category === 'All' || report.category === category

      return matchesSearch && matchesCategory
    })
  }, [reports, search, category])

  const pendingCount = reports.filter(
    (report) => report.status === 'Pending'
  ).length

  const resolvedCount = reports.filter(
    (report) => report.status === 'Resolved'
  ).length

  const criticalCount = reports.filter(
    (report) => report.priority === 'Critical'
  ).length

  const formatDate = (date) => {
    if (!date) return 'Date unavailable'

    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  useEffect(() => {
    if (!selectedReportId || reports.length === 0) return

    const selectedReport = reports.find(
      (report) => String(report.id) === String(selectedReportId)
    )

    if (selectedReport) {
      setCategory('All')
      setSearch(String(selectedReport.id))
    }
  }, [selectedReportId, reports])

  const formatDateTime = (date) => {
    if (!date) return 'Time unavailable'

    return new Date(date).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Resolved':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'In Progress':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
      default:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    }
  }

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'Critical':
        return 'text-red-400'
      case 'High':
        return 'text-orange-400'
      case 'Medium':
        return 'text-amber-400'
      default:
        return 'text-emerald-400'
    }
  }

  const getHistoryConfig = (status) => {
    switch (status) {
      case 'Resolved':
        return {
          icon: '✓',
          text: 'text-emerald-400',
          border: 'border-emerald-500/30',
          label: 'Successfully resolved',
        }

      case 'In Progress':
        return {
          icon: '↻',
          text: 'text-orange-400',
          border: 'border-orange-500/30',
          label: 'Work is in progress',
        }

      default:
        return {
          icon: '◷',
          text: 'text-amber-400',
          border: 'border-amber-500/30',
          label: 'Awaiting action',
        }
    }
  }

  const cardClass =
    'min-w-0 rounded-2xl border border-white/10 bg-[#191919] p-4 shadow-lg shadow-black/10 sm:p-5'

  return (
    <main className="min-h-screen min-w-0 flex-1 bg-[#101010] px-3 py-5 text-white sm:px-5 sm:py-7 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-7xl min-w-0">

        {/* Header */}
        <div className="mb-6 flex min-w-0 flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400 sm:text-sm">
              Citizen Dashboard
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              My Reports
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
              Track and manage the civic issues you have reported.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  realtimeStatus === 'Connected'
                    ? 'bg-emerald-400'
                    : realtimeStatus === 'Connecting'
                      ? 'animate-pulse bg-amber-400'
                      : 'bg-red-400'
                }`}
              />

              <span
                className={
                  realtimeStatus === 'Connected'
                    ? 'text-emerald-400'
                    : realtimeStatus === 'Connecting'
                      ? 'text-amber-400'
                      : 'text-red-400'
                }
              >
                {realtimeStatus === 'Connected'
                  ? 'Live updates connected'
                  : realtimeStatus === 'Connecting'
                    ? 'Connecting to live updates...'
                    : 'Live updates disconnected'}
              </span>
            </div>
          </div>

          <button
            onClick={() => fetchReports()}
            disabled={loading}
            className="w-full shrink-0 rounded-xl border border-white/10 bg-[#191919] px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-orange-500/50 hover:text-orange-300 disabled:opacity-50 sm:w-auto"
          >
            {loading ? 'Refreshing...' : '↻ Refresh Reports'}
          </button>
        </div>

        {/* Statistics */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:gap-4 xl:grid-cols-4">
          <div className={cardClass}>
            <p className="text-xs text-slate-400 sm:text-sm">Total Reports</p>
            <h2 className="mt-2 text-2xl font-bold sm:mt-3 sm:text-3xl">
              {reports.length}
            </h2>
            <p className="mt-2 text-[11px] text-slate-500 sm:text-xs">
              Your submitted reports
            </p>
          </div>

          <div className={cardClass}>
            <p className="text-xs text-slate-400 sm:text-sm">Pending</p>
            <h2 className="mt-2 text-2xl font-bold text-amber-400 sm:mt-3 sm:text-3xl">
              {pendingCount}
            </h2>
            <p className="mt-2 text-[11px] text-slate-500 sm:text-xs">
              Awaiting action
            </p>
          </div>

          <div className={cardClass}>
            <p className="text-xs text-slate-400 sm:text-sm">Resolved</p>
            <h2 className="mt-2 text-2xl font-bold text-emerald-400 sm:mt-3 sm:text-3xl">
              {resolvedCount}
            </h2>
            <p className="mt-2 text-[11px] text-slate-500 sm:text-xs">
              Successfully resolved
            </p>
          </div>

          <div className={cardClass}>
            <p className="text-xs text-slate-400 sm:text-sm">Critical Issues</p>
            <h2 className="mt-2 text-2xl font-bold text-red-400 sm:mt-3 sm:text-3xl">
              {criticalCount}
            </h2>
            <p className="mt-2 text-[11px] text-slate-500 sm:text-xs">
              High-priority attention
            </p>
          </div>
        </div>

        {/* Search and filters */}
        <div className="mb-6 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[1fr_220px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by report ID, title, city or area..."
            className="min-w-0 rounded-xl border border-white/10 bg-[#191919] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full min-w-0 rounded-xl border border-white/10 bg-[#191919] px-4 py-3.5 text-sm text-white outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
          >
            <option value="All">All Categories</option>
            <option value="Roads">Roads</option>
            <option value="Water Supply">Water Supply</option>
            <option value="Sanitation">Sanitation</option>
            <option value="Electricity">Electricity</option>
            <option value="Streetlights">Streetlights</option>
            <option value="Drainage">Drainage</option>
            <option value="Public Safety">Public Safety</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 break-words rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm leading-relaxed text-red-400">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-[#191919] p-10 text-center text-sm text-slate-400 sm:p-12">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-orange-500/20 border-t-orange-500" />
            Loading your reports...
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#191919] p-8 text-center sm:p-12">
            <div className="mb-4 text-4xl">📋</div>

            <h3 className="text-lg font-semibold sm:text-xl">
              No reports found
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
              {reports.length === 0
                ? 'You have not submitted any reports yet.'
                : 'Try changing your search or category filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => {
              const history = statusHistory[String(report.id)] || []

              return (
                <article
                  key={report.id}
                  className={`min-w-0 overflow-hidden rounded-2xl border p-4 transition sm:p-5 ${
                    String(report.id) === String(selectedReportId)
                      ? 'border-orange-400 bg-orange-500/[0.06] ring-2 ring-orange-500/20'
                      : 'border-white/10 bg-[#191919] hover:border-orange-500/30'
                  }`}
                >
                  {/* Report details */}
                  <div className="flex min-w-0 flex-col gap-4 sm:gap-5 md:flex-row">
                    {report.image_url && (
                      <a
                        href={report.image_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block h-44 w-full shrink-0 overflow-hidden rounded-xl bg-[#111111] sm:h-52 md:h-40 md:w-48"
                      >
                        <img
                          src={report.image_url}
                          alt={report.title || 'Report attachment'}
                          className="h-full w-full object-cover transition duration-300 hover:scale-105"
                        />
                      </a>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="break-all text-xs font-medium text-orange-400">
                            {report.id}
                          </p>

                          <h3 className="mt-1 break-words text-base font-semibold leading-snug sm:text-lg">
                            {report.title || 'Untitled report'}
                          </h3>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium sm:text-xs ${getStatusStyle(report.status)}`}
                        >
                          {report.status || 'Pending'}
                        </span>
                      </div>

                      <p className="mt-3 break-words text-sm leading-6 text-slate-400">
                        {report.description || 'No description provided.'}
                      </p>

                      <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-slate-400 sm:grid-cols-2">
                        <span className="break-words">
                          📂 {report.category || 'Uncategorized'}
                        </span>

                        <span className="break-words">
                          📍 {report.area || 'Area unavailable'}, {report.city || 'City unavailable'}
                        </span>

                        <span>
                          📅 {formatDate(report.created_at)}
                        </span>

                        <span className={getPriorityStyle(report.priority)}>
                          ● {report.priority || 'Medium'} Priority
                        </span>
                      </div>

                      {report.latitude != null && report.longitude != null && (
                        <a
                          href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 inline-flex min-h-9 items-center text-xs font-medium text-orange-400 transition hover:text-orange-300"
                        >
                          View reported location ↗
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Complaint progress timeline */}
                  <div className="mt-5 border-t border-white/10 pt-5 sm:mt-6 sm:pt-6">
                    <div className="mb-5 flex min-w-0 items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-white">
                          <span className="text-orange-400">◷</span>
                          Complaint Progress
                        </h4>

                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                          Track every update to your complaint
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-1 text-[10px] font-medium text-orange-400 sm:px-3 sm:text-xs">
                        {history.length} Updates
                      </span>
                    </div>

                    {history.length === 0 ? (
                      <div className="rounded-xl border border-white/5 bg-[#111111] p-4 text-center sm:p-5">
                        <p className="text-xs leading-relaxed text-slate-400 sm:text-sm">
                          No status updates available yet.
                        </p>
                      </div>
                    ) : (
                      <div className="relative ml-1 sm:ml-2">
                        {history.map((item, index) => {
                          const config = getHistoryConfig(item.new_status)
                          const isLatest = index === history.length - 1

                          return (
                            <div
                              key={item.id}
                              className="relative flex min-w-0 gap-3 pb-5 last:pb-0 sm:gap-4 sm:pb-7"
                            >
                              <div className="relative flex w-8 shrink-0 justify-center sm:w-9">
                                {index !== history.length - 1 && (
                                  <div className="absolute top-8 bottom-0 w-px bg-gradient-to-b from-slate-600 to-slate-800 sm:top-9" />
                                )}

                                <div
                                  className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border bg-white/[0.03] ${config.border} ${config.text} sm:h-9 sm:w-9`}
                                >
                                  <span className="text-sm font-bold sm:text-base">
                                    {config.icon}
                                  </span>
                                </div>
                              </div>

                              <div
                                className={`min-w-0 flex-1 rounded-xl border p-3 transition sm:p-4 ${
                                  isLatest
                                    ? 'border-orange-500/25 bg-orange-500/[0.04]'
                                    : 'border-white/5 bg-[#111111]'
                                }`}
                              >
                                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                                  <h5 className={`break-words text-xs font-semibold sm:text-sm ${config.text}`}>
                                    {item.old_status
                                      ? `${item.old_status} → ${item.new_status}`
                                      : `Complaint submitted: ${item.new_status}`}
                                  </h5>

                                  {isLatest && (
                                    <span className="shrink-0 rounded-full bg-orange-500/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-orange-400 sm:text-[10px]">
                                      Latest Update
                                    </span>
                                  )}
                                </div>

                                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                                  {config.label}
                                </p>

                                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 sm:text-xs">
                                  <span>◷</span>
                                  <span>{formatDateTime(item.changed_at)}</span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {/* Results count */}
        <p className="mt-6 break-words text-center text-xs text-slate-500">
          Showing {filteredReports.length} of {reports.length} reports
        </p>
      </div>
    </main>
  )
}

export default MyReports
