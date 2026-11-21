
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  subscribeToNotifications,
} from '../lib/notifications'

function NotificationBell() {
  const [notifications, setNotifications] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const unreadCount = notifications.filter(
    (item) => !item.is_read
  ).length

  useEffect(() => {
    let active = true
    let channel = null

    const setupNotifications = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) throw userError
        if (!user) {
          if (active) setLoading(false)
          return
        }

        channel = subscribeToNotifications(user.id, (payload) => {
          if (!active) return

          if (payload.eventType === 'INSERT') {
            setNotifications((previous) => [
              payload.new,
              ...previous.filter(
                (item) => item.id !== payload.new.id
              ),
            ])
          }

          if (payload.eventType === 'UPDATE') {
            setNotifications((previous) =>
              previous.map((item) =>
                item.id === payload.new.id
                  ? { ...item, ...payload.new }
                  : item
              )
            )
          }

          if (payload.eventType === 'DELETE') {
            setNotifications((previous) =>
              previous.filter(
                (item) => item.id !== payload.old.id
              )
            )
          }
        })

        const data = await fetchNotifications()

        if (active) {
          setNotifications(data)
        }
      } catch (err) {
        console.error('Notification error:', err)
        if (active) setError(err.message || 'Unable to load notifications.')
      } finally {
        if (active) setLoading(false)
      }
    }

    setupNotifications()

    return () => {
      active = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  const handleMarkRead = async (notification) => {
    if (notification.is_read) return

    try {
      await markNotificationRead(notification.id)

      setNotifications((previous) =>
        previous.map((item) =>
          item.id === notification.id
            ? { ...item, is_read: true }
            : item
        )
      )
    } catch (err) {
      console.error('Mark read error:', err)
      setError('Unable to mark notification as read.')
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead()

      setNotifications((previous) =>
        previous.map((item) => ({ ...item, is_read: true }))
      )
    } catch (err) {
      console.error('Mark all read error:', err)
      setError('Unable to update notifications.')
    }
  }

  const formatTime = (date) => {
    if (!date) return ''

    return new Date(date).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setIsOpen((previous) => !previous)
          setError('')
        }}
        className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-slate-900 text-xl text-slate-300 transition hover:border-blue-500/50 hover:bg-slate-800 hover:text-white"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        ♧

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 z-50 mt-3 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <div>
                <h3 className="font-semibold text-white">
                  Notifications
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  {unreadCount} unread notifications
                </p>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs font-medium text-blue-400 hover:text-blue-300"
                >
                  Mark all read
                </button>
              )}
            </div>

            {error && (
              <p className="border-b border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                {error}
              </p>
            )}

            <div className="max-h-[420px] overflow-y-auto">
              {loading ? (
                <p className="p-8 text-center text-sm text-slate-400">
                  Loading notifications...
                </p>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mb-3 text-3xl">🔔</div>
                  <p className="text-sm font-medium text-white">
                    You're all caught up!
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    New complaint updates will appear here.
                  </p>
                </div>
              ) : (
                notifications.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleMarkRead(item)}
                    className={`flex w-full gap-3 border-b border-white/5 p-4 text-left transition hover:bg-white/5 ${
                      item.is_read ? 'opacity-70' : 'bg-blue-500/[0.06]'
                    }`}
                  >
                    <span className="mt-1 text-lg">
                      {item.is_read ? '○' : '●'}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-white">
                        {item.title}
                      </span>

                      <span className="mt-1 block text-xs leading-5 text-slate-400">
                        {item.message}
                      </span>

                      <span className="mt-2 block text-[11px] text-slate-500">
                        {formatTime(item.created_at)}
                      </span>

                      {item.report_id && (
                        <span className="mt-1 block text-[11px] text-blue-400">
                          Report: {item.report_id}
                        </span>
                      )}
                    </span>
                  </button>
                ))
              )}
            </div>

            <div className="border-t border-white/10 p-3 text-center">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-xs text-slate-400 transition hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default NotificationBell
