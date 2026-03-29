import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_NAME } from '../constants/branding'
import { isCategoryCountValid } from '../constants/categories'
import { usePreferVideo } from '../hooks/usePreferVideo'
import { useApp } from '../context/AppContext'
import { GeometricOverlay } from './GeometricOverlay'
import { VideoBackground } from './VideoBackground'

export function SplashScreen() {
  const navigate = useNavigate()
  const { token, user, loading } = useApp()
  const preferVideo = usePreferVideo()
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setProgress((p) => (p >= 100 ? 100 : p + 3))
    }, 90)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (loading) return
    if (progress < 100) return
    const t = setTimeout(() => {
      if (!token) navigate('/auth', { replace: true })
      else if (
        !user?.categories ||
        !isCategoryCountValid(user.categories.length)
      )
        navigate('/categories', { replace: true })
      else navigate('/home', { replace: true })
    }, 400)
    return () => clearTimeout(t)
  }, [loading, navigate, progress, token, user?.categories?.length])

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-violet-600 via-purple-800 to-indigo-950">
      {preferVideo ? <VideoBackground variant="quizzo" /> : null}
      <GeometricOverlay />

      <div className="relative z-10 flex min-h-[100dvh] flex-col px-6 safe-pt-header">
        <motion.p
          className="text-center text-lg font-bold tracking-wide text-white drop-shadow-md"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {APP_NAME}
        </motion.p>

        <div className="flex flex-1 flex-col items-center justify-center">
          <motion.div
            className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-white/50 bg-white/15 shadow-[0_0_60px_rgba(255,255,255,0.35)] backdrop-blur-md"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <motion.span
              className="text-6xl font-extrabold text-white"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              Q
            </motion.span>
          </motion.div>

          <motion.p
            className="mt-8 text-lg font-medium text-white/95"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            Loading...
          </motion.p>
        </div>

        <div className="w-full max-w-sm shrink-0 pb-12">
          <div className="mb-2 flex justify-between text-xs font-medium text-white/70">
            <span>Loading</span>
            <span>{Math.min(100, progress)}%</span>
          </div>
          <div className="h-3.5 overflow-hidden rounded-full bg-white">
            <motion.div
              className="h-full rounded-full bg-[#FFB800] shadow-[0_0_20px_rgba(255,184,0,0.5)]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.15 }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
