import Link from "next/link"
import {
  CalendarClock,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  Users,
} from "lucide-react"
import { getTranslations } from "next-intl/server"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const FEATURES = [
  { key: "crm", icon: Users },
  { key: "leads", icon: LayoutDashboard },
  { key: "messaging", icon: MessageSquare },
  { key: "bookings", icon: CalendarClock },
  { key: "forms", icon: FileText },
  { key: "automations", icon: Sparkles },
] as const

export default async function MarketingHomePage() {
  const t = await getTranslations("marketing.home")

  return (
    <div className="flex flex-col">
      <section className="container mx-auto flex flex-col items-center gap-8 px-4 py-20 text-center md:py-28">
        <span className="rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {t("eyebrow")}
        </span>
        <h1 className="font-heading max-w-3xl text-balance text-4xl font-semibold tracking-tight md:text-6xl">
          {t("heroTitle")}
        </h1>
        <p className="max-w-xl text-balance text-base text-muted-foreground md:text-lg">
          {t("heroSubtitle")}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/sign-up">
            <Button size="lg">{t("startFreeCta")}</Button>
          </Link>
          <Link href="/pricing">
            <Button size="lg" variant="outline">
              {t("seePricingCta")}
            </Button>
          </Link>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-20 md:pb-28">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            {t("featuresTitle")}
          </h2>
          <p className="mt-3 text-muted-foreground">{t("featuresSubtitle")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.key}>
              <CardHeader>
                <f.icon className="mb-2 size-5 text-primary" />
                <CardTitle>{t(`features.${f.key}.title`)}</CardTitle>
                <CardDescription>{t(`features.${f.key}.body`)}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t bg-muted/30">
        <div className="container mx-auto flex flex-col items-center gap-4 px-4 py-16 text-center md:py-20">
          <h2 className="font-heading max-w-2xl text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            {t("ctaTitle")}
          </h2>
          <p className="max-w-xl text-muted-foreground">{t("ctaBody")}</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <Link href="/sign-up">
              <Button size="lg">{t("createWorkspace")}</Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="ghost">
                {t("signIn")}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
