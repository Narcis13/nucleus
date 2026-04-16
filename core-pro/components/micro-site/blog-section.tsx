import type { MicroSitePlaceholderSection } from "@/types/domain"

// Blog section is a visual placeholder in the boilerplate. A niche fork that
// wants a real blog replaces this component (or wires its own renderer into
// the `niche` slot) without migrating existing site rows.
export function BlogSection({
  section,
}: {
  section: MicroSitePlaceholderSection
}) {
  if (!section.enabled) return null

  return (
    <section
      id="blog"
      className="px-6 py-16"
      style={{ backgroundColor: "var(--ms-surface-alt)" }}
    >
      <div className="mx-auto max-w-3xl space-y-3 text-center">
        <h2
          className="text-3xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--ms-font-heading)" }}
        >
          {section.title || "From the journal"}
        </h2>
        {section.body && (
          <p className="text-base" style={{ color: "var(--ms-muted)" }}>
            {section.body}
          </p>
        )}
      </div>
    </section>
  )
}

// Generic "niche" placeholder — kept deliberately neutral so a niche fork can
// swap the content without restructuring the micro-site shell.
export function NichePlaceholderSection({
  section,
}: {
  section: MicroSitePlaceholderSection
}) {
  if (!section.enabled) return null

  return (
    <section
      id="niche"
      className="px-6 py-16"
      style={{ backgroundColor: "var(--ms-surface)" }}
    >
      <div className="mx-auto max-w-3xl space-y-3">
        <h2
          className="text-3xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--ms-font-heading)" }}
        >
          {section.title || "Specialised services"}
        </h2>
        {section.body && (
          <p
            className="whitespace-pre-line text-lg leading-relaxed"
            style={{ color: "var(--ms-muted)" }}
          >
            {section.body}
          </p>
        )}
      </div>
    </section>
  )
}
