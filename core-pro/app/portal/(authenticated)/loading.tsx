import { Skeleton } from "@/components/ui/skeleton"

// Streaming fallback for the client portal. Mirrors the slim PageHeader +
// list layout shared across portal pages (messages, forms, documents,
// progress).
export default function PortalLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <Skeleton className="h-40" />
      <Skeleton className="h-40" />
    </div>
  )
}
