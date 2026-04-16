"use client"

import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"

// Canvas-based signature capture. Exports a data URL on change so the form
// renderer can treat the signature like any other string value. Supports
// mouse + touch + stylus via pointer events, and a "Clear" button that resets
// both the canvas and the form value.
export function SignaturePad({
  value,
  onChange,
  invalid,
  readOnly,
}: {
  value: string | null
  onChange: (dataUrl: string | null) => void
  invalid?: boolean
  readOnly?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [drawing, setDrawing] = useState(false)

  // Initial paint / restore — when `value` is set externally, redraw it
  // so the preview shows on reload or when rendering a response read-only.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    // Size the backing store to the container to keep lines crisp on HiDPI
    // displays without re-layout when the parent resizes.
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = "#111827"

    if (value) {
      const img = new Image()
      img.onload = () => {
        ctx.clearRect(0, 0, rect.width, rect.height)
        ctx.drawImage(img, 0, 0, rect.width, rect.height)
      }
      img.src = value
    } else {
      ctx.clearRect(0, 0, rect.width, rect.height)
    }
  }, [value])

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    canvas.setPointerCapture(e.pointerId)
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
    setDrawing(true)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
  }

  const finishStroke = () => {
    if (!drawing) return
    setDrawing(false)
    const canvas = canvasRef.current
    if (!canvas) return
    onChange(canvas.toDataURL("image/png"))
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.clearRect(0, 0, rect.width, rect.height)
    onChange(null)
  }

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        className={
          "h-40 w-full rounded-lg border bg-background touch-none " +
          (invalid ? "border-destructive" : "border-input")
        }
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishStroke}
        onPointerLeave={finishStroke}
        onPointerCancel={finishStroke}
      />
      {!readOnly && (
        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
            Clear
          </Button>
        </div>
      )}
    </div>
  )
}
