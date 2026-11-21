
import { useState } from 'react'

function Settings() {
  const [profile, setProfile] = useState(() => {
    const savedProfile = localStorage.getItem('civicpulse-profile')

    return savedProfile
      ? JSON.parse(savedProfile)
      : {
          name: 'CivicPulse User',
          email: 'user@example.com',
          city: 'Chandigarh',
        }
  })

  const [notifications, setNotifications] = useState(true)

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value })
  }

  const handleSave = () => {
    localStorage.setItem('civicpulse-profile', JSON.stringify(profile))
    alert('Profile saved successfully!')
  }

  return (
    <main className="min-h-screen min-w-0 flex-1 bg-slate-950 px-4 py-6 text-white sm:px-6 sm:py-8 md:px-8">
      <div className="mx-auto w-full max-w-3xl">

        {/* Header */}
        <div>
          <p className="text-xs font-medium text-blue-400 sm:text-sm">
            Preferences
          </p>

          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
            Settings
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-400 sm:text-base">
            Manage your CivicPulse AI preferences.
          </p>
        </div>

        {/* Profile Information */}
        <section className="mt-6 rounded-xl border border-white/10 bg-slate-900 p-4 sm:mt-8 sm:rounded-2xl sm:p-6">
          <div>
            <h3 className="text-base font-semibold sm:text-lg">
              Profile Information
            </h3>

            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              Update your personal information.
            </p>
          </div>

          <div className="mt-5 space-y-4 sm:mt-6 sm:space-y-5">
            {[
              { label: 'Full Name', name: 'name' },
              { label: 'Email Address', name: 'email' },
              { label: 'City', name: 'city' },
            ].map((field) => (
              <div key={field.name}>
                <label
                  htmlFor={`profile-${field.name}`}
                  className="mb-2 block text-sm font-medium text-slate-400"
                >
                  {field.label}
                </label>

                <input
                  id={`profile-${field.name}`}
                  name={field.name}
                  type={field.name === 'email' ? 'email' : 'text'}
                  value={profile[field.name]}
                  onChange={handleChange}
                  className="w-full min-w-0 rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500 sm:w-auto"
          >
            Save Profile
          </button>
        </section>

        {/* Notifications */}
        <section className="mt-5 rounded-xl border border-white/10 bg-slate-900 p-4 sm:mt-6 sm:rounded-2xl sm:p-6">
          <h3 className="text-base font-semibold sm:text-lg">
            Notifications
          </h3>

          <div className="mt-5 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium sm:text-base">
                Report Updates
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-400 sm:text-sm">
                Enable notifications for report status updates.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setNotifications(!notifications)}
              className={`relative h-7 w-12 shrink-0 rounded-full p-1 transition ${
                notifications ? 'bg-blue-600' : 'bg-slate-700'
              }`}
              aria-label="Toggle report notifications"
              aria-pressed={notifications}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white transition-transform ${
                  notifications ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Notifications are currently {notifications ? 'enabled' : 'disabled'}.
          </p>
        </section>

        {/* Footer */}
        <p className="mt-6 pb-4 text-center text-xs text-slate-500">
          CivicPulse AI · Preferences and account settings
        </p>
      </div>
    </main>
  )
}

export default Settings
