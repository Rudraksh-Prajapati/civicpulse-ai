
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const tabs = [
  { id: 'profile', label: 'Personal Profile', icon: '👤' },
  { id: 'account', label: 'Account Details', icon: '🔐' },
  { id: 'address', label: 'Address', icon: '📍' },
  { id: 'preferences', label: 'Preferences', icon: '⚙️' },
]

const emptyProfile = {
  name: '',
  phone: '',
  photoUrl: '',
  address: '',
  locality: '',
  city: '',
  district: '',
  state: '',
  pinCode: '',
}

const emptyPreferences = {
  notifications: true,
  emailNotifications: true,
  reportUpdates: true,
  darkMode: true,
}

function Settings({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('profile')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [profile, setProfile] = useState(emptyProfile)
  const [preferences, setPreferences] = useState(emptyPreferences)

  const [newEmail, setNewEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailMessage, setEmailMessage] = useState('')
  const [emailError, setEmailError] = useState('')

  useEffect(() => {
    if (!user) return

    const metadata = user.user_metadata || {}
    const savedProfile = metadata.civicpulse_profile || {}
    const savedPreferences = metadata.civicpulse_preferences || {}

    setProfile({
      ...emptyProfile,
      ...savedProfile,
      name:
        savedProfile.name ||
        metadata.full_name ||
        metadata.name ||
        '',
    })

    setPreferences({
      ...emptyPreferences,
      ...savedPreferences,
    })

    setNewEmail(user.email || '')
  }, [user])

  const updateProfile = (field, value) => {
    setProfile((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  const updatePreference = (field, value) => {
    setPreferences((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  const saveProfile = async (event) => {
    event.preventDefault()

    if (!user) return

    setSaving(true)
    setMessage('')
    setError('')

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: profile.name.trim(),
          civicpulse_profile: profile,
          civicpulse_preferences: preferences,
        },
      })

      if (updateError) throw updateError

      setEditing(false)
      setMessage('Your settings have been saved successfully.')
    } catch (err) {
      setError(err.message || 'Unable to save your settings.')
    } finally {
      setSaving(false)
    }
  }

  const cancelEditing = () => {
    if (!user) return

    const metadata = user.user_metadata || {}

    setProfile({
      ...emptyProfile,
      ...(metadata.civicpulse_profile || {}),
      name:
        metadata.civicpulse_profile?.name ||
        metadata.full_name ||
        metadata.name ||
        '',
    })

    setPreferences({
      ...emptyPreferences,
      ...(metadata.civicpulse_preferences || {}),
    })

    setEditing(false)
    setMessage('')
    setError('')
  }

  const changeEmail = async (event) => {
    event.preventDefault()

    setEmailError('')
    setEmailMessage('')

    if (!user?.email || !newEmail.trim() || !currentPassword) {
      setEmailError('Enter your new email and current password.')
      return
    }

    if (newEmail.trim().toLowerCase() === user.email.toLowerCase()) {
      setEmailError('Your new email is the same as your current email.')
      return
    }

    setEmailLoading(true)

    try {
      const { error: signInError } =
        await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        })

      if (signInError) {
        throw new Error('Current password is incorrect.')
      }

      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail.trim(),
      })

      if (updateError) throw updateError

      setEmailMessage(
        'Confirmation instructions have been sent. Follow the email from Supabase to complete your email change.'
      )

      setCurrentPassword('')
    } catch (err) {
      setEmailError(err.message || 'Unable to update your email.')
    } finally {
      setEmailLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-white/10 bg-[#171512] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#777067] focus:border-[#d28a5b] disabled:cursor-not-allowed disabled:opacity-70'

  const labelClass =
    'mb-2 block text-sm font-medium text-[#d8cabb]'

  const displayValue = (value) => value?.trim() || 'Not provided'

  const Field = ({ label, value, field, placeholder, type = 'text' }) => (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => updateProfile(field, e.target.value)}
        placeholder={placeholder || `Enter ${label.toLowerCase()}`}
        disabled={!editing}
        className={inputClass}
      />
    </div>
  )

  const ReadOnlyField = ({ label, value }) => (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="break-all rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3 text-sm text-[#c8bbae]">
        {value || 'Not available'}
      </div>
    </div>
  )

  const Preference = ({ title, description, field }) => (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/[0.07] bg-black/20 p-4">
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="mt-1 text-xs leading-5 text-[#958b80]">
          {description}
        </p>
      </div>

      <input
        type="checkbox"
        checked={preferences[field]}
        disabled={!editing}
        onChange={(e) => updatePreference(field, e.target.checked)}
        className="h-5 w-5 shrink-0 accent-[#d58b5c] disabled:opacity-50"
      />
    </label>
  )

  if (!user) {
    return (
      <div className="p-8 text-center text-[#c8bbae]">
        Please sign in to view your settings.
      </div>
    )
  }

  const initials = (profile.name || user.email || 'U')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="min-h-screen bg-[#171512] px-4 py-6 text-white sm:px-7 lg:px-10">
      <div className="mx-auto max-w-6xl">

        {/* Heading */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[3px] text-[#d99a6c]">
            ACCOUNT CONTROL CENTER
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Settings
          </h1>
          <p className="mt-2 text-sm text-[#9c9185]">
            Manage your personal information and account preferences.
          </p>
        </div>

        {/* Profile summary */}
        <div className="mb-7 flex flex-wrap items-center gap-4 rounded-2xl border border-[#d28a5b]/20 bg-gradient-to-r from-[#292019] to-[#211d18] p-5">
          {profile.photoUrl ? (
            <img
              src={profile.photoUrl}
              alt="Profile"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
              className="h-16 w-16 rounded-full border-2 border-[#d28a5b]/50 object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#d28a5b]/50 bg-[#d28a5b]/15 text-xl font-bold text-[#efb17f]">
              {initials}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold">
              {profile.name || 'Your Profile'}
            </h2>
            <p className="mt-1 break-all text-sm text-[#aaa095]">
              {user.email}
            </p>
            <p className="mt-2 text-xs text-[#d99a6c]">
              CivicPulse registered account
            </p>
          </div>

          {activeTab !== 'account' && (
            <div className="flex gap-2">
              {!editing ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(true)
                    setMessage('')
                    setError('')
                  }}
                  className="rounded-xl bg-gradient-to-r from-[#efb17f] to-[#bd6d45] px-5 py-2.5 text-sm font-bold text-[#21150e] transition hover:brightness-110"
                >
                  Edit Profile
                </button>
              ) : (
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-[#d8cabb] transition hover:bg-white/5"
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>

        {/* Feedback */}
        {message && (
          <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">

          {/* Tabs */}
          <aside className="h-fit rounded-2xl border border-white/[0.07] bg-[#211d18] p-3">
            <p className="px-3 pb-3 pt-2 text-[10px] font-bold uppercase tracking-[2px] text-[#887d71]">
              Account settings
            </p>

            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id)
                    setMessage('')
                    setError('')
                  }}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                    activeTab === tab.id
                      ? 'border border-[#d28a5b]/30 bg-[#d28a5b]/10 font-semibold text-[#efb17f]'
                      : 'text-[#aaa095] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </aside>

          {/* Tab content */}
          <section className="min-w-0 rounded-2xl border border-white/[0.07] bg-[#211d18] p-5 sm:p-7">

            {/* PERSONAL PROFILE */}
            {activeTab === 'profile' && (
              <form onSubmit={saveProfile}>
                <div className="mb-7">
                  <h2 className="text-xl font-semibold">Personal Profile</h2>
                  <p className="mt-1 text-sm text-[#958b80]">
                    Your personal information is visible only in your account settings.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Full Name"
                    field="name"
                    value={profile.name}
                  />

                  <Field
                    label="Phone Number"
                    field="phone"
                    value={profile.phone}
                    type="tel"
                    placeholder="Enter phone number"
                  />

                  <div className="sm:col-span-2">
                    <Field
                      label="Profile Photo URL"
                      field="photoUrl"
                      value={profile.photoUrl}
                      placeholder="Paste an image URL (optional)"
                    />
                    <p className="mt-2 text-xs text-[#81786e]">
                      Use a publicly accessible image URL. File uploads are not enabled yet.
                    </p>
                  </div>
                </div>

                {editing && (
                  <div className="mt-7 flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-xl bg-gradient-to-r from-[#efb17f] to-[#bd6d45] px-6 py-3 text-sm font-bold text-[#21150e] disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                )}

                {!editing && (
                  <p className="mt-6 text-xs text-[#81786e]">
                    Select Edit Profile to update your information.
                  </p>
                )}
              </form>
            )}

            {/* ACCOUNT DETAILS */}
            {activeTab === 'account' && (
              <div>
                <div className="mb-7">
                  <h2 className="text-xl font-semibold">Account Details</h2>
                  <p className="mt-1 text-sm text-[#958b80]">
                    Your sign-in and account information.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <ReadOnlyField
                    label="Current Email"
                    value={user.email}
                  />
                  <ReadOnlyField
                    label="Account Created"
                    value={
                      user.created_at
                        ? new Date(user.created_at).toLocaleDateString(
                            'en-IN',
                            {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            }
                          )
                        : 'Not available'
                    }
                  />
                  <div className="sm:col-span-2">
                    <ReadOnlyField
                      label="User ID"
                      value={user.id}
                    />
                  </div>
                </div>

                <div className="my-8 h-px bg-white/[0.08]" />

                <h3 className="text-lg font-semibold">Change Email Address</h3>
                <p className="mb-5 mt-1 text-sm text-[#958b80]">
                  Verify your current password. Supabase will send confirmation instructions before the new email is applied.
                </p>

                <form onSubmit={changeEmail} className="space-y-5">
                  <div>
                    <label className={labelClass}>New Email Address</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      required
                      placeholder="Enter your new email"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      placeholder="Enter your current password"
                      className={inputClass}
                    />
                    <p className="mt-2 text-xs text-[#81786e]">
                      Your password is used only for verification and is never saved in your profile.
                    </p>
                  </div>

                  {emailError && (
                    <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                      {emailError}
                    </p>
                  )}

                  {emailMessage && (
                    <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                      {emailMessage}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={emailLoading}
                    className="rounded-xl bg-gradient-to-r from-[#efb17f] to-[#bd6d45] px-6 py-3 text-sm font-bold text-[#21150e] disabled:opacity-50"
                  >
                    {emailLoading ? 'Verifying...' : 'Verify & Change Email'}
                  </button>
                </form>
              </div>
            )}

            {/* ADDRESS */}
            {activeTab === 'address' && (
              <form onSubmit={saveProfile}>
                <div className="mb-7">
                  <h2 className="text-xl font-semibold">Address Information</h2>
                  <p className="mt-1 text-sm text-[#958b80]">
                    Add your address details if you want to keep them in your private profile.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Field
                      label="House / Street / Address"
                      field="address"
                      value={profile.address}
                    />
                  </div>

                  <Field
                    label="Locality / Area"
                    field="locality"
                    value={profile.locality}
                  />
                  <Field
                    label="City"
                    field="city"
                    value={profile.city}
                  />
                  <Field
                    label="District"
                    field="district"
                    value={profile.district}
                  />
                  <Field
                    label="State"
                    field="state"
                    value={profile.state}
                  />
                  <Field
                    label="PIN Code"
                    field="pinCode"
                    value={profile.pinCode}
                    placeholder="Enter 6-digit PIN code"
                  />
                </div>

                {editing && (
                  <div className="mt-7 flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-xl bg-gradient-to-r from-[#efb17f] to-[#bd6d45] px-6 py-3 text-sm font-bold text-[#21150e] disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Address'}
                    </button>
                  </div>
                )}

                {!editing && (
                  <p className="mt-6 text-xs text-[#81786e]">
                    Select Edit Profile to add or update your address.
                  </p>
                )}
              </form>
            )}

            {/* PREFERENCES */}
            {activeTab === 'preferences' && (
              <form onSubmit={saveProfile}>
                <div className="mb-7">
                  <h2 className="text-xl font-semibold">Preferences</h2>
                  <p className="mt-1 text-sm text-[#958b80]">
                    Control your preferred notification and display settings.
                  </p>
                </div>

                <div className="space-y-3">
                  <Preference
                    title="Notifications"
                    description="Enable or disable notifications in your account."
                    field="notifications"
                  />
                  <Preference
                    title="Email Notifications"
                    description="Preference for receiving updates through email."
                    field="emailNotifications"
                  />
                  <Preference
                    title="Report Updates"
                    description="Receive updates about the status of your submitted reports."
                    field="reportUpdates"
                  />
                  <Preference
                    title="Dark Appearance"
                    description="Keep the dark appearance preference enabled."
                    field="darkMode"
                  />
                </div>

                {editing && (
                  <div className="mt-7 flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-xl bg-gradient-to-r from-[#efb17f] to-[#bd6d45] px-6 py-3 text-sm font-bold text-[#21150e] disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Preferences'}
                    </button>
                  </div>
                )}

                {!editing && (
                  <p className="mt-6 text-xs text-[#81786e]">
                    Select Edit Profile to change your preferences.
                  </p>
                )}
              </form>
            )}
          </section>
        </div>

        {/* Account actions */}
        <div className="mt-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-[#211d18] p-5">
          <div>
            <h3 className="font-semibold text-white">Sign out</h3>
            <p className="mt-1 text-xs text-[#958b80]">
              Sign out of your CivicPulse account on this device.
            </p>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="rounded-xl border border-red-400/30 px-5 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/10"
          >
            Log Out
          </button>
        </div>

      </div>
    </div>
  )
}

export default Settings
