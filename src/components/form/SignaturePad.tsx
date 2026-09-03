'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Draw-to-sign capture.
 *
 * The legacy form took the signature as a line of typed text, which is not
 * meaningfully a signature on a document that certifies electrical safety. This
 * records the actual strokes and hands back a PNG data URL for the PDF.
 */
export function SignaturePad({
  value,
  onChange,
  ariaLabel = 'Signature',
}: {
  value: string
  onChange: (dataUrl: string) => void
  ariaLabel?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawing = useRef(false)
  const hasStrokes = useRef(false)
  const [isEmpty, setIsEmpty] = useState(!value)

  // Size the backing store to the device pixel ratio so strokes are not blurry
  // on the phones and tablets these get filled in on.
  const resize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = window.devicePixelRatio || 1
    const { width, height } = canvas.getBoundingClientRect()
    if (!width || !height) return

    const snapshot = hasStrokes.current ? canvas.toDataURL('image/png') : null
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#1c2430'

    if (snapshot) {
      const image = new Image()
      image.onload = () => ctx.drawImage(image, 0, 0, width, height)
      image.src = snapshot
    }
  }, [])

  useEffect(() => {
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [resize])

  const positionOf = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    // Capture keeps the stroke alive if the pointer leaves the canvas mid-signature.
    // It is not essential, and it throws for pointer ids the browser no longer
    // considers active, so a failure here must not abort the stroke.
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Drawing still works without capture.
    }
    drawing.current = true
    const { x, y } = positionOf(event)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = positionOf(event)
    ctx.lineTo(x, y)
    ctx.stroke()
    hasStrokes.current = true
    if (isEmpty) setIsEmpty(false)
  }

  const end = () => {
    if (!drawing.current) return
    drawing.current = false
    const canvas = canvasRef.current
    if (!canvas || !hasStrokes.current) return
    onChange(canvas.toDataURL('image/png'))
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    hasStrokes.current = false
    setIsEmpty(true)
    onChange('')
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        aria-label={ariaLabel}
        role="img"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerCancel={end}
        className="h-36 w-full touch-none rounded-md border border-line bg-white"
      />
      <div className="mt-1 flex items-center justify-between text-xs text-muted">
        <span>{isEmpty ? 'Sign above using a finger, stylus or mouse.' : 'Signed.'}</span>
        <button
          type="button"
          onClick={clear}
          className="rounded border border-line px-2 py-1 font-medium text-ink transition hover:bg-accent-soft"
        >
          Clear
        </button>
      </div>
    </div>
  )
}
