import type { FormField, FormResponseData, FormSchema } from "@/types/forms"

export type ValidationErrors = Record<string, string>

// Schema-driven validation shared between the portal renderer (client-side
// pre-submit check) and the server action (authoritative). Returns the map
// of field-id → first error message, or an empty object when the response
// is valid.
export function validateFormResponse(
  schema: FormSchema,
  data: FormResponseData,
): ValidationErrors {
  const errors: ValidationErrors = {}
  for (const field of schema.fields) {
    if (field.type === "section") continue
    const value = data[field.id]
    const error = validateField(field, value)
    if (error) errors[field.id] = error
  }
  return errors
}

function validateField(
  field: FormField,
  value: unknown,
): string | null {
  const empty =
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)

  if (field.required && empty) {
    return "This field is required."
  }
  if (empty) return null

  switch (field.type) {
    case "email": {
      if (typeof value !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return "Enter a valid email."
      }
      return null
    }
    case "phone": {
      if (typeof value !== "string" || !/^[+()\d\s-]{6,}$/.test(value)) {
        return "Enter a valid phone number."
      }
      return null
    }
    case "number":
    case "slider": {
      const num = typeof value === "number" ? value : Number(value)
      if (!Number.isFinite(num)) return "Enter a number."
      if (field.min !== undefined && num < field.min) {
        return `Must be at least ${field.min}.`
      }
      if (field.max !== undefined && num > field.max) {
        return `Must be at most ${field.max}.`
      }
      return null
    }
    case "date": {
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return "Enter a valid date."
      }
      return null
    }
    case "multi_select": {
      if (!Array.isArray(value)) return "Invalid selection."
      return null
    }
    default:
      return null
  }
}
