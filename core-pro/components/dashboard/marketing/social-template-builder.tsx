"use client"

import { Copy, Download, Save } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
import {
  createSocialTemplateAction,
  updateSocialTemplateAction,
} from "@/lib/actions/marketing"
import {
  getPlatformMeta,
  getSocialLayout,
  SOCIAL_LAYOUTS,
  SOCIAL_PLATFORMS,
  suggestCaption,
  suggestHashtags,
  type SocialLayout,
  type SocialLayoutKind,
  type SocialPlatform,
} from "@/lib/marketing/social-layouts"
import type { SocialTemplate, SocialTemplateDesign } from "@/types/domain"

import { SocialCanvas, type SocialCanvasHandle } from "./social-canvas"

type Props = {
  initial?: SocialTemplate
  brand: { primary: string; secondary: string }
  professionalName: string
  onDone: () => void
}

export function SocialTemplateBuilder({
  initial,
  brand,
  professionalName,
  onDone,
}: Props) {
  const [platform, setPlatform] = useState<SocialPlatform>(
    (initial?.platform as SocialPlatform) ?? "instagram_square",
  )
  const [layoutKey, setLayoutKey] = useState<string>(
    initial?.layout ?? SOCIAL_LAYOUTS[0]!.key,
  )
  const layout = useMemo(() => getSocialLayout(layoutKey), [layoutKey])

  const initialDesign = (initial?.design as SocialTemplateDesign | undefined) ?? {
    ...layout.defaults,
    primaryColor: brand.primary,
    secondaryColor: brand.secondary,
  }
  const [name, setName] = useState(initial?.name ?? layout.name)
  const [design, setDesign] = useState<SocialTemplateDesign>(initialDesign)
  const [caption, setCaption] = useState<string>(initial?.caption ?? "")
  const [hashtags, setHashtags] = useState<string[]>(
    (initial?.hashtags as string[] | null) ?? suggestHashtags(layout.kind),
  )

  const canvasHandle = useRef<SocialCanvasHandle | null>(null)

  // When the user switches layouts we refresh the design defaults + caption
  // suggestions. We keep text they've already typed — if they've written a
  // caption, only replace hashtags.
  useEffect(() => {
    const nextLayout = getSocialLayout(layoutKey)
    setDesign((prev) => ({
      ...nextLayout.defaults,
      ...prev,
    }))
    if (!caption) {
      const next = suggestCaption({
        kind: nextLayout.kind,
        title: nextLayout.defaults.title,
        body: nextLayout.defaults.body,
      })[0]
      if (next) setCaption(next)
    }
    setHashtags((prev) => (prev.length > 0 ? prev : suggestHashtags(nextLayout.kind)))
    // Bring the layout's platform into sync too.
    setPlatform(nextLayout.platform)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey])

  // When the user changes platform without picking a layout, swap to the first
  // layout that matches it.
  useEffect(() => {
    if (layout.platform === platform) return
    const next = SOCIAL_LAYOUTS.find((l) => l.platform === platform)
    if (next) setLayoutKey(next.key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform])

  const createAction = useAction(createSocialTemplateAction, {
    onSuccess: () => {
      toast.success("Template saved.")
      onDone()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't save template.")
    },
  })

  const updateAction = useAction(updateSocialTemplateAction, {
    onSuccess: () => {
      toast.success("Template updated.")
      onDone()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't update template.")
    },
  })

  const saving = createAction.isPending || updateAction.isPending

  async function handleSave() {
    const payload = {
      name: name.trim() || layout.name,
      layout: layoutKey,
      platform,
      design,
      caption: caption || null,
      hashtags,
    }
    if (initial) {
      updateAction.execute({ id: initial.id, ...payload })
    } else {
      createAction.execute(payload)
    }
  }

  async function handleExport() {
    const current = canvasHandle.current
    if (!current) {
      toast.error("Preview isn't ready yet.")
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
    a.download = `${(name || layout.name).replace(/[^a-z0-9\-_]+/gi, "_")}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast.success("Exported.")
  }

  function patchDesign(patch: Partial<SocialTemplateDesign>) {
    setDesign((prev) => ({ ...prev, ...patch }))
  }

  function regenerateCaption() {
    const suggestions = suggestCaption({
      kind: layout.kind,
      title: design.title,
      body: design.body,
    })
    const chosen = suggestions[Math.floor(Math.random() * suggestions.length)]
    if (chosen) setCaption(chosen)
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3 space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Platform</Label>
            <Select
              value={platform}
              onValueChange={(v) => setPlatform(v as SocialPlatform)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOCIAL_PLATFORMS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label} · {p.width}×{p.height}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Layout</Label>
            <Select
              value={layoutKey}
              onValueChange={(v) => v && setLayoutKey(v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOCIAL_LAYOUTS.filter((l) => l.platform === platform).map(
                  (l: SocialLayout) => (
                    <SelectItem key={l.key} value={l.key}>
                      {l.name} · {describeKind(l.kind)}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="social-name">Template name</Label>
          <Input
            id="social-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="social-title">Headline</Label>
          <Input
            id="social-title"
            value={design.title ?? ""}
            onChange={(e) => patchDesign({ title: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="social-body">Body</Label>
          <Textarea
            id="social-body"
            rows={4}
            value={design.body ?? ""}
            onChange={(e) => patchDesign({ body: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="social-cta">CTA pill (optional)</Label>
            <Input
              id="social-cta"
              value={design.cta ?? ""}
              onChange={(e) => patchDesign({ cta: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="social-author">Author</Label>
            <Input
              id="social-author"
              value={design.author ?? ""}
              onChange={(e) => patchDesign({ author: e.target.value })}
              placeholder="e.g. — your name"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ColorInput
            label="Primary"
            value={design.primaryColor ?? brand.primary}
            onChange={(v) => patchDesign({ primaryColor: v })}
          />
          <ColorInput
            label="Accent"
            value={design.secondaryColor ?? brand.secondary}
            onChange={(v) => patchDesign({ secondaryColor: v })}
          />
          <ColorInput
            label="Text"
            value={design.textColor ?? "#ffffff"}
            onChange={(v) => patchDesign({ textColor: v })}
          />
          <div className="space-y-1.5">
            <Label>Background</Label>
            <Select
              value={design.backgroundStyle ?? "solid"}
              onValueChange={(v) =>
                patchDesign({
                  backgroundStyle: v as "solid" | "gradient",
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="gradient">Gradient</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="social-caption">Caption</Label>
            <Button size="sm" variant="ghost" onClick={regenerateCaption}>
              Regenerate
            </Button>
          </div>
          <Textarea
            id="social-caption"
            rows={4}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <div>
            <Label>Hashtags</Label>
            <div className="mt-1 flex flex-wrap gap-1">
              {hashtags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setHashtags((prev) => prev.filter((t) => t !== tag))
                  }
                  className="rounded-full border px-2 py-0.5 text-xs hover:bg-muted"
                >
                  {tag}
                </button>
              ))}
            </div>
            <Input
              className="mt-2"
              placeholder="#addtag and press enter"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  const raw = e.currentTarget.value.trim()
                  if (!raw) return
                  const tag = raw.startsWith("#") ? raw : `#${raw}`
                  setHashtags((prev) =>
                    prev.includes(tag) ? prev : [...prev, tag],
                  )
                  e.currentTarget.value = ""
                }
              }}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(
                `${caption}${hashtags.length ? `\n\n${hashtags.join(" ")}` : ""}`,
              )
              toast.success("Caption copied.")
            }}
          >
            <Copy className="size-4" /> Copy full caption
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button variant="ghost" onClick={onDone} disabled={saving}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="size-4" /> Export PNG
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="size-4" /> {saving ? "Saving…" : "Save template"}
          </Button>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="sticky top-0 flex flex-col items-center gap-2">
          <Label>Preview</Label>
          <SocialCanvas
            width={layout.width}
            height={layout.height}
            design={design}
            professionalName={professionalName}
            displayMaxWidth={360}
            ref={canvasHandle}
          />
          <p className="text-xs text-muted-foreground">
            Exports at {layout.width} × {layout.height}px · {getPlatformMeta(platform).label}
          </p>
        </div>
      </div>
    </div>
  )
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 cursor-pointer rounded border bg-background"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-xs"
        />
      </div>
    </div>
  )
}

function describeKind(kind: SocialLayoutKind): string {
  switch (kind) {
    case "motivational":
      return "Motivational"
    case "informational":
      return "Informational"
    case "promotional":
      return "Promotional"
    case "testimonial":
      return "Testimonial"
    default:
      return kind
  }
}
