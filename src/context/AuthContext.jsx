import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const AuthContext = createContext(null)

// A profile counts as "complete" once the step-2 essentials are filled in.
const REQUIRED_FIELDS = [
  'specialty',
  'current_location',
  'availability',
  'compensation_goal',
]

function computeComplete(profile) {
  if (!profile) return false
  return REQUIRED_FIELDS.every(
    (f) => profile[f] && String(profile[f]).trim().length > 0
  )
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  const user = session?.user ?? null

  const fetchProfile = useCallback(async (uid) => {
    if (!supabase || !uid) {
      setProfile(null)
      return null
    }
    setProfileLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', uid)
        .maybeSingle()
      if (error) {
        console.error('Failed to load profile:', error.message)
        return null
      }
      setProfile(data)
      return data
    } finally {
      setProfileLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      if (data.session?.user) await fetchProfile(data.session.user.id)
      setLoading(false)
    })

    // NOTE: don't `await` Supabase calls *inside* this callback — doing so
    // can deadlock the auth lock. Defer the profile fetch to a microtask.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession?.user) {
        setTimeout(() => fetchProfile(nextSession.user.id), 0)
      } else {
        setProfile(null)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }, [])

  // metadata is copied into public.users by the handle_new_user() trigger.
  const signUp = useCallback(async ({ email, password, metadata }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })
    if (error) throw error
    // If email confirmation is disabled we get a session immediately —
    // prime the context so navigation right after signup is seamless.
    if (data.session) {
      setSession(data.session)
      setTimeout(() => fetchProfile(data.session.user.id), 0)
    }
    return data
  }, [fetchProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setSession(null)
  }, [])

  const updateProfile = useCallback(
    async (fields) => {
      if (!user) throw new Error('Not authenticated')
      const payload = {
        ...fields,
        id: user.id,
        email: user.email,
        updated_at: new Date().toISOString(),
      }
      const { data, error } = await supabase
        .from('users')
        .upsert(payload)
        .select()
        .single()
      if (error) throw error
      setProfile(data)
      return data
    },
    [user]
  )

  const resetPassword = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    if (error) throw error
  }, [])

  const refreshProfile = useCallback(
    () => (user ? fetchProfile(user.id) : Promise.resolve(null)),
    [user, fetchProfile]
  )

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      loading,
      profileLoading,
      isConfigured: isSupabaseConfigured,
      isAdmin: profile?.role === 'admin',
      profileComplete: computeComplete(profile),
      signIn,
      signUp,
      signOut,
      updateProfile,
      resetPassword,
      refreshProfile,
    }),
    [
      session,
      user,
      profile,
      loading,
      profileLoading,
      signIn,
      signUp,
      signOut,
      updateProfile,
      resetPassword,
      refreshProfile,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
