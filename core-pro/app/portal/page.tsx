import { Home } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { EmptyState, PageHeader } from "@/components/shared/page-header"

export default async function PortalHomePage() {
  const t = await getTranslations("portal")
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("welcome")}
        description={t("welcomeDescription")}
      />
      <EmptyState
        icon={<Home />}
        title={t("ready")}
        description={t("readyDescription")}
      />
    </div>
  )
}
