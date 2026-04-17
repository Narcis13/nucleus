import { Briefcase } from "lucide-react"

import { ServicesSurface } from "@/components/dashboard/services/services-surface"
import { EmptyState, PageHeader } from "@/components/shared/page-header"
import { getServices } from "@/lib/db/queries/services"

export default async function ServicesPage() {
  const services = await getServices()
  const activeCount = services.filter((s) => s.isActive).length

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Services"
        description={
          services.length === 0
            ? "Define the offerings your clients can book or purchase."
            : `${services.length} services · ${activeCount} active`
        }
      />

      {services.length === 0 ? (
        <>
          <ServicesSurface initialServices={services} />
          <EmptyState
            icon={<Briefcase />}
            title="No services yet"
            description="Create your first offering — it powers the booking widget, the micro-site services section, and invoice line-item suggestions."
          />
        </>
      ) : (
        <ServicesSurface initialServices={services} />
      )}
    </div>
  )
}
