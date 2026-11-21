
import { useEffect, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'

const priorityColors = {
  Critical: '#EF4444',
  High: '#F59E0B',
  Medium: '#D97757',
  Low: '#10B981',
}

function MapBounds({ reports }) {
  const map = useMap()

  useEffect(() => {
    if (reports.length > 0) {
      const bounds = reports.map((report) => [
        Number(report.latitude),
        Number(report.longitude),
      ])

      if (bounds.length === 1) {
        map.setView(bounds[0], 12)
      } else {
        map.fitBounds(bounds, {
          padding: [30, 30],
          maxZoom: 12,
        })
      }
    }
  }, [reports, map])

  return null
}

function MapView() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const fetchReports = async () => {
      setLoading(true)
      setError('')

      try {
        const { data, error } = await supabase
  .from('reports')
  .select(
    'id, title, category, city, area, priority, status, latitude, longitude'
  )
  .not('latitude', 'is', null)
  .not('longitude', 'is', null)
        if (error) throw error

        if (isMounted) {
          const validReports = (data || []).filter((report) => {
            const latitude = Number(report.latitude)
            const longitude = Number(report.longitude)

            return (
              Number.isFinite(latitude) &&
              Number.isFinite(longitude) &&
              latitude >= -90 &&
              latitude <= 90 &&
              longitude >= -180 &&
              longitude <= 180
            )
          })

          setReports(validReports)
        }
      } catch (err) {
        console.error('Map reports error:', err)

        if (isMounted) {
          setError(err.message || 'Unable to load report locations.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchReports()

    return () => {
      isMounted = false
    }
  }, [])

  const getPriorityColor = (priority) =>
    priorityColors[priority] || '#64748B'

  return (
    <main className="min-h-screen min-w-0 flex-1 bg-[#101010] px-3 py-5 text-white sm:px-5 sm:py-7 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-7xl min-w-0">

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400 sm:text-sm">
            Geospatial Intelligence
          </p>

          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            Civic Issue Map
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Explore real civic issues reported by citizens across India.
          </p>
        </div>

        {/* Map statistics and legend */}
        <div className="mb-4 flex min-w-0 flex-col gap-4 rounded-2xl border border-white/10 bg-[#191919] p-4 sm:mb-5 sm:p-5 lg:flex-row lg:items-center lg:justify-between">

          <div className="min-w-0">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Priority Legend
            </p>

            <div className="flex flex-wrap gap-x-5 gap-y-3">
              {Object.entries(priorityColors).map(([priority, color]) => (
                <div key={priority} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full shadow-sm"
                    style={{
                      backgroundColor: color,
                      boxShadow: `0 0 10px ${color}55`,
                    }}
                  />

                  <span className="text-xs font-medium text-slate-300 sm:text-sm">
                    {priority}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <div>
              <p className="text-xs text-slate-500">
                Mapped Reports
              </p>

              <p className="mt-1 text-2xl font-bold text-orange-400 tabular-nums">
                {reports.length}
              </p>
            </div>

            <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-300">
              Live Map Data
            </span>
          </div>
        </div>

        {/* Loading and error messages */}
        {loading && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-white/10 bg-[#191919] p-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500/20 border-t-orange-500" />

            <p className="text-sm text-slate-400">
              Loading report locations...
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 break-words rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm leading-relaxed text-red-400">
            Could not load map reports: {error}
          </div>
        )}

        {/* Map */}
        <div className="relative z-0 min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#191919] shadow-xl shadow-black/20">

          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#191919] px-4 py-3 sm:px-5">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Interactive Issue Map
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Select a marker to view report details
              </p>
            </div>

            <span className="text-xs text-slate-500">
              India
            </span>
          </div>

          <div className="relative w-full">
            <MapContainer
              center={[22.5, 79]}
              zoom={5}
              scrollWheelZoom={true}
              className="h-[55vh] min-h-[420px] w-full sm:h-[580px] sm:min-h-[480px] lg:h-[650px]"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapBounds reports={reports} />

              {reports.map((report) => (
                <CircleMarker
                  key={report.id}
                  center={[
                    Number(report.latitude),
                    Number(report.longitude),
                  ]}
                  radius={window.innerWidth < 640 ? 7 : 9}
                  pathOptions={{
                    color: getPriorityColor(report.priority),
                    fillColor: getPriorityColor(report.priority),
                    fillOpacity: 0.85,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="min-w-[180px] max-w-[240px]">
                      <strong className="break-words">
                        {report.title || 'Untitled report'}
                      </strong>

                      <br />

                      {report.area ? `${report.area}, ` : ''}
                      {report.city || 'Unknown city'}

                      <br />

                      <span>Report: {report.id}</span>
                      <br />

                      <span>Category: {report.category || 'Other'}</span>
                      <br />

                      <span>Priority: {report.priority || 'Medium'}</span>
                      <br />

                      <span>Status: {report.status || 'Pending'}</span>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Empty state */}
        {!loading && !error && reports.length === 0 && (
          <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="text-xl">📍</span>

              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-amber-300">
                  No mapped reports yet
                </h3>

                <p className="mt-1 text-xs leading-relaxed text-amber-200/70 sm:text-sm">
                  No reports with GPS coordinates were found. Submit a new report using the Use My Current Location button to see your first map marker.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex flex-col gap-2 border-t border-white/5 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-slate-500">
            Markers represent submitted reports with GPS coordinates.
          </p>

          <p className="text-xs text-slate-500">
            Map tiles © OpenStreetMap contributors
          </p>
        </div>
      </div>
    </main>
  )
}

export default MapView
