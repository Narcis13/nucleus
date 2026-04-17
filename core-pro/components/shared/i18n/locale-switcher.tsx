"use client"

import { Check, Globe, Loader2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useAction } from "next-safe-action/hooks"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { setLocaleAction } from "@/lib/actions/locale"
import {
  LOCALES,
  LOCALE_LABELS,
  type Locale,
  isLocale,
} from "@/lib/i18n/config"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// <LocaleSwitcher>
//
// Dropdown that swaps the active UI language. Used both in the dashboard
// settings card and the portal header. Visual variants:
//   • `compact`  — icon-only button, suitable for the portal header where
//                  space is tight.
//   • `expanded` — button shows the language label, for menus and settings.
//
// Behaviour: calls `setLocaleAction`, which updates the cookie and (when
// signed in) persists the choice to the professional's or client's DB row,
// then revalidates the root layout so the next render reads new messages.
// ─────────────────────────────────────────────────────────────────────────────
export function LocaleSwitcher({
  variant = "expanded",
  className,
  align = "end",
}: {
  variant?: "compact" | "expanded"
  className?: string
  align?: "start" | "center" | "end"
}) {
  const current = useLocale()
  const t = useTranslations("locale")
  const { execute, isExecuting } = useAction(setLocaleAction, {
    onSuccess() {
      toast.success(t("switched"))
    },
    onError({ error }) {
      toast.error(error.serverError ?? "Error")
    },
  })

  const activeLocale: Locale = isLocale(current) ? current : "ro"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size={variant === "compact" ? "icon-sm" : "sm"}
            className={cn(variant === "expanded" && "gap-1.5", className)}
            aria-label={t("label")}
            disabled={isExecuting}
          />
        }
      >
        {isExecuting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Globe className="size-4" />
        )}
        {variant === "expanded" && (
          <span className="truncate">{LOCALE_LABELS[activeLocale]}</span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-[160px]">
        {LOCALES.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => {
              if (locale === activeLocale) return
              execute({ locale })
            }}
          >
            <span className="flex-1">{LOCALE_LABELS[locale]}</span>
            {locale === activeLocale && (
              <Check className="size-4 text-muted-foreground" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
