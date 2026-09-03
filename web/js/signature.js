/**
 * Draw-to-sign capture.
 *
 * The legacy form took the signature as a line of typed text, which is not
 * meaningfully a signature on a document certifying electrical safety. This
 * records the actual strokes and hands back a PNG data URL for the PDF.
 */

export function createSignaturePad(canvas, { onChange }) {
  let drawing = false
  let hasStrokes = false

  // Size the backing store to the device pixel ratio so strokes are not blurry
  // on the phones and tablets these get filled in on.
  function resize() {
    const { width, height } = canvas.getBoundingClientRect()
    if (!width || !height) return

    const ratio = window.devicePixelRatio || 1
    const snapshot = hasStrokes ? canvas.toDataURL('image/png') : null

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
  }

  function positionOf(event) {
    const rect = canvas.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  function start(event) {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // Capture keeps the stroke alive if the pointer leaves the canvas mid
    // signature. It is not essential, and it throws for pointer ids the browser
    // no longer considers active, so a failure must not abort the stroke.
    try {
      canvas.setPointerCapture(event.pointerId)
    } catch {
      // Drawing still works without capture.
    }
    drawing = true
    const { x, y } = positionOf(event)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function move(event) {
    if (!drawing) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { x, y } = positionOf(event)
    ctx.lineTo(x, y)
    ctx.stroke()
    hasStrokes = true
  }

  function end() {
    if (!drawing) return
    drawing = false
    if (!hasStrokes) return
    onChange(canvas.toDataURL('image/png'))
  }

  function clear() {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    hasStrokes = false
    onChange('')
  }

  canvas.addEventListener('pointerdown', start)
  canvas.addEventListener('pointermove', move)
  canvas.addEventListener('pointerup', end)
  canvas.addEventListener('pointerleave', end)
  canvas.addEventListener('pointercancel', end)
  window.addEventListener('resize', resize)
  resize()

  return {
    clear,
    isEmpty: () => !hasStrokes,
  }
}
