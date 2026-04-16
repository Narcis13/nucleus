import { FileText } from "lucide-react"
import Link from "next/link"

import { CreateFormMenu } from "@/components/dashboard/forms/create-form-menu"
import { EmptyState, PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { getFormCounts, getForms } from "@/lib/db/queries/forms"

export default async function FormsPage() {
  const [forms, counts] = await Promise.all([getForms(), getFormCounts()])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Forms"
        description="Build intake questionnaires, waivers, and custom client forms."
        actions={<CreateFormMenu />}
      />
      {forms.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title="No forms yet"
          description="Create a form from scratch or start from one of our templates."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {forms.map((form) => {
            const c = counts[form.id] ?? {
              assignments: 0,
              pending: 0,
              responses: 0,
            }
            return (
              <Link
                key={form.id}
                href={`/dashboard/forms/${form.id}/edit`}
                className="block"
              >
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-heading text-base font-semibold text-foreground">
                        {form.title}
                      </h3>
                      {c.pending > 0 && (
                        <Badge variant="outline">{c.pending} pending</Badge>
                      )}
                    </div>
                    {form.description && (
                      <p className="text-sm text-muted-foreground">
                        {form.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    {fieldCount(form.schema)} field
                    {fieldCount(form.schema) === 1 ? "" : "s"}
                  </CardContent>
                  <CardFooter className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{c.responses} responses</span>
                    <span>·</span>
                    <span>{c.assignments} assignments</span>
                  </CardFooter>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function fieldCount(schema: unknown): number {
  if (
    schema &&
    typeof schema === "object" &&
    "fields" in schema &&
    Array.isArray((schema as { fields?: unknown[] }).fields)
  ) {
    return (schema as { fields: unknown[] }).fields.filter(
      (f) => typeof f === "object" && f !== null && (f as { type?: string }).type !== "section",
    ).length
  }
  return 0
}
