// JSON shape stored in `forms.schema` (jsonb). Kept here — and not inferred
// from Drizzle — because the shape is UI-driven, not table-driven.

export type FormFieldType =
  | "short_text"
  | "long_text"
  | "email"
  | "phone"
  | "number"
  | "single_select"
  | "multi_select"
  | "date"
  | "file"
  | "slider"
  | "signature"
  | "section"

export type FormFieldOption = {
  value: string
  label: string
}

export type FormField = {
  id: string
  type: FormFieldType
  label: string
  description?: string
  placeholder?: string
  required?: boolean
  options?: FormFieldOption[]
  min?: number
  max?: number
  step?: number
  defaultValue?: string | number | string[] | boolean
}

export type FormSchema = {
  version: 1
  fields: FormField[]
  submitLabel?: string
}

// Form response data — shape is `{ [fieldId]: value }` where value depends on
// the field type. We type it permissively so renderers / validators can
// narrow per-field. Signatures are stored as data URLs, files as storage paths.
export type FormResponseValue = string | number | string[] | null
export type FormResponseData = Record<string, FormResponseValue>

export function isFormSchema(value: unknown): value is FormSchema {
  if (!value || typeof value !== "object") return false
  const v = value as { version?: unknown; fields?: unknown }
  return v.version === 1 && Array.isArray(v.fields)
}

export function emptyFormSchema(): FormSchema {
  return { version: 1, fields: [] }
}
