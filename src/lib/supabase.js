
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let rememberSession = true

const authStorage = {
  getItem: async (key) => {
    const localValue = localStorage.getItem(key)

    if (localValue !== null) {
      rememberSession = true
      return localValue
    }

    const sessionValue = sessionStorage.getItem(key)

    if (sessionValue !== null) {
      rememberSession = false
      return sessionValue
    }

    return null
  },

  setItem: async (key, value) => {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)

    if (rememberSession) {
      localStorage.setItem(key, value)
    } else {
      sessionStorage.setItem(key, value)
    }
  },

  removeItem: async (key) => {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  },
}

export function setRememberMe(value) {
  rememberSession = value
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
