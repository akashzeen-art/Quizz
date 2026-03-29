import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  LogOut,
  Users,
  ListChecks,
  PlusCircle,
} from 'lucide-react'
import { setAdminToken } from '../adminApi'

const link =
  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition'

export function AdminLayout() {
  const navigate = useNavigate()

  function logout() {
    setAdminToken(null)
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-100">
      <div className="flex min-h-[100dvh] flex-col md:flex-row">
        <aside className="w-full border-b border-slate-800 bg-slate-900/95 md:w-60 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between gap-2 px-4 pb-5 safe-pt-sticky md:block">
            <p className="text-lg font-extrabold tracking-tight text-white">
              Nserve Admin
            </p>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col md:px-3">
            <NavLink
              to="/admin/dashboard"
              className={({ isActive }) =>
                `${link} ${isActive ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`
              }
            >
              <LayoutDashboard className="h-5 w-5 shrink-0" />
              Dashboard
            </NavLink>
            <NavLink
              to="/admin/players"
              className={({ isActive }) =>
                `${link} ${isActive ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`
              }
            >
              <Users className="h-5 w-5 shrink-0" />
              Players
            </NavLink>
            <NavLink
              to="/admin/quizzes"
              className={({ isActive }) =>
                `${link} ${isActive ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`
              }
            >
              <ListChecks className="h-5 w-5 shrink-0" />
              Quizzes
            </NavLink>
            <NavLink
              to="/admin/quizzes/new"
              className={({ isActive }) =>
                `${link} ${isActive ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`
              }
            >
              <PlusCircle className="h-5 w-5 shrink-0" />
              Add Quiz
            </NavLink>
          </nav>
          <button
            type="button"
            onClick={logout}
            className="mt-4 hidden w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white md:flex"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </aside>
        <main className="flex-1 overflow-auto px-4 pb-4 md:px-8 md:pb-8 safe-pt-header">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
