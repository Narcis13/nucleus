import type { Metadata, Viewport } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { Geist, Geist_Mono } from "next/font/google"
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getMessages } from "next-intl/server"
import { PostHogProvider } from "@/components/providers/posthog-provider"
import { PostHogPageview } from "@/components/providers/posthog-pageview"
import { PostHogIdentify } from "@/components/providers/posthog-identify"
import { PwaProvider } from "@/components/shared/pwa/pwa-provider"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "CorePro",
  description: "The universal CRM boilerplate for service professionals.",
  applicationName: "CorePro",
  appleWebApp: {
    capable: true,
    title: "CorePro",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
}

// Viewport controls the PWA status-bar tint and ensures we render under the
// iOS notch / Android nav bar so safe-area insets are meaningful. Using a
// media-aware theme-color keeps the status bar readable in both schemes.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // getLocale() reads the resolved locale from our request config so the
  // <html lang> attribute (and anything downstream in the tree) lines up with
  // the messages the client provider is about to hand out.
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <ClerkProvider>
      <html
        lang={locale}
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <NextIntlClientProvider locale={locale} messages={messages}>
            <PostHogProvider>
              <PostHogPageview />
              <PostHogIdentify />
              <PwaProvider />
              {children}
              <Toaster position="top-right" richColors closeButton />
            </PostHogProvider>
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
