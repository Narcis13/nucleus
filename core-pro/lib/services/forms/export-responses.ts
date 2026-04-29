import "server-only"

import { getFormDetail } from "@/lib/db/queries/forms"
import type { FormResponseData, FormSchema } from "@/types/forms"
import { isFormSchema } from "@/types/forms"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError } from "../_lib/errors"

export type ExportFormResponsesInput = { formId: string }
export type ExportFormResponsesResult = { filename: string; csv: string }

// CSV export of every submitted response for a form. RLS on `getFormDetail`
// restricts this to forms the calling professional owns, so no extra ownership
// check is needed here.
export async function exportFormResponses(
  _ctx: ServiceContext,
  input: ExportFormResponsesInput,
): Promise<ExportFormResponsesResult> {
  const detail = await getFormDetail(input.formId)
  if (!detail) throw new NotFoundError("Form not found.")

  const schema = isFormSchema(detail.form.schema)
    ? detail.form.schema
    : ({ version: 1, fields: [] } satisfies FormSchema)

  const csv = toCsv(schema, detail.responses)
  const slug = detail.form.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "form"
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  const filename = `${slug}-responses-${date}.csv`
  return { filename, csv }
}

type ResponseRow = {
  id: string
  submittedAt: Date
  shareId: string | null
  data: unknown
  client: { id: string; fullName: string } | null
}

function toCsv(schema: FormSchema, responses: ResponseRow[]): string {
  const dataFields = schema.fields.filter((f) => f.type !== "section")
  const header = [
    "Submitted At",
    "Client",
    "Source",
    ...dataFields.map((f) => f.label),
  ]
  const lines = [header.map(escape).join(",")]
  for (const r of responses) {
    const data = (r.data as FormResponseData | null) ?? {}
    const source = r.shareId ? "Public link" : r.client ? "Assignment" : "Direct"
    const row = [
      r.submittedAt instanceof Date
        ? r.submittedAt.toISOString()
        : new Date(r.submittedAt).toISOString(),
      r.client?.fullName ?? "",
      source,
      ...dataFields.map((f) => formatValue(data[f.id], f)),
    ]
    lines.push(row.map(escape).join(","))
  }
  return lines.join("\n")
}

function formatValue(
  value: FormResponseData[string] | undefined,
  field: FormSchema["fields"][number],
): string {
  if (value === null || value === undefined || value === "") return ""
  if (Array.isArray(value)) {
    return value
      .map((v) => field.options?.find((o) => o.value === v)?.label ?? v)
      .join("; ")
  }
  if (field.type === "single_select") {
    const opt = field.options?.find((o) => o.value === value)
    return opt?.label ?? String(value)
  }
  if (field.type === "signature" && typeof value === "string" && value.startsWith("data:")) {
    return "[signature]"
  }
  return String(value)
}

function escape(v: string): string {
  if (v === "") return ""
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`
  return v
}
