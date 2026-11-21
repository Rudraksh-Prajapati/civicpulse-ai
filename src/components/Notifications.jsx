
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  subscribeToNotifications,
} from '../lib/notifications'

function Notifications({ user, onNavigate }) {
  const [notifications, setNotifications] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (!toast) return

    const timer = setTimeout(() => {
      setToast(null)
    }, 4000)

    return () => clearTimeout(timer)
  }, [toast])

  const unreadCount = notifications.filter(
    (item) => !item.is_read
  ).length

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    setError('')

    try {
      const data = await fetchNotifications()
      setNotifications(data)
    } catch (err) {
      console.error('Notification error:', err)
      setError(err.message || 'Unable to load notifications.')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) {
      setNotifications([])
      return
    }

    let active = true

    const channel = subscribeToNotifications(user.id, (payload) => {
      if (!active) return

      if (payload.eventType === 'INSERT') {
        setNotifications((previous) => {
          if (previous.some((item) => item.id === payload.new.id)) {
            return previous
          }

          return [payload.new, ...previous].slice(0, 20)
        })

        setToast(payload.new)
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
          previous.filter((item) => item.id !== payload.old.id)
        )
      }
    })

    loadNotifications()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [user?.id, loadNotifications])

  const markAsRead = async (id) => {
    try {
      await markNotificationRead(id)

      setNotifications((previous) =>
        previous.map((item) =>
          item.id === id ? { ...item, is_read: true } : item
        )
      )
    } catch (err) {
      console.error('Mark as read error:', err)
      setError('Unable to mark notification as read.')
    }
  }

  const markAllAsRead = async () => {
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

  return (
    <div className="relative z-auto">
      <button
        type="button"
        onClick={() => {
          setIsOpen((previous) => !previous)
          setError('')
        }}
        className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-900 text-xl transition hover:border-blue-500/40 hover:bg-slate-800"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        🔔

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
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

          <div className="
  fixed left-3 right-3 top-36 z-[60]
  max-h-[65vh]
  overflow-hidden rounded-2xl
  border border-white/10
  bg-slate-900 shadow-2xl
  sm:absolute sm:left-auto sm:right-0
  sm:top-14 sm:w-96 sm:max-h-none
">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
              <div className="min-w-0">
                <h3 className="font-semibold text-white">
                  Notifications
                </h3>
                <p className="text-xs text-slate-400">
                  {unreadCount} unread notifications
                </p>
              </div>

              <button
                type="button"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="shrink-0 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40"
              >
                Mark all read
              </button>
            </div>

            {error && (
              <p className="border-b border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                {error}
              </p>
            )}

            <div className="max-h-[min(65vh,24rem)] overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-400">
                  Loading notifications...
                </p>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mb-3 text-3xl">🔕</div>
                  <p className="text-sm font-medium text-white">
                    No notifications yet
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Report updates will appear here.
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={async () => {
                      await markAsRead(notification.id)
                      setIsOpen(false)

                      if (notification.report_id) {
                        onNavigate?.('My Reports', notification.report_id)
                      } else {
                        onNavigate?.('My Reports')
                      }
                    }}
                    className={`block w-full border-b border-white/5 p-4 text-left transition hover:bg-slate-800 ${
                      notification.is_read
                        ? 'opacity-60'
                        : 'bg-blue-500/5'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-1 shrink-0 text-lg">
                        📢
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-semibold text-white">
                          {notification.title}
                        </p>

                        <p className="mt-1 break-words text-xs leading-5 text-slate-400">
                          {notification.message}
                        </p>

                        <p className="mt-2 text-xs text-slate-500">
                          {new Date(notification.created_at).toLocaleString('en-IN')}
                        </p>

                        {notification.report_id && (
                          <p className="mt-1 text-xs text-blue-400">
                            Report: {notification.report_id}
                          </p>
                        )}
                      </div>

                      {!notification.is_read && (
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-400" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {toast && (
        <div className="fixed right-3 top-5 z-[100] w-80 max-w-[calc(100vw-1.5rem)] animate-in slide-in-from-right-5 duration-300 sm:right-5">
          <div className="overflow-hidden rounded-2xl border border-blue-500/30 bg-slate-900 shadow-2xl shadow-blue-950/40">
            <div className="flex items-center gap-3 border-b border-white/10 bg-blue-500/10 px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-lg">
                🔔
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                  New Notification
                </p>
                <p className="break-words text-sm font-semibold text-white">
                  {toast.title}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setToast(null)}
                className="shrink-0 text-lg text-slate-400 transition hover:text-white"
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>

            <div className="p-4">
              <p className="break-words text-sm leading-5 text-slate-300">
                {toast.message}
              </p>

              <p className="mt-3 text-xs text-slate-500">
                {new Date(toast.created_at).toLocaleTimeString('en-IN')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Notifications
