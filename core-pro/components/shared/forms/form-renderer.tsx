"use client"

import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { validateFormResponse } from "@/lib/forms/validate"
import type {
  FormField,
  FormResponseData,
  FormResponseValue,
  FormSchema,
} from "@/types/forms"

import { SignaturePad } from "./field-renderers/signature-pad"

// ─────────────────────────────────────────────────────────────────────────────
// <FormRenderer>
//
// Renders a saved form schema as a fillable form. Used by the client portal
// (fill mode), the form builder (preview mode), and future surfaces like a
// public micro-site embed. Owns per-field local value state; the parent only
// sees the final data payload via `onSubmit`.
//
// Mode:
//   - "fill"     → editable, shows Submit button, runs validation
//   - "preview"  → editable but submit is disabled (builder preview)
//   - "readonly" → renders submitted values for the pro's response viewer
// ─────────────────────────────────────────────────────────────────────────────
export type FormRendererMode = "fill" | "preview" | "readonly"

export function FormRenderer({
  schema,
  initialData,
  mode = "fill",
  onSubmit,
  submitting,
  title,
  description,
}: {
  schema: FormSchema
  initialData?: FormResponseData
  mode?: FormRendererMode
  onSubmit?: (data: FormResponseData) => void | Promise<void>
  submitting?: boolean
  title?: string
  description?: string | null
}) {
  const [data, setData] = useState<FormResponseData>(() => initialData ?? {})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const readOnly = mode === "readonly"

  const setField = (id: string, value: FormResponseValue) => {
    setData((prev) => ({ ...prev, [id]: value }))
    if (errors[id]) {
      setErrors((prev) => {
        const { [id]: _, ...rest } = prev
        void _
        return rest
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!onSubmit || mode !== "fill") return
    const nextErrors = validateFormResponse(schema, data)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    await onSubmit(data)
  }

  const submitLabel = schema.submitLabel ?? "Submit"

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={handleSubmit}
      noValidate
    >
      {(title || description) && (
        <header className="flex flex-col gap-1 border-b border-border pb-4">
          {title && (
            <h2 className="font-heading text-xl font-semibold text-foreground">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </header>
      )}

      <div className="flex flex-col gap-5">
        {schema.fields.map((field) => (
          <FieldBlock
            key={field.id}
            field={field}
            value={data[field.id]}
            onChange={(v) => setField(field.id, v)}
            error={errors[field.id]}
            readOnly={readOnly}
          />
        ))}
      </div>

      {mode === "fill" && (
        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Submitting…" : submitLabel}
          </Button>
        </div>
      )}
      {mode === "preview" && (
        <div className="flex justify-end">
          <Button type="button" disabled>
            {submitLabel} (preview)
          </Button>
        </div>
      )}
    </form>
  )
}

function FieldBlock({
  field,
  value,
  onChange,
  error,
  readOnly,
}: {
  field: FormField
  value: FormResponseValue | undefined
  onChange: (value: FormResponseValue) => void
  error?: string
  readOnly?: boolean
}) {
  if (field.type === "section") {
    return (
      <div className="flex flex-col gap-1">
        <h3 className="font-heading text-base font-semibold text-foreground">
          {field.label}
        </h3>
        {field.description && (
          <p className="text-sm text-muted-foreground">{field.description}</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={field.id}>
        {field.label}
        {field.required && <span className="text-destructive"> *</span>}
      </Label>
      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}
      <FieldControl
        field={field}
        value={value}
        onChange={onChange}
        invalid={Boolean(error)}
        readOnly={readOnly}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function FieldControl({
  field,
  value,
  onChange,
  invalid,
  readOnly,
}: {
  field: FormField
  value: FormResponseValue | undefined
  onChange: (value: FormResponseValue) => void
  invalid: boolean
  readOnly?: boolean
}) {
  const common = {
    id: field.id,
    "aria-invalid": invalid || undefined,
    disabled: readOnly,
  }

  switch (field.type) {
    case "short_text":
      return (
        <Input
          {...common}
          type="text"
          placeholder={field.placeholder}
          value={stringValue(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case "long_text":
      return (
        <Textarea
          {...common}
          placeholder={field.placeholder}
          value={stringValue(value)}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
        />
      )
    case "email":
      return (
        <Input
          {...common}
          type="email"
          inputMode="email"
          placeholder={field.placeholder ?? "name@example.com"}
          value={stringValue(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case "phone":
      return (
        <Input
          {...common}
          type="tel"
          inputMode="tel"
          placeholder={field.placeholder ?? "+1 555 123 4567"}
          value={stringValue(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case "number":
      return (
        <Input
          {...common}
          type="number"
          inputMode="decimal"
          placeholder={field.placeholder}
          value={value === null || value === undefined ? "" : String(value)}
          min={field.min}
          max={field.max}
          step={field.step}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
        />
      )
    case "date":
      return (
        <Input
          {...common}
          type="date"
          value={stringValue(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case "single_select":
      return (
        <Select
          value={stringValue(value) || undefined}
          onValueChange={(v) => onChange(v)}
          disabled={readOnly}
        >
          <SelectTrigger id={field.id} aria-invalid={invalid || undefined}>
            <SelectValue placeholder="Choose an option" />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    case "multi_select": {
      const current = Array.isArray(value) ? value : []
      return (
        <div
          className={cn(
            "flex flex-col gap-2 rounded-lg border p-3",
            invalid ? "border-destructive" : "border-input",
          )}
        >
          {(field.options ?? []).map((o) => {
            const checked = current.includes(o.value)
            return (
              <label
                key={o.value}
                className="flex items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={checked}
                  disabled={readOnly}
                  onCheckedChange={(next) => {
                    if (next) {
                      onChange([...current, o.value])
                    } else {
                      onChange(current.filter((v) => v !== o.value))
                    }
                  }}
                />
                {o.label}
              </label>
            )
          })}
        </div>
      )
    }
    case "slider": {
      const min = field.min ?? 0
      const max = field.max ?? 10
      const step = field.step ?? 1
      const num = typeof value === "number" ? value : Number(value ?? min)
      return (
        <div className="flex items-center gap-3">
          <input
            {...common}
            type="range"
            min={min}
            max={max}
            step={step}
            value={Number.isFinite(num) ? num : min}
            className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-primary"
            onChange={(e) => onChange(Number(e.target.value))}
          />
          <span className="w-10 text-right font-mono text-sm text-foreground">
            {Number.isFinite(num) ? num : min}
          </span>
        </div>
      )
    }
    case "file":
      // File uploads route through a separate storage action; for now we
      // store the typed filename/path so the schema + renderer stay
      // intact. Session 13 will wire real uploads.
      return (
        <Input
          {...common}
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0]
            onChange(file ? file.name : null)
          }}
        />
      )
    case "signature":
      return (
        <SignaturePad
          value={typeof value === "string" ? value : null}
          onChange={(v) => onChange(v)}
          invalid={invalid}
          readOnly={readOnly}
        />
      )
    default:
      return null
  }
}

function stringValue(value: FormResponseValue | undefined): string {
  if (value === null || value === undefined) return ""
  if (Array.isArray(value)) return value.join(", ")
  return String(value)
}

// Helper for the pro's read-only response view — lets them see submitted
// values as formatted strings without a full form shell.
export function ResponseValueView({
  field,
  value,
}: {
  field: FormField
  value: FormResponseValue | undefined
}) {
  const formatted = useMemo(() => {
    if (value === null || value === undefined || value === "") return "—"
    if (Array.isArray(value)) {
      const labels = value.map((v) => {
        const opt = field.options?.find((o) => o.value === v)
        return opt?.label ?? v
      })
      return labels.join(", ")
    }
    if (field.type === "single_select") {
      const opt = field.options?.find((o) => o.value === value)
      return opt?.label ?? String(value)
    }
    return String(value)
  }, [field, value])

  if (field.type === "signature" && typeof value === "string" && value.startsWith("data:image")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={value}
        alt="Signature"
        className="h-20 rounded border border-input bg-background"
      />
    )
  }

  return <p className="text-sm text-foreground whitespace-pre-wrap">{formatted}</p>
}
