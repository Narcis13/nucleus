import Link from "next/link"
import {
  Calendar,
  FileText,
  FolderOpen,
  MessageCircle,
  Receipt,
  Target,
  UserPlus,
  Users,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ActivityFeedItem } from "@/lib/analytics/queries"
import { cn } from "@/lib/utils"

const ICON_BY_TYPE: Record<ActivityFeedItem["type"], typeof Users> = {
  client_added: UserPlus,
  lead_new: Target,
  lead_converted: Users,
  appointment: Calendar,
  invoice: Receipt,
  message: MessageCircle,
  form: FileText,
  document: FolderOpen,
}

export function ActivityFeed({
  items,
  className,
}: {
  items: ActivityFeedItem[]
  className?: string
}) {
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Recent activity</span>
          <span className="text-xs font-normal text-muted-foreground">
            last {items.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            Activity from your clients, leads, and invoices will appear here.
          </p>
        ) : (
          <ol className="space-y-3">
            {items.map((item) => {
              const Icon = ICON_BY_TYPE[item.type]
              const body = (
                <div className="flex gap-3">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{item.title}</p>
                    {item.description && (
                      <p className="truncate text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {formatRelative(item.occurredAt)}
                    </p>
                  </div>
                </div>
              )
              return (
                <li key={item.id}>
                  {item.href ? (
                    <Link
                      href={item.href as never}
                      className="block rounded-md p-2 -mx-2 hover:bg-muted/60"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="p-2 -mx-2">{body}</div>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const mins = Math.round(diffMs / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days}d ago`
  return date.toLocaleDateString()
}
