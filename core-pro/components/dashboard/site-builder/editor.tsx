"use client"

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  CircleCheck,
  Eye,
  EyeOff,
  GripVertical,
  Loader2,
} from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import { AboutSection } from "@/components/micro-site/about-section"
import {
  BlogSection,
  NichePlaceholderSection,
} from "@/components/micro-site/blog-section"
import { ContactSection } from "@/components/micro-site/contact-section"
import { FaqSection } from "@/components/micro-site/faq-section"
import { MicroSiteFooter } from "@/components/micro-site/footer"
import { HeroSection } from "@/components/micro-site/hero-section"
import { ServicesSection } from "@/components/micro-site/services-section"
import { TestimonialsSection } from "@/components/micro-site/testimonials-section"
import { resolveTheme } from "@/components/micro-site/theme"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  checkSlugAvailabilityAction,
  publishMicroSiteAction,
  saveMicroSiteAction,
} from "@/lib/actions/micro-sites"
import { cn } from "@/lib/utils"
import type {
  MicroSiteConfig,
  MicroSiteSectionType,
  MicroSiteSocialLinks,
  MicroSiteTheme,
  Service,
} from "@/types/domain"

import { SectionEditor } from "./section-editor"
import type { SiteBuilderProfessional } from "./types"

type ServiceCard = Pick<
  Service,
  "id" | "name" | "description" | "price" | "currency" | "durationMinutes"
>

type EditorState = {
  id: string
  slug: string
  theme: MicroSiteTheme
  isPublished: boolean
  seoTitle: string
  seoDescription: string
  socialLinks: MicroSiteSocialLinks
  config: MicroSiteConfig
}

const SECTION_META: Record<
  MicroSiteSectionType,
  { label: string; description: string; alwaysEnabled?: boolean }
> = {
  hero: {
    label: "Hero",
    description: "Photo, tagline, and primary call-to-action.",
  },
  about: {
    label: "About",
    description: "Short bio, certifications, experience.",
  },
  services: {
    label: "Services",
    description: "Pulled from your active services.",
  },
  testimonials: {
    label: "Testimonials",
    description: "Quotes from happy clients.",
  },
  contact: {
    label: "Contact form",
    description: "Submissions create a lead in your pipeline.",
  },
  faq: {
    label: "FAQ",
    description: "Answers to the questions you're asked most.",
  },
  blog: {
    label: "Blog",
    description: "Placeholder — real blog ships in a later session.",
  },
  niche: {
    label: "Niche module",
    description: "Reserved slot for niche-specific content.",
  },
}

export function SiteBuilderEditor({
  initialSite,
  themes,
  professional,
  services,
  publicUrl,
}: {
  initialSite: EditorState
  themes: Array<{ id: MicroSiteTheme; label: string; description: string }>
  professional: SiteBuilderProfessional
  services: ServiceCard[]
  publicUrl: string
}) {
  const [state, setState] = useState<EditorState>(initialSite)
  const [slugStatus, setSlugStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle")
  const [, startTransition] = useTransition()

  const saveAction = useAction(saveMicroSiteAction, {
    onSuccess: ({ data }) => {
      if (data?.slug) {
        setState((s) => ({ ...s, slug: data.slug }))
      }
      toast.success("Saved")
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't save your site.")
    },
  })

  const publishAction = useAction(publishMicroSiteAction, {
    onSuccess: ({ data }) => {
      if (typeof data?.isPublished === "boolean") {
        setState((s) => ({ ...s, isPublished: data.isPublished }))
        toast.success(data.isPublished ? "Site is live." : "Site unpublished.")
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't toggle publish state.")
    },
  })

  const slugAction = useAction(checkSlugAvailabilityAction, {
    onSuccess: ({ data }) => {
      setSlugStatus(data?.available ? "available" : "taken")
    },
    onError: () => setSlugStatus("invalid"),
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const { style } = useMemo(
    () => resolveTheme(state.theme, state.config.branding),
    [state.theme, state.config.branding],
  )

  function patchConfig(producer: (draft: MicroSiteConfig) => MicroSiteConfig) {
    setState((s) => ({ ...s, config: producer(s.config) }))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = state.config.order
    const oldIndex = ids.indexOf(active.id as MicroSiteSectionType)
    const newIndex = ids.indexOf(over.id as MicroSiteSectionType)
    if (oldIndex === -1 || newIndex === -1) return
    const next = [...ids]
    next.splice(oldIndex, 1)
    next.splice(newIndex, 0, active.id as MicroSiteSectionType)
    patchConfig((draft) => ({ ...draft, order: next }))
  }

  function handleSave() {
    saveAction.execute({
      slug: state.slug,
      theme: state.theme,
      order: state.config.order,
      sections: state.config.sections,
      branding: state.config.branding,
      seoTitle: state.seoTitle || null,
      seoDescription: state.seoDescription || null,
      socialLinks: state.socialLinks,
    })
  }

  function handlePublish(next: boolean) {
    publishAction.execute({ publish: next })
  }

  function handleSlugChange(nextSlug: string) {
    const normalized = nextSlug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 48)
    setState((s) => ({ ...s, slug: normalized }))
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(normalized)) {
      setSlugStatus(normalized.length === 0 ? "idle" : "invalid")
      return
    }
    if (normalized === initialSite.slug) {
      setSlugStatus("available")
      return
    }
    setSlugStatus("checking")
    startTransition(() => {
      slugAction.execute({ slug: normalized })
    })
  }

  const [activeSection, setActiveSection] = useState<MicroSiteSectionType>(
    () => state.config.order[0] ?? "hero",
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <aside className="flex flex-col gap-6">
        {/* Top action bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex min-w-0 items-center gap-2">
            {state.isPublished ? (
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                <CircleCheck className="mr-1 size-3" />
                Live
              </Badge>
            ) : (
              <Badge variant="secondary">
                <EyeOff className="mr-1 size-3" />
                Draft
              </Badge>
            )}
            <a
              href={state.isPublished ? publicUrl : `${publicUrl}?preview=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-sm text-primary underline"
            >
              {publicUrl}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePublish(!state.isPublished)}
              disabled={publishAction.isPending}
            >
              {publishAction.isPending ? (
                <Loader2 className="mr-1 size-3 animate-spin" />
              ) : state.isPublished ? (
                <EyeOff className="mr-1 size-3" />
              ) : (
                <Eye className="mr-1 size-3" />
              )}
              {state.isPublished ? "Unpublish" : "Publish"}
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveAction.isPending}
            >
              {saveAction.isPending ? (
                <Loader2 className="mr-1 size-3 animate-spin" />
              ) : null}
              Save
            </Button>
          </div>
        </div>

        {/* Slug + SEO */}
        <section className="space-y-3 rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold">Slug & SEO</h2>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Custom slug</Label>
            <Input
              id="slug"
              value={state.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="your-name"
            />
            <p
              className={cn(
                "text-xs",
                slugStatus === "taken" || slugStatus === "invalid"
                  ? "text-red-600"
                  : slugStatus === "available"
                    ? "text-emerald-600"
                    : "text-muted-foreground",
              )}
            >
              {slugStatus === "checking"
                ? "Checking availability…"
                : slugStatus === "taken"
                  ? "Taken — pick another."
                  : slugStatus === "invalid"
                    ? "Use lowercase letters, numbers and dashes."
                    : slugStatus === "available"
                      ? "Available."
                      : `Your site will live at ${publicUrl}`}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="seo-title">SEO title</Label>
            <Input
              id="seo-title"
              value={state.seoTitle}
              maxLength={120}
              onChange={(e) =>
                setState((s) => ({ ...s, seoTitle: e.target.value }))
              }
              placeholder={professional.fullName}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="seo-desc">SEO description</Label>
            <Textarea
              id="seo-desc"
              rows={3}
              maxLength={320}
              value={state.seoDescription}
              onChange={(e) =>
                setState((s) => ({ ...s, seoDescription: e.target.value }))
              }
              placeholder="One-liner that shows in Google + social shares."
            />
          </div>
        </section>

        {/* Theme + colors */}
        <section className="space-y-3 rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold">Theme</h2>
          <div className="grid grid-cols-5 gap-2">
            {themes.map((theme) => {
              const selected = state.theme === theme.id
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setState((s) => ({ ...s, theme: theme.id }))}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-md border p-2 text-left text-xs transition-colors",
                    selected
                      ? "border-primary ring-2 ring-ring"
                      : "border-border hover:border-ring",
                  )}
                >
                  <span className="font-medium">{theme.label}</span>
                </button>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {themes.find((t) => t.id === state.theme)?.description}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <ColorField
              label="Primary"
              value={state.config.branding.primary_color ?? "#6366f1"}
              onChange={(v) =>
                patchConfig((d) => ({
                  ...d,
                  branding: { ...d.branding, primary_color: v },
                }))
              }
            />
            <ColorField
              label="Accent"
              value={
                state.config.branding.accent_color ??
                state.config.branding.secondary_color ??
                "#f59e0b"
              }
              onChange={(v) =>
                patchConfig((d) => ({
                  ...d,
                  branding: { ...d.branding, accent_color: v },
                }))
              }
            />
            <ColorField
              label="Secondary"
              value={state.config.branding.secondary_color ?? "#0ea5e9"}
              onChange={(v) =>
                patchConfig((d) => ({
                  ...d,
                  branding: { ...d.branding, secondary_color: v },
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="logo-url">Logo URL</Label>
            <Input
              id="logo-url"
              type="url"
              value={state.config.branding.logo_url ?? ""}
              placeholder="https://..."
              onChange={(e) =>
                patchConfig((d) => ({
                  ...d,
                  branding: { ...d.branding, logo_url: e.target.value || null },
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cover-url">Cover image URL</Label>
            <Input
              id="cover-url"
              type="url"
              value={state.config.branding.cover_url ?? ""}
              placeholder="https://..."
              onChange={(e) =>
                patchConfig((d) => ({
                  ...d,
                  branding: { ...d.branding, cover_url: e.target.value || null },
                }))
              }
            />
          </div>
        </section>

        {/* Section list (toggle + reorder) */}
        <section className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Sections</h2>
            <span className="text-xs text-muted-foreground">
              Drag to reorder
            </span>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={state.config.order}
              strategy={verticalListSortingStrategy}
            >
              <ul className="flex flex-col gap-2">
                {state.config.order.map((sectionType) => (
                  <SortableSectionRow
                    key={sectionType}
                    id={sectionType}
                    label={SECTION_META[sectionType].label}
                    description={SECTION_META[sectionType].description}
                    enabled={state.config.sections[sectionType].enabled}
                    active={activeSection === sectionType}
                    onClick={() => setActiveSection(sectionType)}
                    onToggle={(next) =>
                      patchConfig((d) => ({
                        ...d,
                        sections: {
                          ...d.sections,
                          [sectionType]: {
                            ...d.sections[sectionType],
                            enabled: next,
                          },
                        },
                      }))
                    }
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </section>

        {/* Active section editor */}
        <section className="space-y-3 rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold">
            Edit: {SECTION_META[activeSection].label}
          </h2>
          <SectionEditor
            sectionType={activeSection}
            config={state.config}
            onChange={(producer) => patchConfig(producer)}
          />
        </section>

        {/* Social links + tagline */}
        <section className="space-y-3 rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold">Social links</h2>
          <div className="space-y-1.5">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={state.config.branding.tagline ?? ""}
              maxLength={200}
              onChange={(e) =>
                patchConfig((d) => ({
                  ...d,
                  branding: { ...d.branding, tagline: e.target.value },
                }))
              }
            />
          </div>
          {(
            ["instagram", "facebook", "linkedin", "twitter", "youtube", "website"] as const
          ).map((k) => (
            <div key={k} className="space-y-1.5">
              <Label htmlFor={`social-${k}`} className="capitalize">
                {k}
              </Label>
              <Input
                id={`social-${k}`}
                type="url"
                value={state.socialLinks?.[k] ?? ""}
                placeholder="https://..."
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    socialLinks: { ...s.socialLinks, [k]: e.target.value },
                  }))
                }
              />
            </div>
          ))}
        </section>
      </aside>

      {/* Live preview */}
      <div className="sticky top-4 max-h-[calc(100dvh-2rem)] overflow-hidden rounded-lg border border-border">
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
          <span>Live preview</span>
          <span className="truncate">{publicUrl}</span>
        </div>
        <div className="h-[calc(100dvh-7rem)] overflow-y-auto">
          <PreviewBody
            config={state.config}
            theme={state.theme}
            services={services}
            professional={professional}
            slug={state.slug}
            socialLinks={state.socialLinks}
            wrapperStyle={style}
          />
        </div>
      </div>
    </div>
  )
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
          aria-label={label}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-xs"
        />
      </div>
    </div>
  )
}

function SortableSectionRow({
  id,
  label,
  description,
  enabled,
  active,
  onToggle,
  onClick,
}: {
  id: MicroSiteSectionType
  label: string
  description: string
  enabled: boolean
  active: boolean
  onToggle: (next: boolean) => void
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-background p-2",
        active ? "border-primary ring-1 ring-ring" : "border-border",
      )}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        className="cursor-grab p-1 text-muted-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <button
        type="button"
        onClick={onClick}
        className="min-w-0 flex-1 text-left"
      >
        <p className="text-sm font-medium">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </button>
      <Switch
        checked={enabled}
        onCheckedChange={onToggle}
        aria-label={`Toggle ${label}`}
      />
    </li>
  )
}

function PreviewBody({
  config,
  theme,
  services,
  professional,
  slug,
  socialLinks,
  wrapperStyle,
}: {
  config: MicroSiteConfig
  theme: MicroSiteTheme
  services: ServiceCard[]
  professional: SiteBuilderProfessional
  slug: string
  socialLinks: MicroSiteSocialLinks
  wrapperStyle: React.CSSProperties
}) {
  // Re-derive a style when branding changes, falling back to the parent style.
  const previewStyle = resolveTheme(theme, config.branding).style
  const merged: React.CSSProperties = { ...wrapperStyle, ...previewStyle }
  return (
    <div style={merged} className="min-h-full">
      {config.order.map((sectionType) => {
        const section = config.sections[sectionType]
        if (!section.enabled) return null
        const key = sectionType
        switch (sectionType) {
          case "hero":
            return (
              <HeroSection
                key={key}
                section={config.sections.hero}
                branding={config.branding}
                professional={{
                  fullName: professional.fullName,
                  bio: professional.bio,
                  avatarUrl: professional.avatarUrl,
                }}
              />
            )
          case "about":
            return (
              <AboutSection
                key={key}
                section={config.sections.about}
                professional={{
                  fullName: professional.fullName,
                  bio: professional.bio,
                  certifications: professional.certifications,
                  specialization: professional.specialization,
                }}
              />
            )
          case "services":
            return (
              <ServicesSection
                key={key}
                section={config.sections.services}
                services={services}
                locale={professional.locale}
              />
            )
          case "testimonials":
            return (
              <TestimonialsSection
                key={key}
                section={config.sections.testimonials}
                preview
              />
            )
          case "contact":
            return (
              <ContactSection
                key={key}
                section={config.sections.contact}
                slug={slug}
              />
            )
          case "faq":
            return (
              <FaqSection
                key={key}
                section={config.sections.faq}
                preview
              />
            )
          case "blog":
            return <BlogSection key={key} section={config.sections.blog} />
          case "niche":
            return (
              <NichePlaceholderSection
                key={key}
                section={config.sections.niche}
              />
            )
          default:
            return null
        }
      })}
      <MicroSiteFooter
        professional={{ fullName: professional.fullName }}
        socialLinks={socialLinks}
      />
    </div>
  )
}
