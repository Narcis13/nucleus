"use client"

import { useMemo, useState } from "react"
import { useAction } from "next-safe-action/hooks"
import { toast } from "sonner"
import { ImageIcon, Loader2, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  prepareLogoUploadAction,
  updateBrandingAction,
} from "@/lib/actions/settings"
import { env } from "@/lib/env"
import { useSupabaseBrowser } from "@/lib/supabase/client"
import type { Branding } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// <BrandingForm>
//
// Client-side editor for the professional's brand: primary colour, secondary
// colour, a font hint (applied to `--font-sans`), and an optional logo image.
// The live preview mirrors the dashboard + portal + micro-site by applying the
// same CSS variable overrides, so the user can see their palette before
// saving.
// ─────────────────────────────────────────────────────────────────────────────

const FONT_CHOICES: { label: string; value: string }[] = [
  { label: "Default (system sans)", value: "" },
  { label: "Inter", value: "Inter, var(--font-sans)" },
  { label: "Geist Sans", value: "'Geist Sans', var(--font-sans)" },
  { label: "Manrope", value: "Manrope, var(--font-sans)" },
  { label: "Plus Jakarta Sans", value: "'Plus Jakarta Sans', var(--font-sans)" },
]

export function BrandingForm({
  professional,
  initialBranding,
}: {
  professional: {
    id: string
    fullName: string
    plan: string
    avatarUrl: string | null
  }
  initialBranding: Branding
}) {
  const supabase = useSupabaseBrowser()
  const [branding, setBranding] = useState<Branding>({
    primary_color: initialBranding.primary_color ?? "#6366f1",
    secondary_color: initialBranding.secondary_color ?? "#ec4899",
    font: initialBranding.font ?? "",
    logo_url: initialBranding.logo_url ?? null,
  })
  const [uploading, setUploading] = useState(false)

  const { execute: save, isExecuting: saving } = useAction(
    updateBrandingAction,
    {
      onSuccess() {
        toast.success("Branding saved — applied everywhere.")
      },
      onError({ error }) {
        toast.error(error.serverError ?? "Couldn't save branding")
      },
    },
  )

  const prepare = useAction(prepareLogoUploadAction)

  async function onLogoPicked(file: File | null) {
    if (!file) return
    setUploading(true)
    try {
      const prep = await prepare.executeAsync({
        filename: file.name,
        contentType: file.type || "image/png",
        fileSize: file.size,
      })
      if (!prep?.data) {
        throw new Error(prep?.serverError ?? "Couldn't prepare upload")
      }
      const { error } = await supabase.storage
        .from(prep.data.bucket)
        .upload(prep.data.storageKey, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        })
      if (error) throw error
      const publicUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${prep.data.bucket}/${prep.data.storageKey}`
      setBranding((b) => ({ ...b, logo_url: publicUrl }))
      toast.success("Logo uploaded — remember to save.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const previewStyle = useMemo<React.CSSProperties>(
    () => ({
      "--primary": branding.primary_color,
      "--ring": branding.primary_color,
      "--accent": branding.secondary_color,
      "--font-sans": branding.font || undefined,
    }) as React.CSSProperties,
    [branding],
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Colours</CardTitle>
            <CardDescription>
              Applied to the dashboard, client portal, email headers, and any
              published micro-site.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ColorField
              id="primary-color"
              label="Primary colour"
              value={branding.primary_color ?? "#6366f1"}
              onChange={(v) =>
                setBranding((b) => ({ ...b, primary_color: v }))
              }
            />
            <ColorField
              id="secondary-color"
              label="Accent colour"
              value={branding.secondary_color ?? "#ec4899"}
              onChange={(v) =>
                setBranding((b) => ({ ...b, secondary_color: v }))
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Typography</CardTitle>
            <CardDescription>
              Pick a font family for headings and body text.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="font-picker">Font</Label>
            <select
              id="font-picker"
              className="mt-1.5 h-8 w-full rounded-md border border-input bg-background px-2.5 text-sm"
              value={branding.font ?? ""}
              onChange={(e) =>
                setBranding((b) => ({ ...b, font: e.target.value }))
              }
            >
              {FONT_CHOICES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Logo</CardTitle>
            <CardDescription>
              Square or horizontal logo — up to 5 MB. Growth plan and above.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex size-16 items-center justify-center overflow-hidden rounded-lg bg-muted">
                {branding.logo_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={branding.logo_url}
                    alt="Logo"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <ImageIcon className="size-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="logo-input"
                  className="inline-flex h-8 w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
                >
                  {uploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ImageIcon className="size-4" />
                  )}
                  {branding.logo_url ? "Replace" : "Upload logo"}
                </Label>
                <input
                  id="logo-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(e) => onLogoPicked(e.target.files?.[0] ?? null)}
                />
                {branding.logo_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setBranding((b) => ({ ...b, logo_url: null }))
                    }
                  >
                    <Trash2 className="size-3.5" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            onClick={() =>
              save({
                primary_color: branding.primary_color,
                secondary_color: branding.secondary_color,
                font: branding.font || undefined,
                logo_url: branding.logo_url,
              })
            }
            disabled={saving}
          >
            {saving ? "Saving…" : "Save branding"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Label>Live preview</Label>
        <div
          className="overflow-hidden rounded-xl border border-border bg-background"
          style={previewStyle}
        >
          <PortalPreview
            fullName={professional.fullName}
            avatarUrl={professional.avatarUrl}
            logoUrl={branding.logo_url}
          />
        </div>
        <div
          className="overflow-hidden rounded-xl border border-border bg-background"
          style={previewStyle}
        >
          <MicroSitePreview
            fullName={professional.fullName}
            logoUrl={branding.logo_url}
            primary={branding.primary_color ?? "#6366f1"}
            secondary={branding.secondary_color ?? "#ec4899"}
          />
        </div>
      </div>
    </div>
  )
}

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (next: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-12 cursor-pointer rounded-md border border-border bg-background"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 font-mono text-xs"
          maxLength={7}
        />
      </div>
    </div>
  )
}

// Miniature portal chrome — header bar + sidebar tile + primary button. Uses
// the `var(--primary)` token just like the real /portal layout.
function PortalPreview({
  fullName,
  avatarUrl,
  logoUrl,
}: {
  fullName: string
  avatarUrl: string | null
  logoUrl: string | null | undefined
}) {
  return (
    <div className="flex flex-col gap-0" style={{ fontFamily: "var(--font-sans)" }}>
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
        {logoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={logoUrl} alt="Logo" className="h-5 w-5 object-contain" />
        ) : avatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={avatarUrl} alt="" className="size-5 rounded-full object-cover" />
        ) : (
          <div
            className="size-5 rounded-full"
            style={{ backgroundColor: "var(--primary)" }}
          />
        )}
        <span className="text-xs font-medium">{fullName}</span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          Client portal
        </span>
      </div>
      <div className="grid gap-3 p-4">
        <div
          className="h-1.5 rounded-full"
          style={{ backgroundColor: "var(--primary)", width: "40%" }}
        />
        <div className="h-1 rounded-full bg-muted" style={{ width: "80%" }} />
        <div className="h-1 rounded-full bg-muted" style={{ width: "60%" }} />
        <button
          type="button"
          className="mt-2 inline-flex h-7 w-fit items-center rounded-md px-3 text-xs font-medium text-white"
          style={{ backgroundColor: "var(--primary)" }}
        >
          Book appointment
        </button>
      </div>
    </div>
  )
}

// Miniature micro-site hero — just enough to show the palette in a marketing
// context (gradient + CTA).
function MicroSitePreview({
  fullName,
  logoUrl,
  primary,
  secondary,
}: {
  fullName: string
  logoUrl: string | null | undefined
  primary: string
  secondary: string
}) {
  return (
    <div
      className="flex flex-col gap-2 p-4"
      style={{
        fontFamily: "var(--font-sans)",
        background: `linear-gradient(135deg, ${primary}22, ${secondary}22)`,
      }}
    >
      <div className="flex items-center gap-2">
        {logoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={logoUrl} alt="" className="h-6 w-6 object-contain" />
        ) : null}
        <span className="text-xs font-semibold">{fullName}</span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          Micro-site
        </span>
      </div>
      <h3
        className="text-lg font-bold"
        style={{ color: primary }}
      >
        Work with {fullName.split(" ")[0] || "me"}
      </h3>
      <p className="text-xs text-muted-foreground">
        Book a session, get reminders, and stay on track.
      </p>
      <button
        type="button"
        className="mt-1 inline-flex h-7 w-fit items-center rounded-md px-3 text-xs font-medium text-white"
        style={{ backgroundColor: primary }}
      >
        Get started
      </button>
    </div>
  )
}
