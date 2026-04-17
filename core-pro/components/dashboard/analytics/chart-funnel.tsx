import { cn } from "@/lib/utils"

import { EmptyPlot } from "./chart-area"

export type FunnelStage = {
  stage: string
  count: number
  color?: string | null
}

export function ChartFunnel({
  data,
  height = 220,
  className,
}: {
  data: FunnelStage[]
  height?: number
  className?: string
}) {
  const max = Math.max(...data.map((d) => d.count), 0)
  if (max === 0) {
    return <EmptyPlot height={height} className={className} label="No leads in range" />
  }
  return (
    <div className={cn("w-full space-y-2", className)} style={{ minHeight: height }}>
      {data.map((row, i) => {
        const pct = (row.count / max) * 100
        const prev = i === 0 ? null : data[i - 1]!.count
        const dropPct = prev && prev > 0 ? Math.round((row.count / prev) * 100) : null
        return (
          <div key={row.stage} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{row.stage}</span>
              <span className="tabular-nums text-muted-foreground">
                {row.count}
                {dropPct !== null && (
                  <span className="ml-2 text-[10px]">({dropPct}%)</span>
                )}
              </span>
            </div>
            <div className="relative h-6 overflow-hidden rounded-md bg-muted">
              <div
                className="h-full rounded-md transition-[width]"
                style={{
                  width: `${Math.max(pct, 2)}%`,
                  backgroundColor: row.color ?? "var(--primary)",
                  opacity: 0.9,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
