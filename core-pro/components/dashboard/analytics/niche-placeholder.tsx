import { Sparkles } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// Niche extension slot. A specialized fork of the boilerplate replaces this
// component with real niche-specific metrics (FitCore: workouts completed /
// program adherence; EstateCore: listings active / avg DOM; etc.).
export function NicheMetricsPlaceholder() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-muted-foreground" />
          Niche metrics
        </CardTitle>
        <CardDescription>
          Replace this slot with KPIs and charts specific to your niche
          (programs, listings, sessions, …). Wire them up in{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
            components/dashboard/analytics/niche-placeholder.tsx
          </code>
          .
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
          No niche-specific metrics configured yet.
        </div>
      </CardContent>
    </Card>
  )
}
