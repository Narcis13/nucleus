import type { ReactNode } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type KpiCardProps = {
  label: string
  value: string | number
  hint?: string
  icon?: ReactNode
  trend?: {
    value: number
    label?: string
  }
  size?: "sm" | "default"
  className?: string
}

export function KpiCard({
  label,
  value,
  hint,
  icon,
  trend,
  size = "default",
  className,
}: KpiCardProps) {
  const positive = trend ? trend.value >= 0 : false
  return (
    <Card size={size === "sm" ? "sm" : "default"} className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span className="uppercase tracking-wide">{label}</span>
          {icon && (
            <span className="text-muted-foreground [&>svg]:size-4">
              {icon}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="font-heading text-2xl font-semibold tabular-nums text-foreground">
          {value}
        </div>
        {(hint || trend) && (
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            {trend && (
              <span
                className={cn(
                  "font-medium",
                  positive ? "text-emerald-600" : "text-rose-600",
                )}
              >
                {positive ? "+" : ""}
                {trend.value}%
                {trend.label && <span className="ml-1 font-normal text-muted-foreground">{trend.label}</span>}
              </span>
            )}
            {hint && <span>{hint}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
