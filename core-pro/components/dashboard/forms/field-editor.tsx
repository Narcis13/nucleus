"use client"

import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { FormField, FormFieldOption } from "@/types/forms"

// ─────────────────────────────────────────────────────────────────────────────
// <FieldEditor>
//
// Side-panel editor for a single selected field. Shown to the right of the
// builder canvas; the builder owns the field list and passes an `onChange`
// callback that merges a patch into the field shape.
// ─────────────────────────────────────────────────────────────────────────────
export function FieldEditor({
  field,
  onChange,
  onDelete,
}: {
  field: FormField
  onChange: (patch: Partial<FormField>) => void
  onDelete: () => void
}) {
  const isSelect =
    field.type === "single_select" || field.type === "multi_select"
  const isNumeric = field.type === "number" || field.type === "slider"

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
          Edit field
        </p>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="size-3.5" />
          Delete
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${field.id}-label`}>Label</Label>
        <Input
          id={`${field.id}-label`}
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
        />
      </div>

      {field.type !== "section" && (
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${field.id}-placeholder`}>Placeholder</Label>
          <Input
            id={`${field.id}-placeholder`}
            value={field.placeholder ?? ""}
            onChange={(e) => onChange({ placeholder: e.target.value })}
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${field.id}-description`}>
          {field.type === "section" ? "Description" : "Help text"}
        </Label>
        <Textarea
          id={`${field.id}-description`}
          rows={2}
          value={field.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>

      {field.type !== "section" && (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={field.required ?? false}
            onCheckedChange={(next) => onChange({ required: Boolean(next) })}
          />
          Required
        </label>
      )}

      {isSelect && (
        <OptionsEditor
          options={field.options ?? []}
          onChange={(options) => onChange({ options })}
        />
      )}

      {isNumeric && (
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${field.id}-min`}>Min</Label>
            <Input
              id={`${field.id}-min`}
              type="number"
              value={field.min ?? ""}
              onChange={(e) =>
                onChange({
                  min: e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${field.id}-max`}>Max</Label>
            <Input
              id={`${field.id}-max`}
              type="number"
              value={field.max ?? ""}
              onChange={(e) =>
                onChange({
                  max: e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${field.id}-step`}>Step</Label>
            <Input
              id={`${field.id}-step`}
              type="number"
              value={field.step ?? ""}
              onChange={(e) =>
                onChange({
                  step: e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
        </div>
      )}
    </div>
  )
}

function OptionsEditor({
  options,
  onChange,
}: {
  options: FormFieldOption[]
  onChange: (options: FormFieldOption[]) => void
}) {
  const update = (idx: number, patch: Partial<FormFieldOption>) => {
    onChange(options.map((o, i) => (i === idx ? { ...o, ...patch } : o)))
  }
  const remove = (idx: number) => {
    onChange(options.filter((_, i) => i !== idx))
  }
  const add = () => {
    const next = options.length + 1
    onChange([
      ...options,
      { value: `option_${next}`, label: `Option ${next}` },
    ])
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>Options</Label>
      <div className="flex flex-col gap-2">
        {options.map((o, idx) => (
          <div key={idx} className="flex gap-1.5">
            <Input
              className="flex-1"
              value={o.label}
              placeholder="Label"
              onChange={(e) => update(idx, { label: e.target.value })}
            />
            <Input
              className="w-28"
              value={o.value}
              placeholder="Value"
              onChange={(e) => update(idx, { value: e.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => remove(idx)}
              aria-label="Remove option"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="self-start"
      >
        <Plus className="size-3.5" />
        Add option
      </Button>
    </div>
  )
}
