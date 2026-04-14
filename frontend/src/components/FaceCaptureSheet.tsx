import { useEffect, useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'
import { toast } from 'sonner'

export function FaceCaptureSheet({
  open,
  title,
  onClose,
  onCapture,
}: {
  open: boolean
  title: string
  onClose: () => void
  onCapture: (image: Blob) => Promise<void>
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        })
        if (cancelled) return
        streamRef.current = stream
        const v = videoRef.current
        if (v) {
          v.srcObject = stream
          await v.play()
        }
      } catch (e) {
        toast.error('Camera permission denied')
        onClose()
      }
    })()
    return () => {
      cancelled = true
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [open, onClose])

  async function snap() {
    const v = videoRef.current
    if (!v) return
    const w = v.videoWidth || 640
    const h = v.videoHeight || 480
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(v, 0, 0, w, h)
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9),
    )
    if (!blob) return
    setBusy(true)
    try {
      await onCapture(blob)
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] bg-black/60">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close"
        onClick={() => {
          if (!busy) onClose()
        }}
      />
      <div className="absolute bottom-0 left-0 right-0 mx-auto w-full max-w-md rounded-t-3xl bg-white p-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <p className="text-sm font-extrabold text-slate-900">{title}</p>
          <button
            type="button"
            className="rounded-full bg-slate-100 p-2 text-slate-700"
            onClick={onClose}
            disabled={busy}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 overflow-hidden rounded-2xl bg-slate-900">
          <video ref={videoRef} playsInline className="h-64 w-full object-cover" />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void snap()}
          className="btn-app-primary mt-4 py-4"
        >
          <Camera className="h-5 w-5" />
          {busy ? 'Verifying…' : 'Capture'}
        </button>
      </div>
    </div>
  )
}

