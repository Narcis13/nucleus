"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useAction } from "next-safe-action/hooks"
import { toast } from "sonner"
import { Camera, Loader2, Plus, Trash2 } from "lucide-react"

import { LocaleSwitcher } from "@/components/shared/i18n/locale-switcher"
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
import { Textarea } from "@/components/ui/textarea"
import {
  prepareAvatarUploadAction,
  setAvatarUrlAction,
  updateProfileAction,
} from "@/lib/actions/settings"
import { useSupabaseBrowser } from "@/lib/supabase/client"
import { env } from "@/lib/env"
import type { Professional } from "@/types/domain"

// Parse avatarUrl "<bucket>/<key>" style (Supabase public URL). We display the
// URL as-is; for uploads we POST the file then patch the row.

export function ProfileForm({ professional }: { professional: Professional }) {
  const supabase = useSupabaseBrowser()
  const t = useTranslations("dashboard.settings")
  const tCommon = useTranslations("common")
  const [form, setForm] = useState(() => ({
    fullName: professional.fullName ?? "",
    bio: professional.bio ?? "",
    phone: professional.phone ?? "",
    timezone: professional.timezone ?? "Europe/Bucharest",
    locale: professional.locale ?? "ro",
    currency: professional.currency ?? "EUR",
    specialization: (professional.specialization ?? []) as string[],
    certifications: (professional.certifications ?? []) as string[],
  }))
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    professional.avatarUrl ?? null,
  )
  const [uploading, setUploading] = useState(false)

  const { execute: save, isExecuting: saving } = useAction(updateProfileAction, {
    onSuccess() {
      toast.success(t("profile.saved"))
    },
    onError({ error }) {
      toast.error(error.serverError ?? t("profile.saveError"))
    },
  })

  const prepareAvatar = useAction(prepareAvatarUploadAction)
  const setAvatar = useAction(setAvatarUrlAction)

  async function onAvatarPicked(file: File | null) {
    if (!file) return
    setUploading(true)
    try {
      const prep = await prepareAvatar.executeAsync({
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
      const res = await setAvatar.executeAsync({ avatarUrl: publicUrl })
      if (!res?.data) {
        throw new Error(res?.serverError ?? "Couldn't save avatar")
      }
      setAvatarUrl(publicUrl)
      toast.success("Photo updated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  function onSave() {
    save({
      fullName: form.fullName,
      bio: form.bio || null,
      phone: form.phone || null,
      timezone: form.timezone,
      locale: form.locale,
      currency: form.currency,
      specialization: form.specialization,
      certifications: form.certifications,
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("profile.title")}</CardTitle>
          <CardDescription>{t("profile.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="relative size-20 overflow-hidden rounded-full bg-muted">
              {avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={avatarUrl}
                  alt={form.fullName || "Avatar"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <Camera className="size-6" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="avatar-input"
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Camera className="size-4" />
                )}
                {avatarUrl
                  ? t("profile.replacePhoto")
                  : t("profile.uploadPhoto")}
              </Label>
              <input
                id="avatar-input"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => onAvatarPicked(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                {t("profile.photoHint")}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="fullName"
              label={t("profile.fullName")}
              value={form.fullName}
              onChange={(v) => setForm((f) => ({ ...f, fullName: v }))}
            />
            <Field
              id="phone"
              label={t("profile.phone")}
              value={form.phone}
              onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">{t("profile.bio")}</Label>
            <Textarea
              id="bio"
              rows={4}
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder={t("profile.bioPlaceholder")}
            />
          </div>

          <ListEditor
            label={t("profile.specializations")}
            values={form.specialization}
            placeholder="Nutrition therapy, Sleep coaching…"
            onChange={(next) => setForm((f) => ({ ...f, specialization: next }))}
          />
          <ListEditor
            label={t("profile.certifications")}
            values={form.certifications}
            placeholder="ISSA, RYT-200, PhD Nutrition…"
            onChange={(next) => setForm((f) => ({ ...f, certifications: next }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("locale.title")}</CardTitle>
          <CardDescription>{t("locale.description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field
            id="timezone"
            label={t("locale.timezone")}
            value={form.timezone}
            onChange={(v) => setForm((f) => ({ ...f, timezone: v }))}
            hint={t("locale.timezoneHint")}
          />
          <div className="space-y-1.5">
            <Label>{t("locale.language")}</Label>
            <LocaleSwitcher align="start" className="w-full justify-start" />
            <p className="text-xs text-muted-foreground">
              {t("locale.languageHint")}
            </p>
          </div>
          <Field
            id="currency"
            label={t("locale.currency")}
            value={form.currency}
            onChange={(v) => setForm((f) => ({ ...f, currency: v }))}
            hint={t("locale.currencyHint")}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={saving}>
          {saving ? tCommon("saving") : t("profile.saveProfile")}
        </Button>
      </div>
    </div>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string
  label: string
  value: string
  onChange: (next: string) => void
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function ListEditor({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string
  values: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}) {
  const [draft, setDraft] = useState("")
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {values.map((v, i) => (
          <span
            key={`${v}-${i}`}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              className="text-muted-foreground hover:text-destructive"
              aria-label={`Remove ${v}`}
            >
              <Trash2 className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              e.preventDefault()
              onChange([...values, draft.trim()])
              setDraft("")
            }
          }}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (!draft.trim()) return
            onChange([...values, draft.trim()])
            setDraft("")
          }}
        >
          <Plus className="size-4" />
          Add
        </Button>
      </div>
    </div>
  )
}
