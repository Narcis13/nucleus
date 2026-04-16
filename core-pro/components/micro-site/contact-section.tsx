import type { MicroSiteContactSection } from "@/types/domain"

import { ContactForm } from "./contact-form"

export function ContactSection({
  section,
  slug,
}: {
  section: MicroSiteContactSection
  slug: string
}) {
  if (!section.enabled) return null

  return (
    <section
      id="contact"
      className="px-6 py-20"
      style={{ backgroundColor: "var(--ms-surface)" }}
    >
      <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[1fr_1fr]">
        <div className="space-y-3">
          <h2
            className="text-3xl font-semibold tracking-tight"
            style={{ fontFamily: "var(--ms-font-heading)" }}
          >
            {section.title || "Get in touch"}
          </h2>
          {section.intro && (
            <p className="text-lg" style={{ color: "var(--ms-muted)" }}>
              {section.intro}
            </p>
          )}
          <dl className="mt-4 space-y-2 text-sm" style={{ color: "var(--ms-muted)" }}>
            {section.email && (
              <div className="flex items-center gap-2">
                <dt className="font-medium" style={{ color: "var(--ms-fg)" }}>
                  Email:
                </dt>
                <dd>
                  <a
                    href={`mailto:${section.email}`}
                    style={{ color: "var(--ms-primary)" }}
                  >
                    {section.email}
                  </a>
                </dd>
              </div>
            )}
            {section.phone && (
              <div className="flex items-center gap-2">
                <dt className="font-medium" style={{ color: "var(--ms-fg)" }}>
                  Phone:
                </dt>
                <dd>{section.phone}</dd>
              </div>
            )}
          </dl>
        </div>
        <ContactForm section={section} slug={slug} />
      </div>
    </section>
  )
}
