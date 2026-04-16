import Link from "next/link"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ClientListItem } from "@/lib/db/queries/clients"

// ─────────────────────────────────────────────────────────────────────────────
// <ClientCard>
//
// Compact card used by tag filter panels and empty-state hints. The list page
// renders rows as a table (denser information) — cards are kept around for
// segments where the table is overkill (e.g. a "Recently added" widget).
// ─────────────────────────────────────────────────────────────────────────────
export function ClientCard({ item }: { item: ClientListItem }) {
  const initials = item.client.fullName
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <Link
      href={`/dashboard/clients/${item.client.id}`}
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50",
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar>
          {item.client.avatarUrl && <AvatarImage src={item.client.avatarUrl} />}
          <AvatarFallback>{initials || "?"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">
            {item.client.fullName}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {item.client.email}
          </p>
        </div>
        <Badge variant="outline" className="text-xs capitalize">
          {item.relationship.status}
        </Badge>
      </div>
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              className="text-[10px]"
              style={{ borderColor: tag.color, color: tag.color }}
            >
              {tag.name}
            </Badge>
          ))}
        </div>
      )}
    </Link>
  )
}
