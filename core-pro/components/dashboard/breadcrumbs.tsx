"use client"

import type { Route } from "next"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// <Breadcrumbs>
//
// Derives a trail from the current pathname, e.g.
//   /dashboard/clients/123  →  Dashboard › Clients › 123
//
// The root ("/dashboard") is always the first crumb and links back to the
// overview. Segments that look like uuids/ids (32+ hex chars or a pure number)
// are rendered as-is without linking; intermediate segments are linked. The
// current segment is the heading — no link, no hover.
// ─────────────────────────────────────────────────────────────────────────────
type Crumb = { label: string; href: string; isCurrent: boolean }

const ROOT_LABEL = "Dashboard"

function titleCase(segment: string): string {
  // Route-group / private segments like (marketing) or _niche are already
  // stripped by Next.js before they reach the URL, so we only deal with
  // plain kebab/snake case here.
  return segment
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function isOpaqueId(segment: string): boolean {
  if (/^\d+$/.test(segment)) return true
  if (/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(segment)) return true
  if (segment.length >= 24 && /^[0-9a-zA-Z_-]+$/.test(segment)) return true
  return false
}

export function Breadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname() ?? "/dashboard"
  const crumbs = buildCrumbs(pathname)

  // Only render the component when there's a meaningful trail. On the bare
  // /dashboard route the page's own header already says "Dashboard" — the
  // breadcrumb would just be noise.
  if (crumbs.length <= 1) return null

  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm", className)}>
      <ol className="flex flex-wrap items-center gap-1 text-muted-foreground">
        {crumbs.map((crumb, i) => (
          <li key={crumb.href} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight
                className="size-3.5 shrink-0 text-muted-foreground/60"
                aria-hidden
              />
            )}
            {crumb.isCurrent ? (
              <span className="font-medium text-foreground">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href as Route}
                className="transition-colors hover:text-foreground"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

function buildCrumbs(pathname: string): Crumb[] {
  const parts = pathname.split("/").filter(Boolean)
  if (parts.length === 0 || parts[0] !== "dashboard") return []

  const crumbs: Crumb[] = [
    {
      label: ROOT_LABEL,
      href: "/dashboard",
      isCurrent: parts.length === 1,
    },
  ]

  let acc = "/dashboard"
  for (let i = 1; i < parts.length; i++) {
    const segment = parts[i]!
    acc = `${acc}/${segment}`
    const isLast = i === parts.length - 1
    crumbs.push({
      label: isOpaqueId(segment) ? segment : titleCase(segment),
      href: acc,
      isCurrent: isLast,
    })
  }

  return crumbs
}
