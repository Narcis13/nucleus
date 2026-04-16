"use client"

import { FileDown, Mail, Sparkles } from "lucide-react"
import { useState } from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type {
  EmailCampaign,
  LeadMagnet,
  SocialTemplate,
} from "@/types/domain"

import { EmailCampaignsTab } from "./email-campaigns-tab"
import { LeadMagnetsTab } from "./lead-magnets-tab"
import { SocialTemplatesTab } from "./social-templates-tab"

// ─────────────────────────────────────────────────────────────────────────────
// <MarketingWorkspace>
//
// Tabbed shell for the marketing kit. Each tab owns its own dialog, list
// state, and server-action wiring — this file is a thin router over them.
// ─────────────────────────────────────────────────────────────────────────────

export type MarketingWorkspaceProps = {
  campaigns: Array<{ campaign: EmailCampaign; recipientCount: number }>
  socialTemplates: SocialTemplate[]
  leadMagnets: LeadMagnet[]
  professionalName: string
  professionalBrand: { primary: string; secondary: string }
  tags: Array<{ id: string; name: string; color: string | null }>
  plan: string
}

type TabKey = "email" | "social" | "magnets"

const TABS: Array<{ key: TabKey; label: string; icon: typeof Mail }> = [
  { key: "email", label: "Email campaigns", icon: Mail },
  { key: "social", label: "Social templates", icon: Sparkles },
  { key: "magnets", label: "Lead magnets", icon: FileDown },
]

export function MarketingWorkspace(props: MarketingWorkspaceProps) {
  const [tab, setTab] = useState<TabKey>("email")

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
      <TabsList>
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <TabsTrigger key={t.key} value={t.key}>
              <Icon className="size-4" />
              {t.label}
            </TabsTrigger>
          )
        })}
      </TabsList>

      <TabsContent value="email" className="mt-4">
        <EmailCampaignsTab
          campaigns={props.campaigns}
          tags={props.tags}
          professionalName={props.professionalName}
        />
      </TabsContent>

      <TabsContent value="social" className="mt-4">
        <SocialTemplatesTab
          templates={props.socialTemplates}
          brand={props.professionalBrand}
          professionalName={props.professionalName}
        />
      </TabsContent>

      <TabsContent value="magnets" className="mt-4">
        <LeadMagnetsTab magnets={props.leadMagnets} />
      </TabsContent>
    </Tabs>
  )
}
