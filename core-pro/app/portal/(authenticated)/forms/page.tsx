import { CheckCircle2, Clock, FileText, Inbox } from "lucide-react"
import Link from "next/link"

import { EmptyState, PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { getPortalAssignments } from "@/lib/db/queries/portal"
import { requirePortalSession } from "@/lib/portal-auth/session"

export default async function PortalFormsPage() {
  const session = await requirePortalSession()
  const assignments = await getPortalAssignments(session.clientId)

  if (assignments.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Forms"
          description="Complete intake forms, questionnaires, and check-ins from your professional."
        />
        <EmptyState
          icon={<FileText />}
          title="No forms to fill out"
          description="When your professional assigns you a form, it will show up here."
        />
        <AboutMeLink />
      </div>
    )
  }

  const pending = assignments.filter((a) => a.assignment.status !== "completed")
  const completed = assignments.filter((a) => a.assignment.status === "completed")

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Forms"
        description={`${pending.length} to fill · ${completed.length} completed.`}
      />

      {pending.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-base font-semibold text-foreground">
            To do
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {pending.map(({ assignment, form }) => (
              <Link
                key={assignment.id}
                href={`/portal/forms/${assignment.id}`}
                className="block"
              >
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-heading text-base font-semibold text-foreground">
                        {form.title}
                      </h3>
                      <Badge
                        variant="outline"
                        className="gap-1 whitespace-nowrap"
                      >
                        <Clock className="size-3" />
                        Pending
                      </Badge>
                    </div>
                    {form.description && (
                      <p className="text-sm text-muted-foreground">
                        {form.description}
                      </p>
                    )}
                  </CardHeader>
                  {assignment.dueDate && (
                    <CardContent className="text-xs text-muted-foreground">
                      Due {formatDate(assignment.dueDate)}
                    </CardContent>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-base font-semibold text-foreground">
            Completed
          </h2>
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {completed.map(({ assignment, form, response }) => (
              <li
                key={assignment.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5"
              >
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {form.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Submitted
                    {response?.submittedAt
                      ? ` ${formatDate(response.submittedAt)}`
                      : ""}
                  </span>
                </span>
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="size-3" />
                  Done
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      <AboutMeLink />
    </div>
  )
}

function AboutMeLink() {
  return (
    <Link href="/portal/forms/about-me" className="block">
      <Card className="transition-colors hover:border-primary/40">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Inbox className="size-5 text-muted-foreground" />
            <div className="flex flex-col">
              <h3 className="font-heading text-base font-semibold text-foreground">
                Responses about you
              </h3>
              <p className="text-sm text-muted-foreground">
                Surveys submitted about you by third parties — e.g. viewers
                of your property.
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>
    </Link>
  )
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}
