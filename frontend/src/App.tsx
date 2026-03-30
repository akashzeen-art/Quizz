import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AppProvider, useApp } from './context/AppContext'
import { SplashScreen } from './components/SplashScreen'
import { AuthScreen } from './components/AuthScreen'
import { CategorySelection } from './components/CategorySelection'
import { HomeScreen } from './components/HomeScreen'
import { QuizLoadingScreen } from './components/QuizLoadingScreen'
import { QuizPlayScreen } from './components/QuizPlayScreen'
import { EventsScreen } from './components/EventsScreen'
import { LeaderboardScreen } from './components/LeaderboardScreen'
import { ProfileScreen } from './components/ProfileScreen'
import { shouldForceCategoryOnboarding } from './lib/categoryOnboarding'
import { AdminApp } from './admin/AdminApp'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, loading } = useApp()
  if (loading) {
    return (
      <div className="app-screen flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 safe-pt-header">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-2xl font-extrabold text-white shadow-xl shadow-violet-500/30">
          Q
        </div>
        <p className="text-sm font-semibold text-slate-600">Loading…</p>
        <div className="h-1 w-32 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" />
        </div>
      </div>
    )
  }
  if (!token) return <Navigate to="/auth" replace />
  return <>{children}</>
}

function RequireCategories({ children }: { children: React.ReactNode }) {
  const { user, loading } = useApp()
  if (loading) {
    return (
      <div className="app-screen flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 safe-pt-header">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-2xl font-extrabold text-white shadow-xl shadow-violet-500/30">
          Q
        </div>
        <p className="text-sm font-semibold text-slate-600">Loading…</p>
        <div className="h-1 w-32 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" />
        </div>
      </div>
    )
  }
  if (shouldForceCategoryOnboarding(user)) {
    return <Navigate to="/categories" replace />
  }
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<SplashScreen />} />
      <Route path="/admin/*" element={<AdminApp />} />
      <Route path="/auth" element={<AuthScreen />} />
      <Route
        path="/categories"
        element={
          <RequireAuth>
            <CategorySelection />
          </RequireAuth>
        }
      />
      <Route
        path="/home"
        element={
          <RequireAuth>
            <RequireCategories>
              <HomeScreen />
            </RequireCategories>
          </RequireAuth>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <RequireAuth>
            <RequireCategories>
              <LeaderboardScreen />
            </RequireCategories>
          </RequireAuth>
        }
      />
      <Route
        path="/events"
        element={
          <RequireAuth>
            <RequireCategories>
              <EventsScreen />
            </RequireCategories>
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <RequireCategories>
              <ProfileScreen />
            </RequireCategories>
          </RequireAuth>
        }
      />
      <Route
        path="/quiz/:id/loading"
        element={
          <RequireAuth>
            <RequireCategories>
              <QuizLoadingScreen />
            </RequireCategories>
          </RequireAuth>
        }
      />
      <Route
        path="/quiz/:id/play"
        element={
          <RequireAuth>
            <RequireCategories>
              <QuizPlayScreen />
            </RequireCategories>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-center"
          richColors
          toastOptions={{
            classNames: {
              toast:
                'rounded-2xl border border-slate-200/90 bg-white/95 text-slate-900 shadow-xl shadow-slate-900/10 backdrop-blur-md',
            },
          }}
        />
      </BrowserRouter>
    </AppProvider>
  )
}
