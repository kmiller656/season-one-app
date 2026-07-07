import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Loads the current PA's matches with their embedded opportunity.
// Inactive opportunities are filtered out (RLS returns them as null).
export function useMatches() {
  const { user } = useAuth()
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('matches')
      .select(
        'id, status, created_at, updated_at, opportunity:opportunities(*)'
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) setError(error)
    else setMatches((data || []).filter((m) => m.opportunity))
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const updateStatus = useCallback(
    async (matchId, status) => {
      const prev = matches
      // optimistic update
      setMatches((cur) =>
        cur.map((m) => (m.id === matchId ? { ...m, status } : m))
      )
      const { error } = await supabase
        .from('matches')
        .update({ status })
        .eq('id', matchId)
      if (error) {
        setMatches(prev) // rollback
        throw error
      }
    },
    [matches]
  )

  return { matches, loading, error, refresh: load, updateStatus }
}
