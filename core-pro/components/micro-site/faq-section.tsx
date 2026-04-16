import type { MicroSiteFaqSection } from "@/types/domain"

export function FaqSection({ section }: { section: MicroSiteFaqSection }) {
  if (!section.enabled) return null
  if (section.items.length === 0) return null

  return (
    <section
      id="faq"
      className="px-6 py-20"
      style={{ backgroundColor: "var(--ms-surface-alt)" }}
    >
      <div className="mx-auto max-w-3xl space-y-8">
        <h2
          className="text-3xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--ms-font-heading)" }}
        >
          {section.title || "Frequently asked"}
        </h2>
        <ul className="divide-y" style={{ borderColor: "var(--ms-border)" }}>
          {section.items.map((item) => (
            <li key={item.id} className="py-4">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-lg font-medium">
                  <span>{item.question}</span>
                  <span
                    className="ml-4 text-xl transition-transform group-open:rotate-45"
                    style={{ color: "var(--ms-primary)" }}
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <p
                  className="mt-3 text-base leading-relaxed"
                  style={{ color: "var(--ms-muted)" }}
                >
                  {item.answer}
                </p>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
