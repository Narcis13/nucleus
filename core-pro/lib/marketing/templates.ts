// ─────────────────────────────────────────────────────────────────────────────
// Campaign template library.
//
// Each template ships with a suggested subject line plus an MJML-derived HTML
// body. Merge tags ({{client_name}}, {{professional_name}}) are left as-is —
// they're substituted per-recipient inside `sendCampaignAction`.
//
// The HTML is email-safe (table-based, inline styles, no CSS variables, no
// external fonts) so it renders consistently across Gmail / Outlook / Apple
// Mail without a build step. When we add an MJML toolchain later this file is
// the single swap point.
// ─────────────────────────────────────────────────────────────────────────────

export type CampaignTemplateKey =
  | "welcome"
  | "welcome_sequence_day1"
  | "welcome_sequence_day3"
  | "welcome_sequence_day7"
  | "newsletter"
  | "re_engagement"
  | "promotion"
  | "custom"

export type CampaignTemplate = {
  key: CampaignTemplateKey
  name: string
  description: string
  subject: string
  body: string
}

const primary = "#6366f1"
const accent = "#f59e0b"

function baseWrap(inner: string): string {
  // Minimal, email-safe shell. Single centered 600px table with system-font
  // stack and generous padding so it reads well on both desktop and mobile.
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>{{professional_name}}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f5f5f7;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,.08);">
            <tr>
              <td style="padding:24px 32px;border-bottom:1px solid #eceef2;">
                <p style="margin:0;font-size:14px;color:${primary};letter-spacing:.04em;text-transform:uppercase;font-weight:600;">
                  {{professional_name}}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#111827;line-height:1.55;font-size:16px;">
                ${inner}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #eceef2;background-color:#fafafc;color:#6b7280;font-size:12px;">
                <p style="margin:0 0 4px 0;">Sent by {{professional_name}}</p>
                <p style="margin:0;">You're receiving this because we work together. Reply to this email anytime.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function button(label: string, href: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
    <tr>
      <td style="background-color:${primary};border-radius:8px;">
        <a href="${href}" style="display:inline-block;padding:12px 22px;font-weight:600;color:#ffffff;text-decoration:none;font-size:15px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`
}

export const CAMPAIGN_TEMPLATES: Record<
  CampaignTemplateKey,
  CampaignTemplate
> = {
  welcome: {
    key: "welcome",
    name: "Welcome",
    description: "Onboarding email sent when a new client is added.",
    subject: "Welcome, {{client_name}} — glad to have you",
    body: baseWrap(`
      <h1 style="margin:0 0 16px 0;font-size:24px;line-height:1.2;color:#0f172a;">
        Welcome aboard, {{client_name}}.
      </h1>
      <p style="margin:0 0 12px 0;">
        I'm really glad we're working together. Over the next few weeks I'll share a few short notes so you know what to expect and how to get the most out of our work.
      </p>
      <p style="margin:0 0 12px 0;">
        If anything is unclear — or if a question pops into your head between sessions — just hit reply. I read every message.
      </p>
      ${button("Open your portal", "{{portal_url}}")}
      <p style="margin:24px 0 0 0;color:#475569;">— {{professional_name}}</p>
    `),
  },

  welcome_sequence_day1: {
    key: "welcome_sequence_day1",
    name: "Welcome · Day 1",
    description: "First email in a three-part welcome series.",
    subject: "Welcome, {{client_name}} — here's what's next",
    body: baseWrap(`
      <h1 style="margin:0 0 16px 0;font-size:24px;line-height:1.2;color:#0f172a;">
        We're just getting started.
      </h1>
      <p style="margin:0 0 12px 0;">
        Thanks for joining, {{client_name}}. Today's note is short: the portal link below is where your schedule, documents, and messages live. Save it somewhere you'll find it.
      </p>
      ${button("Open your portal", "{{portal_url}}")}
      <p style="margin:0 0 12px 0;">
        Tomorrow I'll share how I usually structure the first few weeks — no action needed from you today.
      </p>
      <p style="margin:24px 0 0 0;color:#475569;">— {{professional_name}}</p>
    `),
  },

  welcome_sequence_day3: {
    key: "welcome_sequence_day3",
    name: "Welcome · Day 3",
    description: "Second email — sets expectations.",
    subject: "{{client_name}}, a quick roadmap of our first few weeks",
    body: baseWrap(`
      <h2 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;color:#0f172a;">
        Here's what the first month usually looks like.
      </h2>
      <p style="margin:0 0 12px 0;"><strong>Week 1 · Baseline.</strong> We align on goals and I set up any baseline checks or forms.</p>
      <p style="margin:0 0 12px 0;"><strong>Weeks 2–3 · Build.</strong> You put the plan into practice; I'm on call for questions.</p>
      <p style="margin:0 0 12px 0;"><strong>Week 4 · Review.</strong> We look at what's working, what's not, and adjust.</p>
      <p style="margin:0 0 12px 0;">
        If this sequence doesn't match how you'd prefer to work, tell me — we'll reshape it.
      </p>
      <p style="margin:24px 0 0 0;color:#475569;">— {{professional_name}}</p>
    `),
  },

  welcome_sequence_day7: {
    key: "welcome_sequence_day7",
    name: "Welcome · Day 7",
    description: "Third email — gentle check-in.",
    subject: "How's week one going, {{client_name}}?",
    body: baseWrap(`
      <h2 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;color:#0f172a;">
        Checking in.
      </h2>
      <p style="margin:0 0 12px 0;">
        You've had about a week with the plan now. Two quick questions I'd love your answer to:
      </p>
      <ol style="margin:0 0 16px 20px;padding:0;color:#111827;">
        <li style="margin:0 0 8px 0;">What's been easier than you expected?</li>
        <li>What's been harder?</li>
      </ol>
      <p style="margin:0 0 12px 0;">
        One-liners are perfect. I'll use your answers to fine-tune what we do next.
      </p>
      ${button("Reply in your portal", "{{portal_url}}")}
      <p style="margin:24px 0 0 0;color:#475569;">— {{professional_name}}</p>
    `),
  },

  newsletter: {
    key: "newsletter",
    name: "Newsletter",
    description: "Monthly news / tips round-up.",
    subject: "{{professional_name}} monthly — news, tips, and updates",
    body: baseWrap(`
      <h2 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;color:#0f172a;">
        What's new this month
      </h2>
      <p style="margin:0 0 12px 0;">
        Hi {{client_name}}, here's a short round-up of what I've been working on and a couple of ideas you might find useful.
      </p>
      <h3 style="margin:24px 0 8px 0;font-size:16px;color:${primary};">One thing to try</h3>
      <p style="margin:0 0 12px 0;">
        [Replace with a single concrete action your readers can take this week.]
      </p>
      <h3 style="margin:24px 0 8px 0;font-size:16px;color:${primary};">Behind the scenes</h3>
      <p style="margin:0 0 12px 0;">
        [Share a quick update about your practice, a new service, or a testimonial.]
      </p>
      <p style="margin:24px 0 0 0;color:#475569;">— {{professional_name}}</p>
    `),
  },

  re_engagement: {
    key: "re_engagement",
    name: "Re-engagement",
    description: "Reach out to clients who've gone quiet.",
    subject: "Checking in, {{client_name}}",
    body: baseWrap(`
      <h2 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;color:#0f172a;">
        I don't want to lose touch.
      </h2>
      <p style="margin:0 0 12px 0;">
        It's been a little while since we've been in contact. No pressure — life gets busy. I wanted to say I'm still here if you want to pick things back up.
      </p>
      <p style="margin:0 0 12px 0;">
        If you'd like, reply with one word: <em>yes</em> and I'll send a couple of times to re-book.
      </p>
      ${button("Pick a new time", "{{booking_url}}")}
      <p style="margin:24px 0 0 0;color:#475569;">— {{professional_name}}</p>
    `),
  },

  promotion: {
    key: "promotion",
    name: "Promotion",
    description: "Announce a new offer or service.",
    subject: "A new offer from {{professional_name}}",
    body: baseWrap(`
      <div style="background-color:${accent};color:#1a1306;padding:16px 20px;border-radius:10px;margin:0 0 20px 0;font-weight:600;">
        Limited-time offer
      </div>
      <h1 style="margin:0 0 16px 0;font-size:24px;line-height:1.2;color:#0f172a;">
        Something new I think you'll like.
      </h1>
      <p style="margin:0 0 12px 0;">
        Hey {{client_name}} — I'm opening spots for [offer name]. Here's the short version:
      </p>
      <ul style="margin:0 0 16px 20px;padding:0;color:#111827;">
        <li style="margin:0 0 4px 0;">What it is: [one line]</li>
        <li style="margin:0 0 4px 0;">Who it's for: [one line]</li>
        <li>What it costs: [price]</li>
      </ul>
      ${button("Reserve a spot", "{{booking_url}}")}
      <p style="margin:24px 0 0 0;color:#475569;">— {{professional_name}}</p>
    `),
  },

  custom: {
    key: "custom",
    name: "Blank",
    description: "Start from scratch.",
    subject: "A note from {{professional_name}}",
    body: baseWrap(`
      <p style="margin:0 0 12px 0;">Hi {{client_name}},</p>
      <p style="margin:0 0 12px 0;">[Write your message here.]</p>
      <p style="margin:24px 0 0 0;color:#475569;">— {{professional_name}}</p>
    `),
  },
}

export function getCampaignTemplate(
  key: string | null | undefined,
): CampaignTemplate {
  if (!key || !(key in CAMPAIGN_TEMPLATES)) return CAMPAIGN_TEMPLATES.custom
  return CAMPAIGN_TEMPLATES[key as CampaignTemplateKey]
}

// ─────────────────────────────────────────────────────────────────────────────
// Merge-tag substitution
//
// Keeps the list small and predictable. Unknown tags are left untouched so
// they show up in the preview and the pro can fix them before sending.
// ─────────────────────────────────────────────────────────────────────────────
export type MergeTagContext = {
  client_name?: string | null
  professional_name?: string | null
  portal_url?: string | null
  booking_url?: string | null
  site_url?: string | null
}

export function expandMergeTags(
  html: string,
  ctx: MergeTagContext,
): string {
  return html
    .replace(/{{\s*client_name\s*}}/g, ctx.client_name || "there")
    .replace(/{{\s*professional_name\s*}}/g, ctx.professional_name || "")
    .replace(/{{\s*portal_url\s*}}/g, ctx.portal_url || "#")
    .replace(/{{\s*booking_url\s*}}/g, ctx.booking_url || "#")
    .replace(/{{\s*site_url\s*}}/g, ctx.site_url || "#")
}
