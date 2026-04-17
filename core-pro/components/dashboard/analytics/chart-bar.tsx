import { cn } from "@/lib/utils"

import { EmptyPlot } from "./chart-area"

export type BarChartPoint = {
  label: string
  values: Array<{ key: string; value: number; color?: string }>
}

// Stacked bar chart. If each point has a single value it renders as a simple
// column chart; multiple values per point stack vertically.
export function ChartBar({
  data,
  height = 220,
  className,
  valueFormatter = (v) => v.toString(),
}: {
  data: BarChartPoint[]
  height?: number
  className?: string
  valueFormatter?: (value: number) => string
}) {
  if (data.length === 0) {
    return <EmptyPlot height={height} className={className} label="No data in range" />
  }

  const width = 600
  const padding = { top: 16, right: 16, bottom: 32, left: 48 }
  const plotW = width - padding.left - padding.right
  const plotH = height - padding.top - padding.bottom

  const max = Math.max(
    1,
    ...data.map((d) => d.values.reduce((s, v) => s + v.value, 0)),
  )
  const barGap = 8
  const barW = Math.max(4, (plotW - barGap * (data.length - 1)) / data.length)

  const ticks = [0, 0.5, 1].map((t) => ({
    value: Math.round(max * t),
    y: padding.top + plotH * (1 - t),
  }))

  const seriesKeys = Array.from(
    new Set(data.flatMap((d) => d.values.map((v) => v.key))),
  )
  const colorFor = (key: string, fallback?: string) => {
    if (fallback) return fallback
    const idx = seriesKeys.indexOf(key)
    const palette = [
      "var(--primary)",
      "var(--accent)",
      "#0ea5e9",
      "#22c55e",
      "#f59e0b",
      "#ef4444",
    ]
    return palette[idx % palette.length]
  }

  return (
    <div className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        role="img"
        aria-label="Bar chart"
      >
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
        {data.map((d, i) => {
          const x = padding.left + i * (barW + barGap)
          let acc = 0
          return (
            <g key={d.label}>
              {d.values.map((v) => {
                const h = (v.value / max) * plotH
                const y = padding.top + plotH - acc - h
                acc += h
                return (
                  <rect
                    key={v.key}
                    x={x}
                    y={y}
                    width={barW}
                    height={Math.max(0, h)}
                    rx={3}
                    fill={colorFor(v.key, v.color)}
                    opacity={0.9}
                  />
                )
              })}
              {i % Math.max(1, Math.ceil(data.length / 8)) === 0 && (
                <text
                  x={x + barW / 2}
                  y={height - padding.bottom + 16}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px]"
                >
                  {shortDate(d.label)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      {seriesKeys.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-3 px-2 text-xs text-muted-foreground">
          {seriesKeys.map((key) => (
            <div key={key} className="flex items-center gap-1.5">
              <span
                className="inline-block size-2.5 rounded-sm"
                style={{ backgroundColor: colorFor(key) }}
              />
              <span className="capitalize">{key}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function shortDate(label: string): string {
  const parts = label.split("-")
  if (parts.length === 3) return `${parts[1]}/${parts[2]}`
  return label
}
