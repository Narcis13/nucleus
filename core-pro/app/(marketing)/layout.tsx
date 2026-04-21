import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { UserButton } from "@clerk/nextjs"
import { getTranslations } from "next-intl/server"

import { LocaleSwitcher } from "@/components/shared/i18n/locale-switcher"
import { Button } from "@/components/ui/button"

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  const isSignedIn = Boolean(userId)
  const t = await getTranslations("marketing.header")

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="font-heading text-lg font-semibold tracking-tight">
            CorePro
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <Link href="/pricing" className="transition-colors hover:text-foreground">
              {t("pricing")}
            </Link>
            <Link href="/blog" className="transition-colors hover:text-foreground">
              {t("blog")}
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <LocaleSwitcher variant="compact" />
            {isSignedIn ? (
              <>
                <Link href="/dashboard">
                  <Button size="sm">{t("goToDashboard")}</Button>
                </Link>
                <UserButton afterSignOutUrl="/" />
              </>
            ) : (
              <>
                <Link href="/sign-in">
                  <Button variant="ghost" size="sm">
                    {t("signIn")}
                  </Button>
                </Link>
                <Link href="/sign-up">
                  <Button size="sm">{t("startFree")}</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </>
  )
}
