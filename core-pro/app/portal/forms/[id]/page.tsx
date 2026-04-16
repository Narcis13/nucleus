import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { FormFiller } from "@/components/portal/forms/form-filler"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { getClientAssignment } from "@/lib/db/queries/forms"
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
  const detail = await getClientAssignment(id)
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
