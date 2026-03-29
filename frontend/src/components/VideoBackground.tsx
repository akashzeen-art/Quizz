const DEFAULT_VIDEO =
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'

type Props = {
  src?: string
  className?: string
  /** Stronger purple wash (Quizzo splash) vs darker arena */
  variant?: 'quizzo' | 'arena'
}

export function VideoBackground({
  src = DEFAULT_VIDEO,
  className = '',
  variant = 'arena',
}: Props) {
  const wash =
    variant === 'quizzo'
      ? 'from-violet-600/85 via-purple-800/80 to-indigo-950/90'
      : 'from-[#1a0a2e]/80 via-[#2d1b4e]/75 to-[#0f0820]/95'

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <video
        className="absolute min-h-full min-w-full object-cover opacity-90"
        autoPlay
        muted
        loop
        playsInline
      >
        <source src={src} type="video/mp4" />
      </video>
      <div className={`absolute inset-0 bg-gradient-to-b ${wash}`} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.12),transparent_55%)]" />
    </div>
  )
}
