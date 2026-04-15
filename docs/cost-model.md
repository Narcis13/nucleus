# Nucleus — Cost Model & Free Tier Playbook

**Last verified:** 2026-04-15 (partial — see "Verify before committing" section)
**Audience:** Solo / small-team operators deploying Nucleus-based SaaS.

This doc answers one question: **what does it cost to run a Nucleus-based CRM from day zero to ~50 paying customers, and when does each dependency force you off the free tier?**

---

## TL;DR

- **Floor cost: ~$20/mo.** Vercel Pro is the one mandatory spend — Vercel Hobby's ToS forbids commercial use, so a paid SaaS must be on Pro from day one (or self-host).
- **Everything else has a genuinely usable free tier.** You can validate the product and onboard early customers without paying Supabase, Clerk, Stripe, Resend, Trigger.dev, PostHog, Sentry, or Upstash.
- **Realistic cost at ~50 paying customers: $90–140/mo.** Mostly driven by Supabase Pro + Clerk Pro + Resend Pro kicking in together around that scale.

---

## Free tier matrix

| Service | Free tier includes | First limit you'll hit | Commercial use on free? | Upgrade price |
|---|---|---|---|---|
| **Supabase** | 500 MB Postgres, 1 GB file storage, 5 GB egress, 50K MAU auth, unlimited API requests, Realtime, Edge Functions, 2 projects | **7-day inactivity pause** (demo dies if unused); 500 MB DB | ✅ Yes | **Pro $25/mo** — 8 GB DB, no pause, 100K MAU, 250 GB egress |
| **Clerk** | 10K MAU, basic orgs, social login, webhooks | 10K MAU; **custom domain excluded** on free | ✅ Yes | **Pro $25/mo** + $0.02 per MAU over 10K |
| **Stripe** | No monthly fee | N/A (pay per transaction) | ✅ Yes | 2.9% + $0.30 (US cards); ~1.5% + €0.25 (EU cards); +1.5% intl |
| **Resend** | 3,000 emails/mo, **100/day cap**, 1 verified domain, 40 MB attachments\* | **100/day** during onboarding bursts or launch announcements | ✅ Yes | **Pro $20/mo** — 50K emails/mo, unlimited domains |
| **Trigger.dev v4** | ~500 runs/mo\*, ~5 concurrent runs, long-duration supported | Runs/mo — burns fast with cron + webhook workflows | ✅ Yes | **Hobby $20/mo** (~10K runs) / **Pro $50/mo** |
| **PostHog** | 1M events/mo, 5K session replays/mo, 1M feature-flag requests/mo, 100K survey responses, unlimited team | Session replays (5K) blow up with any real traffic | ✅ Yes | Pay-as-you-go past free; typical solo SaaS $0–50/mo |
| **Vercel Hobby** | 100 GB bandwidth, 100 GB-hrs functions, 6K build min | **ToS blocks commercial use entirely** | ❌ **NO** | **Pro $20/mo/seat** — commercial-use allowed; metered overages |
| **Sentry** | 5K errors, 10K performance spans, 50 session replays, **1 seat** | 1-seat cap (fine solo; breaks on cofounder) | ✅ Yes | **Team $26/mo** — 50K errors, more seats |
| **Upstash Redis** | 500K commands/day, 256 MB storage, 1K max connections, 50 GB bandwidth/mo | 500K cmds/day if using for ratelimit + cache + queue concurrently | ✅ Yes | Pay-as-you-go ~$0.20 per 100K cmds; typical $0–10/mo |
| **Neon** *(alt to Supabase)* | 0.5 GB storage, autosuspend after 5 min idle, 190 compute hrs/mo, branching | Compute hours / cold starts | ✅ Yes | **Launch $19/mo** |

\* Items I'm least confident are current as of April 2026 — verify on vendor pricing pages before committing:
- Trigger.dev v4 run count + concurrency on free (was being recalibrated during v3→v4 migration window)
- Clerk's exact webhook / org limits on free
- Resend attachment size cap on free

---

## Cost at each growth stage

### Stage 0 — Validating (pre-first-customer)
| Service | Plan | Monthly |
|---|---|---|
| Vercel | Pro (1 seat) | **$20** |
| Everything else | Free | $0 |
| **Total** | | **$20/mo** |

Vercel Pro is the only mandatory spend. Self-hosting on Railway/Fly/Cloudflare drops this to $0 at the cost of some DX.

### Stage 1 — First 10 paying customers
Same as Stage 0. All free tiers have headroom.
| | |
|---|---|
| **Total** | **$20/mo** |

### Stage 2 — ~50 paying customers (~10K MAU total including their clients)
| Service | Why upgrade | Plan | Monthly |
|---|---|---|---|
| Vercel | Mandatory | Pro | $20 |
| Supabase | Kill the 7-day pause risk + DB headroom | Pro | $25 |
| Clerk | 10K MAU threshold | Pro | $25 |
| Resend | 100/day cap hits during daily reminder blasts | Pro | $20 |
| Sentry | Only if you've added a teammate | Team | $26 *(optional)* |
| Trigger.dev | Only if automation/cron workload exceeds 500 runs/mo | Hobby | $20 *(optional)* |
| Stripe / PostHog / Upstash | Still effectively free | Free | <$10 combined |
| **Floor total** | | | **$90/mo** |
| **Realistic total** | incl. Sentry + Trigger | | **$136/mo** |

### Stage 3 — ~200+ paying customers
Past this, monitor:
- **Supabase egress** (250 GB included on Pro) — CRM with Realtime + file storage grows fast
- **Clerk MAU overages** at $0.02/MAU — 40K MAU = $600/mo add-on
- **Resend** scales to Scale tier ($90/mo, 100K emails) if you run email campaigns
- **PostHog** event ingestion — product analytics of clients-of-customers multiplies fast

Expect **$250–500/mo** at 200 customers. Revenue at €29/user × 200 = €5,800/mo, so infra stays <10% of revenue — the unit economics work.

---

## Gotchas by service

### Vercel Hobby's commercial-use ban
The biggest trap. Hobby ToS explicitly restricts "personal, non-commercial" use. A paying SaaS on Hobby is a ToS violation — if flagged, they suspend without warning. **Budget $20/mo from day one, or move off.**

**Alternatives for $0 hosting with commercial use allowed:**
- **Cloudflare Pages + Workers** — free tier allows commercial; Next.js 16 works via `@opennextjs/cloudflare`
- **Railway** — $5/mo starter, commercial allowed, simple Docker-based Next.js
- **Fly.io** — free allowances with commercial use allowed

### Supabase 7-day inactivity pause
Free projects auto-suspend if the DB sees no activity for 7 days. Unpausing takes a few minutes. Fine for dev; dangerous for public demos or marketing sites that nobody hits for a week. Move to Pro once you have a live URL people might visit.

### Resend's sneaky daily cap
The monthly 3K number looks generous, but the **100/day** cap is the real squeeze. A launch-day announcement to 100 beta users hits it instantly. Batch transactional sends and stagger marketing emails until you hit Pro.

### Clerk custom domain lives behind the paywall
Free tier forces users to sign in via a `*.accounts.<yourdomain>` or `*.clerk.accounts.dev` subdomain. Some users find the non-matching domain off-putting — can hurt conversion on high-trust verticals (legal, finance). Upgrade if that applies to your niche.

### Sentry 1-seat limit
Fine as a solo dev. The moment you add a cofounder or VA with bug-triage access, Team plan becomes mandatory. Don't share the account — seat enforcement is real.

### Trigger.dev v4 free tier migration
v3 deploys shut off **2026-04-01**. If you scaffold using v3 tutorials (still cached across the web), jobs won't deploy. v4 free tier limits were being recalibrated through Q1 2026 — verify current numbers at [trigger.dev/pricing](https://trigger.dev/pricing).

---

## Month-by-month burn forecast (first year)

Assumes: solo founder, Vercel Pro from day one, upgrades kicking in as traffic justifies.

| Month | Milestone | Monthly spend |
|---|---|---|
| 1–3 | Building, 0 customers | $20 (Vercel only) |
| 4–6 | First 10 customers | $20 |
| 7–9 | 10–30 customers, first email blasts | $20 → $40 (+Resend Pro) |
| 10–12 | ~50 customers, crossing Supabase/Clerk free thresholds | $90–140 |
| **Year 1 total** | | **~$700–1,200** |

Compare against €29/user × 50 × 12 = **~€17,400 ARR at end of year one**. Infra is 4–7% of revenue. Healthy.

---

## Verify before committing

Before locking in exact vendor configs or env setup, spot-check these three sources whose free tiers I'm least confident about:

1. **Trigger.dev v4 pricing** — [trigger.dev/pricing](https://trigger.dev/pricing)
2. **Clerk free tier detail** — [clerk.com/pricing](https://clerk.com/pricing) (look for webhook caps, org feature restrictions)
3. **Resend attachment size** — [resend.com/pricing](https://resend.com/pricing)

Also re-verify Vercel's ToS language on Hobby commercial use — it has been updated multiple times since 2023. Look for the exact phrase "personal, non-commercial" or equivalent under "Acceptable Use."

---

## Decision record

**Why Vercel Pro over self-hosting:** DX velocity for a solo founder outweighs $20/mo. ISR, image optimization, edge middleware, and one-click preview deploys are real productivity wins. Revisit only if Vercel egress or function invocation costs spike at scale (unlikely below 1000 customers).

**Why Supabase over Neon+standalone auth:** Bundled RLS + Realtime + Storage + Auth removes 3–4 integration seams. Neon is cheaper at small scale but requires gluing Clerk + S3 + Ably or similar for Realtime — the saved dollars aren't worth the coupling.

**Why both Sentry and PostHog:** They're complementary, not duplicative. Sentry = error-rate + stack traces + perf tracing; PostHog = product usage + funnels + flags + replays for UX. Each one replaces 2–3 tools that would otherwise be on the bill.

**Why Upstash over self-hosted Redis:** Serverless-native (per-request billing) means $0 during development and <$5/mo in production for the ratelimit-only workload this project uses it for. Not worth running a Redis container.
