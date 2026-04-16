"use client"

import {
  AlignLeft,
  AtSign,
  Calendar,
  FileUp,
  Hash,
  List,
  ListChecks,
  Minus,
  Phone,
  PenLine,
  SlidersHorizontal,
  Type,
} from "lucide-react"

import type { FormFieldType } from "@/types/forms"

// Grouped palette of field types. Each entry is a button that reports the
// type back to the builder, which inserts a new field with sensible defaults.
type PaletteItem = {
  type: FormFieldType
  label: string
  icon: React.ReactNode
}

const PALETTE: PaletteItem[] = [
  { type: "short_text", label: "Short text", icon: <Type className="size-4" /> },
  { type: "long_text", label: "Long text", icon: <AlignLeft className="size-4" /> },
  { type: "email", label: "Email", icon: <AtSign className="size-4" /> },
  { type: "phone", label: "Phone", icon: <Phone className="size-4" /> },
  { type: "number", label: "Number", icon: <Hash className="size-4" /> },
  { type: "single_select", label: "Single select", icon: <List className="size-4" /> },
  { type: "multi_select", label: "Multi select", icon: <ListChecks className="size-4" /> },
  { type: "date", label: "Date", icon: <Calendar className="size-4" /> },
  { type: "file", label: "File upload", icon: <FileUp className="size-4" /> },
  { type: "slider", label: "Slider", icon: <SlidersHorizontal className="size-4" /> },
  { type: "signature", label: "Signature", icon: <PenLine className="size-4" /> },
  { type: "section", label: "Section", icon: <Minus className="size-4" /> },
]

export function FieldPalette({
  onAdd,
}: {
  onAdd: (type: FormFieldType) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
        Add field
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {PALETTE.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => onAdd(item.type)}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-left text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-muted"
          >
            <span className="text-muted-foreground">{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
