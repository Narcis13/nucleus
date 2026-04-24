module Leads
  class MarkLost < ApplicationService
    # Moves the lead onto the first "lost" stage in the org and logs an
    # activity (with optional reason). Refuses cleanly if no lost stage is
    # configured — the UI should hide the button in that case, this is the
    # belt-and-braces check.

    def initialize(lead:, reason: nil, actor: nil)
      @lead = lead
      @reason = reason.to_s.strip.presence
      @actor = actor
    end

    def call
      lost_stage = LeadStage.where(organization_id: @lead.organization_id, is_lost: true).ordered.first
      return failure(:conflict, message: "No 'lost' stage configured. Create one first.") if lost_stage.nil?

      Lead.transaction do
        @lead.update!(stage: lost_stage)
        @lead.activities.create!(
          activity_type: "lost",
          description: @reason ? "Marked lost: #{@reason}" : "Marked lost",
          metadata: @reason ? { reason: @reason } : nil
        )
      end
      success(lead: @lead)
    end
  end
end
