import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { UserProfileDto } from '../types'
import * as api from '../api/client'
import {
  clearStoredCategories,
  mergeProfileCategories,
} from '../lib/categoryStorage'
import { toast } from 'sonner'

type AppContextValue = {
  token: string | null
  user: UserProfileDto | null
  loading: boolean
  setUser: (u: UserProfileDto | null) => void
  loginWithToken: (token: string, user: UserProfileDto) => void
  logout: () => void
  refreshProfile: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<UserProfileDto | null>(null)
  const [loading, setLoading] = useState(true)
  const profileRefreshSeq = useRef(0)

  const refreshProfile = useCallback(async () => {
    const seq = ++profileRefreshSeq.current
    try {
      const p = await api.fetchProfile()
      if (seq !== profileRefreshSeq.current) return
      const merged = mergeProfileCategories(p)
      setUser(api.mergeProfileWithLocationFallback(merged))
    } catch {
      if (seq !== profileRefreshSeq.current) return
      setUser(null)
      api.setAuthToken(null)
      setToken(null)
    }
  }, [])

  useEffect(() => {
    const t = api.loadStoredToken()
    setToken(t)
    if (t) {
      refreshProfile().finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [refreshProfile])

  const loginWithToken = useCallback((t: string, u: UserProfileDto) => {
    profileRefreshSeq.current += 1
    api.setAuthToken(t)
    setToken(t)
    const withCats = mergeProfileCategories(
      api.mergeProfileWithLocationFallback(u),
    )
    setUser(withCats)
    toast.success('Welcome back!')
  }, [])

  const logout = useCallback(() => {
    profileRefreshSeq.current += 1
    api.setAuthToken(null)
    clearStoredCategories()
    setToken(null)
    setUser(null)
    toast.message('Signed out')
  }, [])

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      setUser,
      loginWithToken,
      logout,
      refreshProfile,
    }),
    [token, user, loading, loginWithToken, logout, refreshProfile],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp outside AppProvider')
  return ctx
}
