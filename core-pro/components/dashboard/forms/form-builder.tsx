"use client"

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Eye, GripVertical, PenLine, Save, Send, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAction } from "next-safe-action/hooks"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { SetBreadcrumbLabel } from "@/components/dashboard/breadcrumb-context"
import { FormRenderer } from "@/components/shared/forms/form-renderer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  archiveFormAction,
  assignFormAction,
  updateFormAction,
} from "@/lib/actions/forms"
import { cn } from "@/lib/utils"
import type { FormField, FormFieldType, FormSchema } from "@/types/forms"
import type { Client } from "@/types/domain"

import { AssignDialog } from "./assign-dialog"
import { FieldEditor } from "./field-editor"
import { FieldPalette } from "./field-palette"

// ─────────────────────────────────────────────────────────────────────────────
// <FormBuilder>
//
// Top-level editor for a saved form. Owns the in-memory schema + metadata,
// persists via `updateFormAction`, and exposes a preview mode that swaps the
// canvas for a live <FormRenderer>. Drag-and-drop reordering uses
// @dnd-kit/sortable (same setup as the lead kanban).
// ─────────────────────────────────────────────────────────────────────────────
type BuilderMode = "edit" | "preview"

export function FormBuilder({
  formId,
  initialTitle,
  initialDescription,
  initialSchema,
  clients,
}: {
  formId: string
  initialTitle: string
  initialDescription: string | null
  initialSchema: FormSchema
  clients: Array<Pick<Client, "id" | "fullName" | "email">>
}) {
  const router = useRouter()
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription ?? "")
  const [schema, setSchema] = useState<FormSchema>(initialSchema)
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSchema.fields[0]?.id ?? null,
  )
  const [mode, setMode] = useState<BuilderMode>("edit")
  const [assignOpen, setAssignOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const selectedField = useMemo(
    () => schema.fields.find((f) => f.id === selectedId) ?? null,
    [schema, selectedId],
  )

  const updateAction = useAction(updateFormAction, {
    onSuccess: () => {
      toast.success("Form saved.")
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't save form.")
    },
  })

  const archiveAction = useAction(archiveFormAction, {
    onSuccess: () => {
      toast.success("Form deleted.")
      router.push("/dashboard/forms")
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't delete form.")
    },
  })

  const assignAction = useAction(assignFormAction, {
    onSuccess: ({ data }) => {
      toast.success(
        `Assigned to ${data?.assigned} client${data?.assigned === 1 ? "" : "s"}.`,
      )
      setAssignOpen(false)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't assign form.")
    },
  })

  const handleAddField = (type: FormFieldType) => {
    const id = generateFieldId(type, schema.fields)
    const field = newField(type, id)
    setSchema((prev) => ({ ...prev, fields: [...prev.fields, field] }))
    setSelectedId(id)
  }

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    setSchema((prev) => {
      const oldIndex = prev.fields.findIndex((f) => f.id === active.id)
      const newIndex = prev.fields.findIndex((f) => f.id === over.id)
      if (oldIndex < 0 || newIndex < 0) return prev
      return { ...prev, fields: arrayMove(prev.fields, oldIndex, newIndex) }
    })
  }

  const patchField = (id: string, patch: Partial<FormField>) => {
    setSchema((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }))
  }

  const deleteField = (id: string) => {
    setSchema((prev) => ({
      ...prev,
      fields: prev.fields.filter((f) => f.id !== id),
    }))
    if (selectedId === id) setSelectedId(null)
  }

  const handleSave = () => {
    updateAction.execute({
      id: formId,
      title,
      description: description.trim() || null,
      schema,
    })
  }

  const handleDelete = () => {
    if (
      window.confirm(
        `Delete "${initialTitle || "this form"}"? Existing assignments and responses will be kept but the form will be hidden from the list.`,
      )
    ) {
      archiveAction.execute({ id: formId })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SetBreadcrumbLabel segment={formId} label={initialTitle} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Form title"
            className="h-9 text-base font-semibold"
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description (optional)"
            rows={2}
          />
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={archiveAction.isExecuting}
            aria-label="Delete form"
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
          <Button
            variant={mode === "preview" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setMode(mode === "edit" ? "preview" : "edit")}
          >
            {mode === "edit" ? (
              <>
                <Eye className="size-3.5" /> Preview
              </>
            ) : (
              <>
                <PenLine className="size-3.5" /> Edit
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAssignOpen(true)}
            disabled={schema.fields.length === 0}
          >
            <Send className="size-3.5" />
            Assign
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateAction.isExecuting}
          >
            <Save className="size-3.5" />
            {updateAction.isExecuting ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {mode === "preview" ? (
        <div className="rounded-lg border border-border bg-card p-6">
          <FormRenderer
            schema={schema}
            mode="preview"
            title={title || "Untitled form"}
            description={description || undefined}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_280px]">
          <aside className="rounded-lg border border-border bg-card p-3">
            <FieldPalette onAdd={handleAddField} />
          </aside>

          <div className="rounded-lg border border-border bg-card p-4">
            {schema.fields.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                Pick a field type on the left to get started.
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={schema.fields.map((f) => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="flex flex-col gap-2">
                    {schema.fields.map((field) => (
                      <SortableFieldRow
                        key={field.id}
                        field={field}
                        selected={field.id === selectedId}
                        onSelect={() => setSelectedId(field.id)}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </div>

          <aside className="rounded-lg border border-border bg-card p-3">
            {selectedField ? (
              <FieldEditor
                field={selectedField}
                onChange={(patch) => patchField(selectedField.id, patch)}
                onDelete={() => deleteField(selectedField.id)}
              />
            ) : (
              <p className="py-10 text-center text-xs text-muted-foreground">
                Select a field to edit it.
              </p>
            )}
          </aside>
        </div>
      )}

      <AssignDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        clients={clients}
        onAssign={(clientIds, dueDate) => {
          assignAction.execute({ formId, clientIds, dueDate })
        }}
        pending={assignAction.isExecuting}
      />
    </div>
  )
}

function SortableFieldRow({
  field,
  selected,
  onSelect,
}: {
  field: FormField
  selected: boolean
  onSelect: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id })
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-background px-2.5 py-2 shadow-xs transition-colors",
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-border",
      )}
    >
      <button
        type="button"
        className="cursor-grab text-muted-foreground active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="flex flex-1 flex-col items-start gap-0.5 text-left"
      >
        <span className="text-sm font-medium text-foreground">
          {field.label || <em className="text-muted-foreground">Untitled</em>}
        </span>
        <span className="text-xs text-muted-foreground">
          {prettyType(field.type)}
          {field.required ? " · required" : ""}
        </span>
      </button>
    </li>
  )
}

function prettyType(type: FormFieldType): string {
  switch (type) {
    case "short_text":
      return "Short text"
    case "long_text":
      return "Long text"
    case "email":
      return "Email"
    case "phone":
      return "Phone"
    case "number":
      return "Number"
    case "single_select":
      return "Single select"
    case "multi_select":
      return "Multi select"
    case "date":
      return "Date"
    case "file":
      return "File upload"
    case "slider":
      return "Slider"
    case "signature":
      return "Signature"
    case "section":
      return "Section"
  }
}

function newField(type: FormFieldType, id: string): FormField {
  const base: FormField = {
    id,
    type,
    label: defaultLabel(type),
    required: false,
  }
  if (type === "single_select" || type === "multi_select") {
    base.options = [
      { value: "option_1", label: "Option 1" },
      { value: "option_2", label: "Option 2" },
    ]
  }
  if (type === "slider") {
    base.min = 0
    base.max = 10
    base.step = 1
  }
  if (type === "number") {
    base.step = 1
  }
  return base
}

function defaultLabel(type: FormFieldType): string {
  switch (type) {
    case "short_text":
      return "Short answer"
    case "long_text":
      return "Long answer"
    case "email":
      return "Email"
    case "phone":
      return "Phone"
    case "number":
      return "Number"
    case "single_select":
      return "Pick one"
    case "multi_select":
      return "Pick any"
    case "date":
      return "Date"
    case "file":
      return "Attachment"
    case "slider":
      return "Rating"
    case "signature":
      return "Signature"
    case "section":
      return "New section"
  }
}

function generateFieldId(type: FormFieldType, existing: FormField[]): string {
  // Human-readable ids make the response jsonb easier to read when debugging.
  const slug = type.replace(/_/g, "-")
  const taken = new Set(existing.map((f) => f.id))
  let i = 1
  while (taken.has(`${slug}-${i}`)) i++
  return `${slug}-${i}`
}
