import { cn } from "@/lib/utils"

// Lightweight SVG area chart. Renders a filled polygon between a baseline and
// the data line plus a stroked path on top. Null-safe on empty datasets —
// returns a muted placeholder instead of a broken svg.
export type AreaChartPoint = {
  label: string
  value: number
}

export function ChartArea({
  data,
  height = 200,
  className,
  valueFormatter = (v) => v.toString(),
}: {
  data: AreaChartPoint[]
  height?: number
  className?: string
  valueFormatter?: (value: number) => string
}) {
  if (data.length === 0) {
    return (
      <EmptyPlot height={height} className={className} label="No data in range" />
    )
  }

  const width = 600
  const padding = { top: 16, right: 16, bottom: 28, left: 40 }
  const plotW = width - padding.left - padding.right
  const plotH = height - padding.top - padding.bottom

  const max = Math.max(1, ...data.map((d) => d.value))
  const stepX = data.length > 1 ? plotW / (data.length - 1) : 0
  const pts = data.map((d, i) => {
    const x = padding.left + i * stepX
    const y = padding.top + (plotH - (d.value / max) * plotH)
    return { x, y, ...d }
  })

  const line = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ")
  const area = `${line} L ${pts[pts.length - 1]!.x.toFixed(1)} ${padding.top + plotH} L ${pts[0]!.x.toFixed(1)} ${padding.top + plotH} Z`

  const ticks = [0, 0.5, 1].map((t) => ({
    value: Math.round(max * t),
    y: padding.top + plotH * (1 - t),
  }))

  return (
    <div className={cn("w-full overflow-hidden", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        role="img"
        aria-label="Area chart"
      >
        <defs>
          <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t.y}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={t.y}
              y2={t.y}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeDasharray="2 3"
            />
            <text
              x={padding.left - 6}
              y={t.y + 3}
              textAnchor="end"
              className="fill-muted-foreground text-[10px]"
            >
              {valueFormatter(t.value)}
            </text>
          </g>
        ))}
        <path d={area} fill="url(#chart-area-grad)" />
        <path
          d={line}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map((p) => (
          <circle key={p.label} cx={p.x} cy={p.y} r={3} fill="var(--primary)" />
        ))}
        {pts.map((p, i) =>
          i % Math.max(1, Math.ceil(pts.length / 6)) === 0 ? (
            <text
              key={`lbl-${p.label}`}
              x={p.x}
              y={height - padding.bottom + 16}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {shortenLabel(p.label)}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  )
}

function shortenLabel(label: string): string {
  // Dates look like 2026-04-17 → 04-17
  const parts = label.split("-")
  if (parts.length === 3) return `${parts[1]}/${parts[2]}`
  return label.length > 8 ? `${label.slice(0, 8)}…` : label
}

export function EmptyPlot({
  height,
  label,
  className,
}: {
  height: number
  label: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground",
        className,
      )}
      style={{ height }}
    >
      {label}
    </div>
  )
}
