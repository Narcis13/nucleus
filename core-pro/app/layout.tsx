import type { Metadata } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { Geist, Geist_Mono } from "next/font/google"
import { PostHogProvider } from "@/components/providers/posthog-provider"
import { PostHogPageview } from "@/components/providers/posthog-pageview"
import { PostHogIdentify } from "@/components/providers/posthog-identify"
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
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <PostHogProvider>
            <PostHogPageview />
            <PostHogIdentify />
            {children}
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
