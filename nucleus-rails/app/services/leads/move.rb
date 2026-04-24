module Leads
  class Move < ApplicationService
    # Moves a lead to a new stage. Appends a `stage_changed` LeadActivity so
    # the timeline reflects the change without a separate audit table.
    # No-op when the target stage matches the current one (lets the drag UI
    # fire optimistically without this writing a spurious activity row).
    #
    # Broadcasting to other open tabs happens via an after_commit hook — see
    # the LeadsController turbo_stream response + Turbo::StreamsChannel.

    def initialize(lead:, stage_id:, actor: nil)
      @lead = lead
      @stage_id = stage_id.to_s.presence
      @actor = actor
    end

    def call
      return failure(:invalid, message: "stage_id required") if @stage_id.nil?

      target = LeadStage.where(organization_id: @lead.organization_id).find_by(id: @stage_id)
      return failure(:not_found, message: "Stage not found") if target.nil?
      return success(lead: @lead, unchanged: true) if target.id == @lead.stage_id

      from_stage = @lead.stage
      Lead.transaction do
        @lead.update!(stage: target)
        @lead.activities.create!(
          activity_type: "stage_changed",
          description: "Stage changed: #{from_stage&.name || "—"} → #{target.name}",
          metadata: { from: from_stage&.id, to: target.id }
        )
      end

      success(lead: @lead, from_stage: from_stage, to_stage: target)
    end
  end
end
