import { useEffect } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { initAdminApiAuth, getAdminToken } from './adminApi'
import { AdminLayout } from './layout/AdminLayout'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import AdminPlayers from './pages/AdminPlayers'
import AdminQuizList from './pages/AdminQuizList'
import AdminQuizBuilder from './pages/AdminQuizBuilder'

function RequireAdmin() {
  if (!getAdminToken()) {
    return <Navigate to="/admin/login" replace />
  }
  return <Outlet />
}

export function AdminApp() {
  useEffect(() => {
    initAdminApiAuth()
  }, [])

  return (
    <div className="fixed inset-0 z-[100] overflow-auto bg-slate-950">
      <Routes>
        <Route path="login" element={<AdminLogin />} />
        <Route element={<RequireAdmin />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="players" element={<AdminPlayers />} />
            <Route path="quizzes" element={<AdminQuizList />} />
            <Route path="quizzes/new" element={<AdminQuizBuilder />} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>
        </Route>
      </Routes>
    </div>
  )
}
