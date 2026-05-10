import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = (email, password) =>
    supabase ? supabase.auth.signUp({ email, password })
             : Promise.resolve({ error: { message: 'Supabase não configurado.' } })

  const signIn = (email, password) =>
    supabase ? supabase.auth.signInWithPassword({ email, password })
             : Promise.resolve({ error: { message: 'Supabase não configurado.' } })

  const signOut = () =>
    supabase ? supabase.auth.signOut() : Promise.resolve()

  const resetPassword = (email) =>
    supabase
      ? supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
      : Promise.resolve({ error: { message: 'Supabase não configurado.' } })

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
