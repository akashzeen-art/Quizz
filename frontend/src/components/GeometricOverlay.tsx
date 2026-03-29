/** Subtle hex / cube motif over purple gradients (mockup reference). */
export function GeometricOverlay({ className = '' }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 opacity-[0.12] ${className}`}
      aria-hidden
    >
      <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id="hex"
            width="56"
            height="100"
            patternUnits="userSpaceOnUse"
            patternTransform="scale(0.75)"
          >
            <path
              d="M28 2 L52 16 L52 44 L28 58 L4 44 L4 16 Z"
              fill="none"
              stroke="white"
              strokeWidth="1.2"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hex)" />
      </svg>
    </div>
  )
}
