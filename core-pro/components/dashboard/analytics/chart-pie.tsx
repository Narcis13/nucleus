import { cn } from "@/lib/utils"

import { EmptyPlot } from "./chart-area"

export type PieChartSlice = {
  label: string
  value: number
  color?: string
}

const PALETTE = [
  "var(--primary)",
  "#0ea5e9",
  "#8b5cf6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#14b8a6",
]

export function ChartPie({
  data,
  height = 220,
  className,
}: {
  data: PieChartSlice[]
  height?: number
  className?: string
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) {
    return <EmptyPlot height={height} className={className} label="No data in range" />
  }

  const cx = height / 2
  const cy = height / 2
  const radius = height / 2 - 8
  const inner = radius * 0.6

  const filtered = data.filter((d) => d.value > 0)
  const slices: Array<PieChartSlice & {
    startAngle: number
    endAngle: number
    color: string
  }> = []
  let acc = 0
  for (let i = 0; i < filtered.length; i++) {
    const d = filtered[i]!
    const startAngle = (acc / total) * Math.PI * 2
    acc += d.value
    const endAngle = (acc / total) * Math.PI * 2
    slices.push({
      ...d,
      startAngle,
      endAngle,
      color: d.color ?? PALETTE[i % PALETTE.length]!,
    })
  }

  return (
    <div className={cn("flex w-full items-center gap-6", className)}>
      <svg
        width={height}
        height={height}
        viewBox={`0 0 ${height} ${height}`}
        role="img"
        aria-label="Pie chart"
      >
        {slices.map((s) => (
          <path
            key={s.label}
            d={arcPath(cx, cy, radius, inner, s.startAngle, s.endAngle)}
            fill={s.color}
            opacity={0.9}
          />
        ))}
      </svg>
      <ul className="flex-1 space-y-1.5 text-xs">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span
                className="inline-block size-2.5 rounded-sm"
                style={{ backgroundColor: s.color }}
              />
              <span className="capitalize text-foreground">{s.label}</span>
            </span>
            <span className="tabular-nums text-muted-foreground">
              {s.value} · {Math.round((s.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  ir: number,
  start: number,
  end: number,
): string {
  // Full-circle case: draw two halves so the arc renders correctly.
  if (end - start >= Math.PI * 2 - 0.0001) {
    return `
      M ${cx + r} ${cy}
      A ${r} ${r} 0 1 1 ${cx - r} ${cy}
      A ${r} ${r} 0 1 1 ${cx + r} ${cy}
      M ${cx + ir} ${cy}
      A ${ir} ${ir} 0 1 0 ${cx - ir} ${cy}
      A ${ir} ${ir} 0 1 0 ${cx + ir} ${cy}
      Z
    `
  }
  const large = end - start > Math.PI ? 1 : 0
  const x1 = cx + Math.cos(start - Math.PI / 2) * r
  const y1 = cy + Math.sin(start - Math.PI / 2) * r
  const x2 = cx + Math.cos(end - Math.PI / 2) * r
  const y2 = cy + Math.sin(end - Math.PI / 2) * r
  const x3 = cx + Math.cos(end - Math.PI / 2) * ir
  const y3 = cy + Math.sin(end - Math.PI / 2) * ir
  const x4 = cx + Math.cos(start - Math.PI / 2) * ir
  const y4 = cy + Math.sin(start - Math.PI / 2) * ir
  return `
    M ${x1} ${y1}
    A ${r} ${r} 0 ${large} 1 ${x2} ${y2}
    L ${x3} ${y3}
    A ${ir} ${ir} 0 ${large} 0 ${x4} ${y4}
    Z
  `
}
