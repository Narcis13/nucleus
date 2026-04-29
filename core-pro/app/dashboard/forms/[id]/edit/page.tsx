import { notFound } from "next/navigation"

import { FormBuilder } from "@/components/dashboard/forms/form-builder"
import { PublicSharesList } from "@/components/dashboard/forms/public-shares-list"
import { ResponsesList } from "@/components/dashboard/forms/responses-list"
import { PageHeader } from "@/components/shared/page-header"
import { getClients } from "@/lib/db/queries/clients"
import { getFormDetail, getFormPublicShares } from "@/lib/db/queries/forms"
import { emptyFormSchema, isFormSchema } from "@/types/forms"

export default async function FormEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [detail, clientList, shares] = await Promise.all([
    getFormDetail(id),
    getClients({ status: "active" }),
    getFormPublicShares(id),
  ])
  if (!detail) notFound()

  const schema = isFormSchema(detail.form.schema)
    ? detail.form.schema
    : emptyFormSchema()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Edit form"
        description="Drag to reorder fields. Use Preview to test the client experience."
      />
      <FormBuilder
        formId={detail.form.id}
        initialTitle={detail.form.title}
        initialDescription={detail.form.description}
        initialSchema={schema}
        clients={clientList.map((c) => ({
          id: c.client.id,
          fullName: c.client.fullName,
          email: c.client.email,
        }))}
      />
      <PublicSharesList formId={detail.form.id} shares={shares} />
      <ResponsesList
        formId={detail.form.id}
        schema={schema}
        assignments={detail.assignments}
        responses={detail.responses}
      />
    </div>
  )
}
