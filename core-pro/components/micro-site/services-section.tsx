import type { MicroSiteServicesSection, Service } from "@/types/domain"

type ServiceCard = Pick<
  Service,
  "id" | "name" | "description" | "price" | "currency" | "durationMinutes"
>

export function ServicesSection({
  section,
  services,
  locale,
}: {
  section: MicroSiteServicesSection
  services: ServiceCard[]
  locale: string
}) {
  if (!section.enabled) return null
  if (services.length === 0) return null

  return (
    <section
      id="services"
      className="px-6 py-20"
      style={{ backgroundColor: "var(--ms-surface-alt)" }}
    >
      <div className="mx-auto max-w-5xl space-y-10">
        <div className="max-w-2xl space-y-3">
          <h2
            className="text-3xl font-semibold tracking-tight"
            style={{ fontFamily: "var(--ms-font-heading)" }}
          >
            {section.title || "Services"}
          </h2>
          {section.intro && (
            <p className="text-lg" style={{ color: "var(--ms-muted)" }}>
              {section.intro}
            </p>
          )}
        </div>
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <li
              key={service.id}
              className="flex flex-col gap-3 p-6"
              style={{
                backgroundColor: "var(--ms-surface)",
                border: "1px solid var(--ms-border)",
                borderRadius: "var(--ms-radius)",
                boxShadow: "var(--ms-shadow)",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold">{service.name}</h3>
                {section.show_pricing !== false && service.price !== null && (
                  <span
                    className="shrink-0 text-sm font-medium"
                    style={{ color: "var(--ms-primary)" }}
                  >
                    {formatPrice(Number(service.price), service.currency, locale)}
                  </span>
                )}
              </div>
              {service.description && (
                <p className="text-sm" style={{ color: "var(--ms-muted)" }}>
                  {service.description}
                </p>
              )}
              {service.durationMinutes ? (
                <p
                  className="text-xs uppercase tracking-wide"
                  style={{ color: "var(--ms-muted)" }}
                >
                  {service.durationMinutes} min
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function formatPrice(value: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale || undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${Math.round(value)} ${currency}`
  }
}
