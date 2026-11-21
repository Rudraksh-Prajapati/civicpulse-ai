
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

function CityReports({ city }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')

  // Fetch reports for the selected city
  const fetchReports = useCallback(async (showLoading = true) => {
    if (!city) {
      setReports([])
      setLoading(false)
      return
    }

    if (showLoading) setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('public_reports')
      .select(
        'id, title, category, description, city, area, priority, status, created_at, image_url'
      )
      .eq('city', city)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('City reports error:', error.message)
      setError(error.message)
      setReports([])
    } else {
      setReports(data || [])
    }

    setLoading(false)
  }, [city])

  // Initial loading and city changes
  useEffect(() => {
    let active = true

    const loadReports = async () => {
      if (!city) {
        setReports([])
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      const { data, error } = await supabase
        .from('public_reports')
        .select(
          'id, title, category, description, city, area, priority, status, created_at, image_url'
        )
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

    loadReports()

    return () => {
      active = false
    }
  }, [city])

  // Realtime updates
  useEffect(() => {
    if (!city) return

    const channel = supabase
      .channel(`public-city-reports-${city}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reports',
        },
        () => {
          fetchReports(false)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [city, fetchReports])

  // Dynamic categories
  const categories = useMemo(() => {
    return [
      'All',
      ...new Set(
        reports.map((report) => report.category).filter(Boolean)
      ),
    ]
  }, [reports])

  // Search and filtering
  const filteredReports = useMemo(() => {
    const term = search.toLowerCase().trim()

    return reports.filter((report) => {
      const matchesSearch =
        !term ||
        report.title?.toLowerCase().includes(term) ||
        report.area?.toLowerCase().includes(term) ||
        report.description?.toLowerCase().includes(term) ||
        String(report.id).toLowerCase().includes(term)

      const matchesStatus =
        statusFilter === 'All' ||
        report.status?.toLowerCase() === statusFilter.toLowerCase()

      const matchesCategory =
        categoryFilter === 'All' ||
        report.category === categoryFilter

      return matchesSearch && matchesStatus && matchesCategory
    })
  }, [reports, search, statusFilter, categoryFilter])

  // Status counts
  const getCount = (status) =>
    reports.filter(
      (report) =>
        report.status?.toLowerCase() === status.toLowerCase()
    ).length

  const stats = [
    {
      label: 'Total Reports',
      value: reports.length,
      icon: '▤',
      color: 'text-orange-400',
    },
    {
      label: 'Pending',
      value: getCount('Pending'),
      icon: '◷',
      color: 'text-amber-400',
    },
    {
      label: 'In Progress',
      value: getCount('In Progress'),
      icon: '↗',
      color: 'text-orange-400',
    },
    {
      label: 'Resolved',
      value: getCount('Resolved'),
      icon: '✓',
      color: 'text-emerald-400',
    },
  ]

  const getStatusStyle = (status) => {
    const styles = {
      pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      'in progress':
        'bg-orange-500/10 text-orange-400 border-orange-500/20',
      resolved:
        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
    }

    return (
      styles[status?.toLowerCase()] ||
      'bg-stone-500/10 text-stone-400 border-stone-500/20'
    )
  }

  const getPriorityStyle = (priority) => {
    const styles = {
      Critical: 'text-red-400',
      High: 'text-orange-400',
      Medium: 'text-amber-400',
      Low: 'text-emerald-400',
    }

    return styles[priority] || 'text-stone-400'
  }

  if (!city) {
    return (
      <main className="min-h-screen min-w-0 bg-[#171512] p-5 text-white sm:p-8">
        Please select a city first.
      </main>
    )
  }

  return (
    <main className="min-h-screen min-w-0 flex-1 overflow-x-hidden bg-[#171512] p-4 text-white sm:p-6 lg:p-8">

      {/* HEADER */}
      <header className="mb-6 flex min-w-0 flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[2px] text-orange-400 sm:text-xs sm:tracking-[3px]">
            PUBLIC CIVIC RECORDS
          </p>

          <h1 className="break-words text-2xl font-bold sm:text-3xl lg:text-4xl">
            {city} Reports
          </h1>

          <p className="mt-2 text-sm leading-6 text-stone-400">
            Public complaints and their progress in {city}.
          </p>
        </div>

        <button
          onClick={() => fetchReports(true)}
          disabled={loading}
          className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-orange-500/20 bg-[#211d18] px-4 py-3 text-sm font-medium text-orange-300 transition hover:bg-orange-500/10 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          <span className="text-lg">↻</span>
          {loading ? 'Refreshing...' : 'Refresh Reports'}
        </button>
      </header>

      {/* CITY STATISTICS */}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:gap-4 xl:grid-cols-4">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="min-w-0 rounded-2xl border border-orange-500/10 bg-[#211d18] p-3 transition hover:border-orange-500/25 sm:p-5"
          >
            <div className="flex min-w-0 items-start justify-between gap-2">
              <span className="break-words text-xs leading-5 text-stone-400 sm:text-sm">
                {stat.label}
              </span>

              <span className={`shrink-0 text-lg sm:text-xl ${stat.color}`}>
                {stat.icon}
              </span>
            </div>

            <p className="mt-3 break-words text-2xl font-bold sm:mt-4 sm:text-3xl">
              {loading ? '...' : stat.value.toLocaleString('en-IN')}
            </p>

            <p className="mt-1 text-[10px] text-stone-500 sm:mt-2 sm:text-xs">
              {city}
            </p>
          </article>
        ))}
      </section>

      {/* SEARCH AND FILTERS */}
      <section className="mb-6 grid min-w-0 grid-cols-1 gap-3 rounded-2xl border border-orange-500/10 bg-[#211d18] p-3 sm:p-4 md:grid-cols-3">

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reports, areas or ID..."
          aria-label="Search public reports"
          className="min-w-0 w-full rounded-xl border border-white/10 bg-[#171512] px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-orange-400/50"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className="min-w-0 w-full rounded-xl border border-white/10 bg-[#171512] px-4 py-3 text-sm text-white outline-none focus:border-orange-400/50"
        >
          <option value="All">All statuses</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
          <option value="Rejected">Rejected</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter by category"
          className="min-w-0 w-full rounded-xl border border-white/10 bg-[#171512] px-4 py-3 text-sm text-white outline-none focus:border-orange-400/50"
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category === 'All' ? 'All categories' : category}
            </option>
          ))}
        </select>
      </section>

      {/* REPORT RESULTS HEADER */}
      <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
        <h2 className="text-base font-semibold sm:text-lg">
          Public Complaints
        </h2>

        <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] text-stone-400 sm:text-xs">
          {filteredReports.length} results
        </span>
      </div>

      {/* LOADING */}
      {loading ? (
        <div className="rounded-2xl border border-orange-500/10 bg-[#211d18] p-10 text-center text-sm text-stone-400 sm:p-12">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-orange-500/20 border-t-orange-400" />
          Loading {city} reports...
        </div>
      ) : error ? (
        <div className="break-words rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-sm leading-6 text-red-300 sm:p-6">
          <p className="mb-2 font-semibold">Unable to load public reports</p>
          {error}
          <button
            onClick={() => fetchReports(true)}
            className="mt-4 block rounded-lg border border-red-500/30 px-4 py-2 text-xs font-semibold hover:bg-red-500/10"
          >
            Try Again
          </button>
        </div>
      ) : filteredReports.length === 0 ? (
        /* EMPTY STATE */
        <div className="rounded-2xl border border-orange-500/10 bg-[#211d18] px-5 py-12 text-center sm:px-6 sm:py-16">
          <div className="mb-4 text-4xl text-orange-400">⌕</div>

          <h3 className="text-lg font-semibold">
            No reports found
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-400">
            There are no matching public complaints for {city}.
            Try changing your search or filters.
          </p>

          {(search || statusFilter !== 'All' || categoryFilter !== 'All') && (
            <button
              onClick={() => {
                setSearch('')
                setStatusFilter('All')
                setCategoryFilter('All')
              }}
              className="mt-5 rounded-xl border border-orange-500/30 px-4 py-2.5 text-sm font-semibold text-orange-300 transition hover:bg-orange-500/10"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        /* REPORT CARDS */
        <section className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
          {filteredReports.map((report) => (
            <article
              key={report.id}
              className="min-w-0 overflow-hidden rounded-2xl border border-orange-500/10 bg-[#211d18] transition duration-200 hover:border-orange-400/30"
            >
              {report.image_url && (
                <div className="overflow-hidden bg-[#171512]">
                  <img
                    src={report.image_url}
                    alt={`Image for ${report.title || 'public complaint'}`}
                    loading="lazy"
                    className="h-40 w-full object-cover sm:h-48"
                  />
                </div>
              )}

              <div className="min-w-0 p-4 sm:p-5">

                {/* ID AND STATUS */}
                <div className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <span className="break-all text-xs font-semibold tracking-wide text-orange-400">
                    {report.id}
                  </span>

                  <span
                    className={`max-w-full rounded-full border px-3 py-1 text-[10px] font-semibold sm:text-xs ${getStatusStyle(report.status)}`}
                  >
                    {report.status || 'Unknown'}
                  </span>
                </div>

                {/* TITLE */}
                <h3 className="break-words text-base font-bold leading-6 text-white sm:text-lg">
                  {report.title || 'Untitled complaint'}
                </h3>

                {/* DESCRIPTION */}
                <p className="mt-2 break-words text-sm leading-6 text-stone-400">
                  {report.description || 'No description available.'}
                </p>

                {/* DETAILS */}
                <div className="mt-5 flex min-w-0 flex-wrap gap-2 text-xs">
                  <span className="max-w-full break-words rounded-lg bg-white/5 px-3 py-2 text-stone-300">
                    {report.category || 'Other'}
                  </span>

                  <span className="max-w-full break-words rounded-lg bg-white/5 px-3 py-2 text-stone-300">
                    {report.area || city}
                  </span>

                  <span
                    className={`max-w-full break-words rounded-lg bg-white/5 px-3 py-2 font-semibold ${getPriorityStyle(report.priority)}`}
                  >
                    {report.priority || 'Normal'} Priority
                  </span>
                </div>

                {/* DATE */}
                <div className="mt-5 border-t border-white/[0.07] pt-4 text-xs text-stone-500">
                  Reported on{' '}
                  {report.created_at
                    ? new Date(report.created_at).toLocaleDateString(
                        'en-IN',
                        {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        }
                      )
                    : 'Date unavailable'}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  )
}

export default CityReports
