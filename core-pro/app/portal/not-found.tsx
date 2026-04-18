import Link from "next/link"
import { FileQuestion } from "lucide-react"

import { EmptyState, PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"

export default function PortalNotFound() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Not found"
        description="That page isn't available on the portal."
      />
      <EmptyState
        icon={<FileQuestion />}
        title="Nothing here"
        description="The professional may have removed this item, or the link is outdated."
        action={
          <Button nativeButton={false} render={<Link href="/portal" />}>
            Back to portal home
          </Button>
        }
      />
    </div>
  )
}
