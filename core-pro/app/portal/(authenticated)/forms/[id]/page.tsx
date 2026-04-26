import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { FormFiller } from "@/components/portal/forms/form-filler"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { getPortalAssignment } from "@/lib/db/queries/portal"
import { requirePortalSession } from "@/lib/portal-auth/session"
import {
  emptyFormSchema,
  isFormSchema,
  type FormResponseData,
} from "@/types/forms"

export default async function PortalFillFormPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await requirePortalSession()
  const detail = await getPortalAssignment(id, session.clientId)
  if (!detail) notFound()

  const schema = isFormSchema(detail.form.schema)
    ? detail.form.schema
    : emptyFormSchema()
  const isSubmitted = detail.assignment.status === "completed"

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={detail.form.title}
        description={detail.form.description ?? undefined}
        actions={
          <Link href="/portal/forms">
            <Button variant="outline" size="sm">
              <ArrowLeft className="size-3.5" />
              All forms
            </Button>
          </Link>
        }
      />
      <FormFiller
        assignmentId={detail.assignment.id}
        schema={schema}
        submitted={isSubmitted}
        existingResponse={
          (detail.response?.data as FormResponseData | null) ?? null
        }
      />
    </div>
  )
}
