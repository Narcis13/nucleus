import type { MicroSiteTestimonialsSection } from "@/types/domain"

export function TestimonialsSection({
  section,
}: {
  section: MicroSiteTestimonialsSection
}) {
  if (!section.enabled) return null
  if (section.items.length === 0) return null

  return (
    <section
      id="testimonials"
      className="px-6 py-20"
      style={{ backgroundColor: "var(--ms-surface)" }}
    >
      <div className="mx-auto max-w-5xl space-y-10">
        <h2
          className="text-3xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--ms-font-heading)" }}
        >
          {section.title || "What clients say"}
        </h2>
        <ul className="grid gap-4 md:grid-cols-2">
          {section.items.map((t) => (
            <li
              key={t.id}
              className="flex flex-col gap-4 p-6"
              style={{
                backgroundColor: "var(--ms-surface-alt)",
                border: "1px solid var(--ms-border)",
                borderRadius: "var(--ms-radius)",
                boxShadow: "var(--ms-shadow)",
              }}
            >
              {typeof t.rating === "number" && (
                <div aria-label={`${t.rating} out of 5`} style={{ color: "var(--ms-accent)" }}>
                  {"★".repeat(Math.max(0, Math.min(5, t.rating)))}
                  <span style={{ color: "var(--ms-border)" }}>
                    {"★".repeat(5 - Math.max(0, Math.min(5, t.rating)))}
                  </span>
                </div>
              )}
              <blockquote className="text-base italic leading-relaxed">
                “{t.content}”
              </blockquote>
              <div
                className="text-sm"
                style={{ color: "var(--ms-muted)" }}
              >
                <span className="font-medium" style={{ color: "var(--ms-fg)" }}>
                  {t.author}
                </span>
                {t.role ? ` · ${t.role}` : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
