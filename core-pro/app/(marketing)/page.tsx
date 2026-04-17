import Link from "next/link"
import {
  CalendarClock,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const features = [
  {
    icon: Users,
    title: "Client CRM",
    body: "Profiles, tags, notes, activity — the full relationship on one screen.",
  },
  {
    icon: LayoutDashboard,
    title: "Lead pipeline",
    body: "Drag-and-drop Kanban that converts won leads into clients in a click.",
  },
  {
    icon: MessageSquare,
    title: "Real-time messaging",
    body: "Branded client portal with file-sharing and read receipts baked in.",
  },
  {
    icon: CalendarClock,
    title: "Bookings & reminders",
    body: "Public booking widget, iCal export, automated reminder emails.",
  },
  {
    icon: FileText,
    title: "Forms, invoices, docs",
    body: "Build forms, track invoices, manage documents from a single workspace.",
  },
  {
    icon: Sparkles,
    title: "Automations & micro-site",
    body: "Trigger.dev-powered flows and a publishable marketing micro-site per pro.",
  },
]

export default function MarketingHomePage() {
  return (
    <div className="flex flex-col">
      <section className="container mx-auto flex flex-col items-center gap-8 px-4 py-20 text-center md:py-28">
        <span className="rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          The universal CRM boilerplate for service professionals
        </span>
        <h1 className="font-heading max-w-3xl text-balance text-4xl font-semibold tracking-tight md:text-6xl">
          Run your practice, not your tooling.
        </h1>
        <p className="max-w-xl text-balance text-base text-muted-foreground md:text-lg">
          CorePro gives coaches, consultants, and agents a client portal,
          scheduling, messaging, invoicing, and a marketing micro-site — in one
          branded workspace.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/sign-up">
            <Button size="lg">Start free</Button>
          </Link>
          <Link href="/pricing">
            <Button size="lg" variant="outline">
              See pricing
            </Button>
          </Link>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-20 md:pb-28">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Everything a one-person business needs
          </h2>
          <p className="mt-3 text-muted-foreground">
            Replace five tools with one. Keep your brand on every touchpoint.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <f.icon className="mb-2 size-5 text-primary" />
                <CardTitle>{f.title}</CardTitle>
                <CardDescription>{f.body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t bg-muted/30">
        <div className="container mx-auto flex flex-col items-center gap-4 px-4 py-16 text-center md:py-20">
          <h2 className="font-heading max-w-2xl text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Ready to consolidate your stack?
          </h2>
          <p className="max-w-xl text-muted-foreground">
            Start on the free tier — upgrade when your first paying client
            signs up.
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <Link href="/sign-up">
              <Button size="lg">Create your workspace</Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="ghost">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
