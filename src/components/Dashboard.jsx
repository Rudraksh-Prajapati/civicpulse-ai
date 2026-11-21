
import { useEffect, useState } from 'react'
import Analytics from './Analytics'
import { supabase } from '../lib/supabase'

function Dashboard({ city }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const fetchReports = async () => {
      setLoading(true)
      setError('')

      if (!city) {
        setReports([])
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('reports')
        .select('id, title, category, area, city, status, created_at')
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

    fetchReports()

    return () => {
      active = false
    }
  }, [city])

  const getCount = (status) =>
    reports.filter(
      (report) =>
        report.status?.toLowerCase() === status.toLowerCase()
    ).length

  const stats = [
    {
      title: 'Total Reports',
      value: reports.length,
      icon: '▤',
      color: 'text-orange-400',
    },
    {
      title: 'Resolved Issues',
      value: getCount('Resolved'),
      icon: '✓',
      color: 'text-emerald-400',
    },
    {
      title: 'Pending Issues',
      value: getCount('Pending'),
      icon: '◷',
      color: 'text-amber-400',
    },
    {
      title: 'In Progress',
      value: getCount('In Progress'),
      icon: '↗',
      color: 'text-orange-400',
    },
  ]

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'resolved':
        return 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
      case 'pending':
        return 'border border-amber-500/20 bg-amber-500/10 text-amber-400'
      case 'in progress':
        return 'border border-orange-500/20 bg-orange-500/10 text-orange-400'
      case 'rejected':
        return 'border border-red-500/20 bg-red-500/10 text-red-400'
      default:
        return 'border border-stone-500/20 bg-stone-500/10 text-stone-400'
    }
  }

  const formattedDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <main className="min-h-screen min-w-0 flex-1 overflow-x-hidden bg-[#171512] px-4 py-6 text-white sm:px-6 sm:py-8 lg:px-8">

      {/* HEADER */}
      <header className="mb-7 sm:mb-10">
        <p className="text-xs text-stone-400 sm:text-sm">
          {formattedDate}
        </p>

        <div className="mt-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[2px] text-orange-400 sm:text-xs sm:tracking-[3px]">
            CITY INTELLIGENCE
          </p>

          <h2 className="break-words text-2xl font-bold sm:text-3xl lg:text-4xl">
            Dashboard Overview
          </h2>

          <p className="mt-2 text-sm leading-6 text-stone-400">
            Monitoring civic issues in {city}.
          </p>
        </div>
      </header>

      {/* CITY STATISTICS */}
      <section className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {stats.map((stat) => (
          <article
            key={stat.title}
            className="min-w-0 rounded-2xl border border-orange-500/10 bg-[#211d18] p-3 transition duration-200 hover:border-orange-500/30 sm:p-5"
          >
            <div className="flex min-w-0 items-start justify-between gap-2">
              <p className="break-words text-xs leading-5 text-stone-400 sm:text-sm">
                {stat.title}
              </p>

              <span className={`shrink-0 text-lg sm:text-xl ${stat.color}`}>
                {stat.icon}
              </span>
            </div>

            <h3 className="mt-3 break-words text-2xl font-bold sm:mt-4 sm:text-3xl">
              {loading ? '...' : stat.value.toLocaleString('en-IN')}
            </h3>

            <p className="mt-1 text-[10px] text-stone-500 sm:mt-2 sm:text-xs">
              {city}
            </p>
          </article>
        ))}
      </section>

      {/* RECENT CITY REPORTS */}
      <section className="mt-6 min-w-0 overflow-hidden rounded-2xl border border-orange-500/10 bg-[#211d18] p-4 sm:mt-8 sm:p-6">

        <div className="mb-5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[2px] text-orange-400">
            LATEST ACTIVITY
          </p>

          <h3 className="text-lg font-semibold sm:text-xl">
            Recent Reports
          </h3>

          <p className="mt-1 text-xs leading-5 text-stone-400 sm:text-sm">
            Latest complaints submitted in {city}
          </p>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-stone-400">
            <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-orange-500/20 border-t-orange-400" />
            Loading {city} reports...
          </div>
        ) : error ? (
          <div className="break-words rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm leading-6 text-red-400">
            Could not load reports: {error}
          </div>
        ) : reports.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-3xl text-orange-400">⌕</p>
            <p className="mt-3 text-sm text-stone-400">
              No reports found for {city}.
            </p>
          </div>
        ) : (
          <>
            {/* MOBILE REPORT CARDS */}
            <div className="space-y-3 md:hidden">
              {reports.slice(0, 5).map((report) => (
                <article
                  key={report.id}
                  className="min-w-0 rounded-xl border border-white/[0.07] bg-[#171512] p-4"
                >
                  <div className="mb-3 flex min-w-0 items-start justify-between gap-2">
                    <span className="break-all text-xs font-semibold text-orange-400">
                      {report.id}
                    </span>

                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${getStatusColor(report.status)}`}
                    >
                      {report.status || 'Pending'}
                    </span>
                  </div>

                  <h4 className="break-words text-sm font-semibold text-white">
                    {report.title || 'Untitled complaint'}
                  </h4>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-400">
                    {report.category && (
                      <span className="rounded-lg bg-white/5 px-2 py-1.5">
                        {report.category}
                      </span>
                    )}

                    <span className="break-words rounded-lg bg-white/5 px-2 py-1.5">
                      {[report.area, report.city]
                        .filter(Boolean)
                        .join(', ') || 'Location unavailable'}
                    </span>
                  </div>

                  <p className="mt-3 text-[10px] text-stone-500">
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
                  </p>
                </article>
              ))}
            </div>

            {/* TABLET AND DESKTOP TABLE */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-stone-500">
                    <th className="pb-4 pr-4 font-medium">Report ID</th>
                    <th className="pb-4 pr-4 font-medium">Issue</th>
                    <th className="pb-4 pr-4 font-medium">Location</th>
                    <th className="pb-4 font-medium">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {reports.slice(0, 5).map((report) => (
                    <tr
                      key={report.id}
                      className="border-b border-white/5 last:border-0"
                    >
                      <td className="break-all py-5 pr-4 text-xs text-orange-400">
                        {report.id}
                      </td>

                      <td className="max-w-[220px] break-words py-5 pr-4 font-medium">
                        {report.title || 'Untitled complaint'}
                      </td>

                      <td className="max-w-[200px] break-words py-5 pr-4 text-stone-400">
                        {[report.area, report.city]
                          .filter(Boolean)
                          .join(', ')}
                      </td>

                      <td className="py-5">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-xs ${getStatusColor(report.status)}`}
                        >
                          {report.status || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-5 text-center text-xs text-stone-500">
              Showing {Math.min(reports.length, 5)} of {reports.length} reports
            </p>
          </>
        )}
      </section>

      {/* ANALYTICS */}
      <section className="mt-6 min-w-0 sm:mt-8">
        <Analytics city={city} />
      </section>

    </main>
  )
}

export default Dashboard
