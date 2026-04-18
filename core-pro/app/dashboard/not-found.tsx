import Link from "next/link"
import { FileQuestion } from "lucide-react"

import { EmptyState, PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"

// Dashboard-scoped not-found — used when `notFound()` is called inside a
// dashboard route (e.g. a bogus client or form id). Keeps the dashboard
// shell rather than falling through to the app-level 404.
export default function DashboardNotFound() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Not found"
        description="We couldn't find what you were looking for."
      />
      <EmptyState
        icon={<FileQuestion />}
        title="This record doesn't exist"
        description="It may have been deleted, or the link you followed is out of date."
        action={
          <Button nativeButton={false} render={<Link href="/dashboard" />}>
            Back to dashboard
          </Button>
        }
      />
    </div>
  )
}
