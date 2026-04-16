"use client"

import { useEffect, useImperativeHandle, useRef } from "react"

import type { SocialTemplateDesign } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// <SocialCanvas>
//
// Pure Canvas 2D renderer. Also the PNG export surface — `ref.export()` returns
// a Blob so the parent can trigger a download without html2canvas / puppeteer.
//
// Why canvas and not HTML? Canvas captures exactly what the user sees (no
// font-loading race, no off-screen DOM cloning) and produces sharp output at
// the real export dimensions. It also avoids adding a runtime dep.
// ─────────────────────────────────────────────────────────────────────────────

export type SocialCanvasHandle = {
  toBlob: () => Promise<Blob | null>
  toDataUrl: () => string | null
}

export type SocialCanvasProps = {
  width: number
  height: number
  design: SocialTemplateDesign
  professionalName: string
  // Cap the on-screen width so the canvas stays tidy inside the editor; the
  // bitmap is still rendered at `width × height` for a clean export.
  displayMaxWidth?: number
  ref?: React.Ref<SocialCanvasHandle>
}

export function SocialCanvas({
  width,
  height,
  design,
  professionalName,
  displayMaxWidth = 420,
  ref,
}: SocialCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useImperativeHandle(
    ref,
    () => ({
      toBlob: () =>
        new Promise((resolve) => {
          const c = canvasRef.current
          if (!c) return resolve(null)
          c.toBlob((blob) => resolve(blob), "image/png")
        }),
      toDataUrl: () => canvasRef.current?.toDataURL("image/png") ?? null,
    }),
    [],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    drawSocialDesign(ctx, { width, height, design, professionalName })
  }, [width, height, design, professionalName])

  // Preserve aspect ratio on screen; browser scales the high-res bitmap down.
  const ratio = height / width
  const displayWidth = Math.min(displayMaxWidth, width)
  const displayHeight = displayWidth * ratio

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: `${displayWidth}px`,
        height: `${displayHeight}px`,
        borderRadius: 12,
        boxShadow: "0 2px 8px rgba(15,23,42,0.12)",
      }}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawing
// ─────────────────────────────────────────────────────────────────────────────
function drawSocialDesign(
  ctx: CanvasRenderingContext2D,
  args: {
    width: number
    height: number
    design: SocialTemplateDesign
    professionalName: string
  },
) {
  const { width, height, design, professionalName } = args
  const primary = design.primaryColor ?? "#6366f1"
  const secondary = design.secondaryColor ?? "#f59e0b"
  const textColor = design.textColor ?? "#ffffff"
  const title = substitute(design.title ?? "", professionalName)
  const body = substitute(design.body ?? "", professionalName)
  const cta = substitute(design.cta ?? "", professionalName)
  const author = substitute(design.author ?? "", professionalName)

  // Background — optional gradient.
  if (design.backgroundStyle === "gradient") {
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, primary)
    gradient.addColorStop(1, secondary)
    ctx.fillStyle = gradient
  } else {
    ctx.fillStyle = primary
  }
  ctx.fillRect(0, 0, width, height)

  // Decorative accent bar.
  ctx.fillStyle = secondary
  ctx.fillRect(0, 0, Math.max(6, Math.round(width * 0.012)), height)

  // Text block — centered, with generous margin.
  const margin = Math.round(width * 0.08)
  const textWidth = width - margin * 2
  ctx.fillStyle = textColor
  ctx.textBaseline = "top"

  // Title
  let cursor = Math.round(height * 0.16)
  if (title) {
    const fontSize = Math.round(height * 0.06)
    ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
    cursor = drawWrappedText(ctx, title, {
      x: margin,
      y: cursor,
      maxWidth: textWidth,
      lineHeight: fontSize * 1.15,
    })
    cursor += Math.round(height * 0.03)
  }

  // Body
  if (body) {
    const fontSize = Math.round(height * 0.035)
    ctx.font = `400 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
    cursor = drawWrappedText(ctx, body, {
      x: margin,
      y: cursor,
      maxWidth: textWidth,
      lineHeight: fontSize * 1.4,
    })
    cursor += Math.round(height * 0.04)
  }

  // CTA pill
  if (cta) {
    const padding = Math.round(height * 0.018)
    const fontSize = Math.round(height * 0.028)
    ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
    const textMetrics = ctx.measureText(cta)
    const pillWidth = textMetrics.width + padding * 3
    const pillHeight = fontSize + padding * 2
    ctx.fillStyle = secondary
    roundRect(ctx, margin, cursor, pillWidth, pillHeight, pillHeight / 2)
    ctx.fill()
    ctx.fillStyle = contrastColor(secondary)
    ctx.fillText(cta, margin + padding * 1.5, cursor + padding + 1)
    cursor += pillHeight + Math.round(height * 0.03)
    ctx.fillStyle = textColor
  }

  // Footer — author / pro name.
  const footerFontSize = Math.round(height * 0.022)
  ctx.font = `500 ${footerFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
  ctx.globalAlpha = 0.85
  const footer = author || professionalName || ""
  if (footer) {
    const metrics = ctx.measureText(footer)
    ctx.fillText(
      footer,
      width - margin - metrics.width,
      height - margin - footerFontSize,
    )
  }
  ctx.globalAlpha = 1

  // Top-left wordmark — keeps the design feeling branded even without a logo.
  const wordmarkSize = Math.round(height * 0.022)
  ctx.font = `700 ${wordmarkSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
  ctx.globalAlpha = 0.75
  ctx.fillText(
    (professionalName || "").toUpperCase(),
    margin,
    margin,
  )
  ctx.globalAlpha = 1
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  opts: { x: number; y: number; maxWidth: number; lineHeight: number },
): number {
  const paragraphs = text.split(/\r?\n/)
  let y = opts.y
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    let line = ""
    for (const word of words) {
      const next = line ? `${line} ${word}` : word
      const metrics = ctx.measureText(next)
      if (metrics.width > opts.maxWidth && line) {
        ctx.fillText(line, opts.x, y)
        y += opts.lineHeight
        line = word
      } else {
        line = next
      }
    }
    if (line) {
      ctx.fillText(line, opts.x, y)
      y += opts.lineHeight
    } else if (paragraphs.length > 1) {
      y += opts.lineHeight
    }
  }
  return y
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

// Simple luminance check so the CTA text stays legible against its background.
function contrastColor(hex: string): string {
  const c = hex.replace("#", "")
  if (c.length !== 6) return "#111827"
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? "#111827" : "#ffffff"
}

function substitute(s: string, professionalName: string): string {
  return s.replace(/{{\s*professional_name\s*}}/g, professionalName || "")
}
