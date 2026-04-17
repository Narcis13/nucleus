import type { Metadata } from "next"

import { env } from "@/lib/env"

export const metadata: Metadata = {
  title: "Privacy policy template",
  description:
    "A starting-point privacy policy you can adapt for your practice. Not legal advice.",
}

// A boilerplate template professionals can copy, adapt, and publish on their
// own site. Deliberately generic — lawyers and/or a local DPO should review
// before it goes live.
export default function PrivacyPolicyTemplatePage() {
  const app = env.NEXT_PUBLIC_APP_NAME
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <header className="mb-8 space-y-2">
        <h1 className="font-heading text-3xl font-semibold">
          Privacy policy — template
        </h1>
        <p className="text-sm text-muted-foreground">
          Copy the markdown below, replace the bracketed placeholders with your
          own details, and host it on your own domain. This template is a
          starting point — have a lawyer review it before publishing.
        </p>
      </header>

      <article className="prose prose-sm max-w-none whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-6 font-mono text-xs leading-relaxed text-foreground">{`# Privacy policy

Effective date: [YYYY-MM-DD]

This policy describes how [Your business name] ("we", "our", or "us")
collects, uses, and protects your personal data when you use our services.

## 1. Data controller

[Your business legal name]
[Your address]
Contact: [Your email]
Data protection officer (DPO): [DPO email, if any]

## 2. What we collect

- Contact details (name, email, phone) you provide when booking or signing up.
- Appointment history, notes, and documents you share with us.
- Payment records processed through our billing partner (Stripe).
- Technical information (IP, browser) for security and analytics.

## 3. Why we collect it

- To deliver the services you request.
- To communicate with you about appointments, payments, and follow-ups.
- To comply with our legal and regulatory obligations.
- To improve our services (with your consent).

## 4. Legal basis (GDPR Art. 6)

- Contract: processing necessary to provide our services to you.
- Legal obligation: tax records, regulatory requirements.
- Consent: marketing emails, analytics tracking.
- Legitimate interest: service improvements, fraud prevention.

## 5. Sharing

We share your data only with:
- Our operating platform (${app}) under a data processing agreement.
- Payment processor (Stripe) for billing.
- Email delivery provider (Resend) for transactional messages.
- Authorities when legally required.

## 6. Retention

We keep your personal data for as long as necessary to deliver services and
meet legal obligations. You may request deletion at any time — see "Your
rights" below.

## 7. Your rights

Under GDPR you have the right to:
- Access the personal data we hold about you.
- Correct inaccurate data.
- Request deletion ("right to be forgotten").
- Export your data in a portable format.
- Object to processing based on legitimate interest.
- Withdraw consent you previously gave.

To exercise any of these rights, contact us at [Your email]. We respond within
30 days.

## 8. Cookies

Our site uses strictly necessary cookies for authentication and, with your
consent, analytics cookies to understand how visitors use the site. You can
withdraw consent at any time through the cookie banner.

## 9. Security

We take reasonable technical and organisational measures to protect your data,
including encryption in transit, access controls, and regular audits.

## 10. Changes to this policy

We'll post updates here and, where required, notify you directly.

## 11. Complaints

If you believe we've mishandled your data, you have the right to complain to
your local supervisory authority.
`}</article>
    </div>
  )
}
