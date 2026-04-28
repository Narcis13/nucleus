import { task } from "@trigger.dev/sdk"

import { processCampaignSend } from "@/lib/services/marketing/process-campaign-send"

// ─────────────────────────────────────────────────────────────────────────────
// Trigger.dev v4 — email campaign sender.
//
// Enqueued by `sendCampaign` in `lib/services/marketing/send-campaign.ts`
// after queued recipient rows are inserted. The task drains those rows via
// the shared `processCampaignSend` service (Resend send + per-row update),
// then finalizes the campaign.
//
// Idempotent: only rows still `status='queued'` are processed, so a retry
// resumes where the previous attempt stopped.
// ─────────────────────────────────────────────────────────────────────────────
export const sendCampaignTask = task({
  id: "marketing.send-campaign",
  retry: { maxAttempts: 3 },
  maxDuration: 900,
  run: async (payload: { campaignId: string }) => {
    return processCampaignSend(payload.campaignId)
  },
})
