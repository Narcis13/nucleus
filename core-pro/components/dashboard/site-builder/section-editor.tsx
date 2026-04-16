"use client"

import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type {
  MicroSiteConfig,
  MicroSiteFaqItem,
  MicroSiteSectionType,
  MicroSiteTestimonial,
} from "@/types/domain"

// Per-section editor. Receives the full config + a mutator so each field can
// patch the corresponding slot without the outer editor knowing about every
// shape. Kept as one file on purpose — individual sections are small and the
// hop-around cost of five files for a trivial form set outweighs the locality.
export function SectionEditor({
  sectionType,
  config,
  onChange,
}: {
  sectionType: MicroSiteSectionType
  config: MicroSiteConfig
  onChange: (producer: (draft: MicroSiteConfig) => MicroSiteConfig) => void
}) {
  switch (sectionType) {
    case "hero":
      return <HeroEditor config={config} onChange={onChange} />
    case "about":
      return <AboutEditor config={config} onChange={onChange} />
    case "services":
      return <ServicesEditor config={config} onChange={onChange} />
    case "testimonials":
      return <TestimonialsEditor config={config} onChange={onChange} />
    case "contact":
      return <ContactEditor config={config} onChange={onChange} />
    case "faq":
      return <FaqEditor config={config} onChange={onChange} />
    case "blog":
      return <SimpleEditor kind="blog" config={config} onChange={onChange} />
    case "niche":
      return <SimpleEditor kind="niche" config={config} onChange={onChange} />
    default:
      return null
  }
}

type EditorProps = {
  config: MicroSiteConfig
  onChange: (producer: (draft: MicroSiteConfig) => MicroSiteConfig) => void
}

function patchSection<K extends keyof MicroSiteConfig["sections"]>(
  onChange: EditorProps["onChange"],
  key: K,
  patch: Partial<MicroSiteConfig["sections"][K]>,
) {
  onChange((draft) => ({
    ...draft,
    sections: {
      ...draft.sections,
      [key]: { ...draft.sections[key], ...patch },
    },
  }))
}

function HeroEditor({ config, onChange }: EditorProps) {
  const s = config.sections.hero
  return (
    <div className="space-y-3">
      <Field label="Headline">
        <Input
          value={s.headline ?? ""}
          onChange={(e) => patchSection(onChange, "hero", { headline: e.target.value })}
          maxLength={140}
        />
      </Field>
      <Field label="Sub-headline">
        <Textarea
          rows={2}
          value={s.subheadline ?? ""}
          onChange={(e) =>
            patchSection(onChange, "hero", { subheadline: e.target.value })
          }
          maxLength={280}
        />
      </Field>
      <Field label="CTA label">
        <Input
          value={s.cta_label ?? ""}
          onChange={(e) => patchSection(onChange, "hero", { cta_label: e.target.value })}
          maxLength={60}
        />
      </Field>
      <Field label="CTA action">
        <select
          value={s.cta_target ?? "contact"}
          onChange={(e) =>
            patchSection(onChange, "hero", {
              cta_target: e.target.value as typeof s.cta_target,
            })
          }
          className="h-9 rounded-md border border-border bg-background px-2 text-sm"
        >
          <option value="contact">Scroll to contact form</option>
          <option value="services">Scroll to services</option>
          <option value="custom">Custom URL</option>
        </select>
      </Field>
      {s.cta_target === "custom" && (
        <Field label="Custom URL">
          <Input
            type="url"
            value={s.cta_href ?? ""}
            onChange={(e) =>
              patchSection(onChange, "hero", { cta_href: e.target.value })
            }
          />
        </Field>
      )}
    </div>
  )
}

function AboutEditor({ config, onChange }: EditorProps) {
  const s = config.sections.about
  const certList = s.certifications ?? []
  return (
    <div className="space-y-3">
      <Field label="Title">
        <Input
          value={s.title ?? ""}
          onChange={(e) => patchSection(onChange, "about", { title: e.target.value })}
        />
      </Field>
      <Field label="Bio">
        <Textarea
          rows={6}
          value={s.body ?? ""}
          onChange={(e) => patchSection(onChange, "about", { body: e.target.value })}
          maxLength={4000}
          placeholder="Paragraphs separated by a blank line."
        />
      </Field>
      <Field label="Years of experience">
        <Input
          type="number"
          min={0}
          max={80}
          value={s.experience_years ?? ""}
          onChange={(e) => {
            const v = e.target.value === "" ? null : Number(e.target.value)
            patchSection(onChange, "about", { experience_years: v })
          }}
        />
      </Field>
      <div className="space-y-2">
        <Label>Certifications</Label>
        {certList.map((cert, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input
              value={cert}
              onChange={(e) => {
                const next = [...certList]
                next[idx] = e.target.value
                patchSection(onChange, "about", { certifications: next })
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const next = certList.filter((_, i) => i !== idx)
                patchSection(onChange, "about", { certifications: next })
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            patchSection(onChange, "about", {
              certifications: [...certList, ""],
            })
          }
        >
          <Plus className="mr-1 size-3" />
          Add certification
        </Button>
      </div>
    </div>
  )
}

function ServicesEditor({ config, onChange }: EditorProps) {
  const s = config.sections.services
  return (
    <div className="space-y-3">
      <Field label="Title">
        <Input
          value={s.title ?? ""}
          onChange={(e) =>
            patchSection(onChange, "services", { title: e.target.value })
          }
        />
      </Field>
      <Field label="Intro">
        <Textarea
          rows={2}
          value={s.intro ?? ""}
          onChange={(e) =>
            patchSection(onChange, "services", { intro: e.target.value })
          }
          maxLength={400}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={s.show_pricing !== false}
          onChange={(e) =>
            patchSection(onChange, "services", { show_pricing: e.target.checked })
          }
        />
        Show prices
      </label>
      <p className="text-xs text-muted-foreground">
        Cards are generated from your active services. Add or edit them on the
        Services page.
      </p>
    </div>
  )
}

function TestimonialsEditor({ config, onChange }: EditorProps) {
  const s = config.sections.testimonials
  const add = () => {
    const next: MicroSiteTestimonial = {
      id: cryptoRandomId(),
      author: "",
      content: "",
      rating: 5,
    }
    patchSection(onChange, "testimonials", { items: [...s.items, next] })
  }
  const update = (id: string, patch: Partial<MicroSiteTestimonial>) => {
    patchSection(onChange, "testimonials", {
      items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    })
  }
  const remove = (id: string) => {
    patchSection(onChange, "testimonials", {
      items: s.items.filter((i) => i.id !== id),
    })
  }
  return (
    <div className="space-y-3">
      <Field label="Title">
        <Input
          value={s.title ?? ""}
          onChange={(e) =>
            patchSection(onChange, "testimonials", { title: e.target.value })
          }
        />
      </Field>
      <ul className="space-y-3">
        {s.items.map((t) => (
          <li
            key={t.id}
            className="space-y-2 rounded-md border border-border p-3"
          >
            <div className="flex items-center gap-2">
              <Input
                placeholder="Author"
                value={t.author}
                onChange={(e) => update(t.id, { author: e.target.value })}
              />
              <Input
                placeholder="Role (optional)"
                value={t.role ?? ""}
                onChange={(e) => update(t.id, { role: e.target.value })}
              />
            </div>
            <Textarea
              rows={3}
              placeholder="Quote"
              value={t.content}
              onChange={(e) => update(t.id, { content: e.target.value })}
            />
            <div className="flex items-center justify-between">
              <Field label="Rating" inline>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  className="w-20"
                  value={t.rating ?? 5}
                  onChange={(e) =>
                    update(t.id, {
                      rating: Math.max(1, Math.min(5, Number(e.target.value))),
                    })
                  }
                />
              </Field>
              <Button variant="ghost" size="sm" onClick={() => remove(t.id)}>
                <Trash2 className="mr-1 size-3" /> Remove
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <Button variant="outline" size="sm" onClick={add}>
        <Plus className="mr-1 size-3" /> Add testimonial
      </Button>
    </div>
  )
}

function ContactEditor({ config, onChange }: EditorProps) {
  const s = config.sections.contact
  return (
    <div className="space-y-3">
      <Field label="Title">
        <Input
          value={s.title ?? ""}
          onChange={(e) =>
            patchSection(onChange, "contact", { title: e.target.value })
          }
        />
      </Field>
      <Field label="Intro">
        <Textarea
          rows={3}
          value={s.intro ?? ""}
          onChange={(e) =>
            patchSection(onChange, "contact", { intro: e.target.value })
          }
          maxLength={400}
        />
      </Field>
      <Field label="Reply-to email">
        <Input
          type="email"
          value={s.email ?? ""}
          onChange={(e) =>
            patchSection(onChange, "contact", { email: e.target.value })
          }
        />
      </Field>
      <Field label="Phone (optional)">
        <Input
          type="tel"
          value={s.phone ?? ""}
          onChange={(e) =>
            patchSection(onChange, "contact", { phone: e.target.value })
          }
        />
      </Field>
      <p className="text-xs text-muted-foreground">
        Submissions arrive as new leads on your board.
      </p>
    </div>
  )
}

function FaqEditor({ config, onChange }: EditorProps) {
  const s = config.sections.faq
  const add = () => {
    const next: MicroSiteFaqItem = {
      id: cryptoRandomId(),
      question: "",
      answer: "",
    }
    patchSection(onChange, "faq", { items: [...s.items, next] })
  }
  const update = (id: string, patch: Partial<MicroSiteFaqItem>) => {
    patchSection(onChange, "faq", {
      items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    })
  }
  const remove = (id: string) => {
    patchSection(onChange, "faq", {
      items: s.items.filter((i) => i.id !== id),
    })
  }
  return (
    <div className="space-y-3">
      <Field label="Title">
        <Input
          value={s.title ?? ""}
          onChange={(e) =>
            patchSection(onChange, "faq", { title: e.target.value })
          }
        />
      </Field>
      <ul className="space-y-3">
        {s.items.map((item) => (
          <li
            key={item.id}
            className="space-y-2 rounded-md border border-border p-3"
          >
            <Input
              placeholder="Question"
              value={item.question}
              onChange={(e) => update(item.id, { question: e.target.value })}
            />
            <Textarea
              rows={3}
              placeholder="Answer"
              value={item.answer}
              onChange={(e) => update(item.id, { answer: e.target.value })}
            />
            <Button variant="ghost" size="sm" onClick={() => remove(item.id)}>
              <Trash2 className="mr-1 size-3" /> Remove
            </Button>
          </li>
        ))}
      </ul>
      <Button variant="outline" size="sm" onClick={add}>
        <Plus className="mr-1 size-3" /> Add FAQ
      </Button>
    </div>
  )
}

function SimpleEditor({
  kind,
  config,
  onChange,
}: EditorProps & { kind: "blog" | "niche" }) {
  const s = config.sections[kind]
  return (
    <div className="space-y-3">
      <Field label="Title">
        <Input
          value={s.title ?? ""}
          onChange={(e) => patchSection(onChange, kind, { title: e.target.value })}
        />
      </Field>
      <Field label="Body">
        <Textarea
          rows={6}
          value={s.body ?? ""}
          onChange={(e) => patchSection(onChange, kind, { body: e.target.value })}
          maxLength={4000}
        />
      </Field>
      {kind === "blog" && (
        <p className="text-xs text-muted-foreground">
          Visual placeholder for now — a real blog ships in a later session.
        </p>
      )}
    </div>
  )
}

function Field({
  label,
  children,
  inline,
}: {
  label: string
  children: React.ReactNode
  inline?: boolean
}) {
  return (
    <div className={inline ? "flex items-center gap-2" : "space-y-1.5"}>
      <Label className={inline ? "whitespace-nowrap" : undefined}>{label}</Label>
      {children}
    </div>
  )
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2, 12)
}
