"use client"

import { Copy, Download, Image as ImageIcon, Plus, Trash2 } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { EmptyState } from "@/components/shared/page-header"
import {
  deleteSocialTemplateAction,
  logSocialExportAction,
} from "@/lib/actions/marketing"
import {
  getPlatformMeta,
  getSocialLayout,
} from "@/lib/marketing/social-layouts"
import type { SocialTemplate, SocialTemplateDesign } from "@/types/domain"

import { SocialTemplateBuilder } from "./social-template-builder"
import { SocialCanvas, type SocialCanvasHandle } from "./social-canvas"

type Props = {
  templates: SocialTemplate[]
  brand: { primary: string; secondary: string }
  professionalName: string
}

export function SocialTemplatesTab({
  templates,
  brand,
  professionalName,
}: Props) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<SocialTemplate | null>(null)

  const deleteAction = useAction(deleteSocialTemplateAction, {
    onSuccess: () => {
      toast.success("Template deleted.")
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't delete template.")
    },
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Drop your brand colors into a ready-made layout, export as PNG, and
          post. Captions and hashtags are suggested automatically.
        </p>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger
            render={
              <Button>
                <Plus className="size-4" /> New template
              </Button>
            }
          />
          <DialogContent className="max-w-6xl">
            <DialogHeader>
              <DialogTitle>Design a social post</DialogTitle>
              <DialogDescription>
                Pick a layout, customise copy + colors, export to PNG, and copy
                the suggested caption.
              </DialogDescription>
            </DialogHeader>
            <SocialTemplateBuilder
              brand={brand}
              professionalName={professionalName}
              onDone={() => {
                setCreateOpen(false)
                router.refresh()
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon={<ImageIcon />}
          title="No saved templates yet"
          description="Your saved social designs show up here for quick re-use and re-export."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              professionalName={professionalName}
              onEdit={() => setEditing(template)}
              onDelete={() => {
                if (confirm(`Delete "${template.name}"?`)) {
                  deleteAction.execute({ id: template.id })
                }
              }}
            />
          ))}
        </div>
      )}

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Edit template</DialogTitle>
            <DialogDescription>
              Update copy and colors. Changes save to this template.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <SocialTemplateBuilder
              brand={brand}
              professionalName={professionalName}
              initial={editing}
              onDone={() => {
                setEditing(null)
                router.refresh()
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TemplateCard({
  template,
  professionalName,
  onEdit,
  onDelete,
}: {
  template: SocialTemplate
  professionalName: string
  onEdit: () => void
  onDelete: () => void
}) {
  const layout = getSocialLayout(template.layout)
  const platform = getPlatformMeta(layout.platform)
  const handle = useRef<SocialCanvasHandle | null>(null)

  const logExport = useAction(logSocialExportAction)

  async function handleExport() {
    const current = handle.current
    if (!current) {
      toast.error("Preview not ready yet.")
      return
    }
    const blob = await current.toBlob()
    if (!blob) {
      toast.error("Couldn't export image.")
      return
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${template.name.replace(/[^a-z0-9\-_]+/gi, "_")}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    logExport.execute({ id: template.id })
    toast.success("Exported.")
  }

  const design = template.design as SocialTemplateDesign

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="truncate">{template.name}</span>
          <Badge variant="secondary">{platform.label}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        <SocialCanvas
          width={layout.width}
          height={layout.height}
          design={design}
          professionalName={professionalName}
          displayMaxWidth={280}
          ref={handle}
        />
        {template.caption && (
          <div className="w-full rounded-lg border bg-muted/40 p-2">
            <p className="line-clamp-3 text-xs text-muted-foreground whitespace-pre-line">
              {template.caption}
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button size="sm" onClick={handleExport}>
            <Download className="size-4" /> Export PNG
          </Button>
          {template.caption && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(
                  `${template.caption}${
                    (template.hashtags as string[] | null)?.length
                      ? `\n\n${(template.hashtags as string[]).join(" ")}`
                      : ""
                  }`,
                )
                toast.success("Caption copied.")
              }}
            >
              <Copy className="size-4" /> Copy caption
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onEdit}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
